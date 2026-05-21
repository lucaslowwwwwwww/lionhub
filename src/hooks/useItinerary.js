import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { useToast } from './useToast'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from './useOrg'

export function useItinerary(troupeId, date) {
  const [itinerary, setItinerary] = useState(null)
  const [stops, setStops] = useState([])
  const [attendance, setAttendance] = useState([])
  const [attendanceDetails, setAttendanceDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()
  const { showToast } = useToast()
  const { orgId } = useOrg()
  
  const itinRef = useRef(null)
  const stopsRef = useRef([])

  // Sync refs with state for use in callbacks (Rule #29 / Stale Closures)
  useEffect(() => { itinRef.current = itinerary }, [itinerary])
  useEffect(() => { stopsRef.current = stops }, [stops])

  // Move fetch functions outside useEffect so they are accessible for the 'refresh' method
  const fetchStops = useCallback(async (itinId) => {
    try {
      const { data, error } = await supabase
        .from('stops')
        .select(TABLES.STOPS)
        .eq('org_id', orgId)
        .eq('itinerary_id', itinId)
        .order('order', { ascending: true })

      if (error) {
        console.error('fetchStops failed:', error.message)
      } else {
        setStops(data || [])
      }
    } catch (err) { 
      console.error('fetchStops exception:', err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchItinerary = useCallback(async () => {
    if (!troupeId || !date || !orgId) return

    setLoading(true)
    setTimeoutError(false)
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select(TABLES.ITINERARIES)
        .eq('org_id', orgId)
        .eq('troupeid', troupeId)
        .eq('date', date)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('fetchItinerary failed:', error.message)
        setLoading(false)
        return
      }

      if (data) {
        setItinerary(data)
        itinRef.current = data // Update ref immediately for subscription logic
        setAttendance(data.attendance || [])
        setAttendanceDetails(data.attendancedetails || {})
        await fetchStops(data.id)
      } else {
        setItinerary(null)
        itinRef.current = null
        setStops([])
        setAttendance([])
        setAttendanceDetails({})
        setLoading(false)
      }
    } catch (err) {
      console.error('fetchItinerary exception:', err.message)
      setLoading(false)
    } finally {
      clearTimeout(timeoutId)
    }
  }, [troupeId, date, fetchStops, orgId])

  useEffect(() => {
    // Reset state immediately when parameters change to avoid showing stale data
    setLoading(true)
    setStops([])
    setItinerary(null)
    setAttendance([])
    setAttendanceDetails({})

    if (!troupeId || !date || !orgId) {
      setLoading(false)
      return
    }

    let itinChannel = null
    let stopsChannel = null

    // 3. Subscribe to stops changes
    const subscribeToStops = (itinId) => {
      if (!itinId) return
      if (stopsChannel) supabase.removeChannel(stopsChannel)
      const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      stopsChannel = supabase
        .channel(`stops-${orgId}-${itinId}-${safeId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stops', filter: `org_id=eq.${orgId}` }, 
        (payload) => {
          if (payload.eventType === 'DELETE') {
             // For DELETE, we don't need to check itinerary_id. If it's in our local array, just remove it!
             setStops(prev => prev.filter(s => s.id !== payload.old.id))
             return
          }

          const row = payload.new
          // Ensure INSERT/UPDATE changes belong only to the specific itinerary window we're viewing
          if (row?.itinerary_id !== itinId) return

          if (payload.eventType === 'INSERT') {
            setStops(prev => {
              if (prev.some(s => s.id === payload.new.id)) return prev
              return [...prev, payload.new].sort((a, b) => (a.order || 0) - (b.order || 0))
            })
          } else if (payload.eventType === 'UPDATE') {
            setStops(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
          }
        })
        .subscribe()
    }

    fetchItinerary().then(() => {
      if (itinRef.current?.id) subscribeToStops(itinRef.current.id)
    })

    // 4. Subscribe to itinerary changes
    const itinSafeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    itinChannel = supabase
      .channel(`itin-${orgId}-${troupeId}-${date}-${itinSafeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries', filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.troupeid !== troupeId || row?.date !== date) return

          if (payload.eventType === 'INSERT') {
            setItinerary(payload.new)
            setAttendance(payload.new.attendance || [])
            setAttendanceDetails(payload.new.attendancedetails || {})
            // Dynamically establish stops listener now that the itinerary is created by another user
            subscribeToStops(payload.new.id)
          } else if (payload.eventType === 'UPDATE') {
            setItinerary(payload.new)
            setAttendance(payload.new.attendance || [])
            setAttendanceDetails(payload.new.attendancedetails || {})
          } else if (payload.eventType === 'DELETE') {
            setItinerary(null)
            setStops([])
          }
        }
      )
      .subscribe()

    return () => {
      if (itinChannel) supabase.removeChannel(itinChannel)
      if (stopsChannel) supabase.removeChannel(stopsChannel)
    }
  }, [troupeId, date, orgId, fetchItinerary])

  // ──────────────────────────────────────────────────────────
  // ATOMIC RPC: updateStopStatus
  // Uses server-side functions for consistency under concurrency
  // ──────────────────────────────────────────────────────────
  const updateStopStatus = async (stopId, newStatus, extraData = {}) => {
    const currentItin = itinRef.current
    if (!currentItin) return

    try {
      if (newStatus === 'completed') {
        const { error } = await supabase.rpc('complete_stop', {
          p_stop_id: stopId,
          p_actual_amount: Number(extraData.actualamount) || 0,
          p_payment_method: extraData.paymentmethod || 'Cash'
        })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('update_stop_status', {
          p_stop_id: stopId,
          p_new_status: newStatus
        })
        if (error) throw error
      }

      // Refresh from DB to get accurate counters (realtime will also update)
      await fetchItinerary()
    } catch (err) {
      console.error('updateStopStatus failed:', err.message)
      showToast('Failed to update stop status', 'error')
      throw err
    }
  }

  // Update an existing stop's data (non-status fields like address, time, etc.)
  const updateStop = async (stopId, updatedData) => {
    if (!itinerary) return
    try {
      const { error } = await supabase
        .from('stops')
        .update({
          ...sanitizeObject(updatedData),
          updatedat: new Date().toISOString()
        })
        .eq('id', stopId)

      if (error) throw error
    } catch (err) {
      console.error('updateStop failed:', err.message)
      throw err
    }
  }

  // Create a new itinerary document
  const createItinerary = async (itinData) => {
    try {
      const docId = `${date}_${troupeId}`
      const { error } = await supabase
        .from('itineraries')
        .upsert({
          id: docId,
          troupeid: troupeId,
          troupename: itinData.troupename || itinData.troupeName || 'Unknown',
          date,
          status: 'published',
          attendance: [],
          attendancedetails: {},
          totalstops: 0,
          completedstops: 0,
          skippedstops: 0,
          totalrevenue: 0,
          org_id: orgId || itinData.org_id || null,
          createdat: new Date().toISOString(),
          ...sanitizeObject(itinData)
        })

      if (error) throw error
      return docId
    } catch (err) {
      console.error('createItinerary failed:', err.message)
      throw err
    }
  }

  // ──────────────────────────────────────────────────────────
  // ATOMIC RPC: addStop
  // ──────────────────────────────────────────────────────────
  const addStop = async (stopData, userId, providedItinId = null) => {
    const activeItinId = itinerary?.id || providedItinId
    if (!activeItinId) {
      console.error('Cannot add stop without an active itinerary.')
      return
    }

    try {
      const { data, error } = await supabase.rpc('add_stop', {
        p_itinerary_id: activeItinId,
        p_stop_data: {
          ...sanitizeObject(stopData),
          createdby: userId
        }
      })

      if (error) throw error

      // Refresh to get the new stop from DB (realtime will also sync)
      await fetchItinerary()

      showToast('Stop added successfully', 'success')
      logAction('ADD_STOP', { stopId: data?.stop_id, itinId: activeItinId })
    } catch (err) {
      console.error('addStop failed:', err.message)
      showToast('Failed to add stop', 'error')
      throw err
    }
  }

  // ──────────────────────────────────────────────────────────
  // ATOMIC RPC: deleteStop
  // ──────────────────────────────────────────────────────────
  const deleteStop = async (stopId) => {
    if (!itinerary) return

    // Optimistic removal
    const prevStops = stopsRef.current
    const prevItin = itinRef.current
    setStops(prev => prev.filter(s => s.id !== stopId))

    try {
      const { error } = await supabase.rpc('delete_stop', { p_stop_id: stopId })
      if (error) throw error

      // Refresh for accurate counters
      await fetchItinerary()
      logAction('DELETE_STOP', { stopId, itinId: itinerary.id })
    } catch (err) {
      console.error('deleteStop failed:', err.message)
      // Rollback optimistic update
      setStops(prevStops)
      setItinerary(prevItin)
      showToast('Failed to delete stop', 'error')
      throw err
    }
  }

  // Update stop sequential order
  const reorderStops = async (newStops) => {
    if (!itinerary) return

    // Optimistic local update
    const prevStops = stopsRef.current
    try {
      const now = new Date().toISOString()
      
      setStops(prev => {
        const movedIds = new Set(newStops.map(s => s.id))
        const remaining = prev.filter(s => !movedIds.has(s.id))
        return [...newStops, ...remaining].sort((a, b) => {
          const aIdx = newStops.findIndex(s => s.id === a.id)
          const bIdx = newStops.findIndex(s => s.id === b.id)
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
          return (a.order || 0) - (b.order || 0)
        })
      })

      // Bulk Update to Database
      const updates = newStops.map((stop, index) => ({
        id: stop.id,
        itinerary_id: itinerary.id,
        org_id: stop.org_id || orgId,
        order: index,
        updatedat: now
      }))

      const { error } = await supabase
        .from('stops')
        .upsert(updates, { onConflict: 'id' })

      if (error) throw error
    } catch (err) {
      console.error('reorderStops failed:', err.message)
      // Rollback optimistic update on failure
      setStops(prevStops)
      showToast('Failed to reorder stops', 'error')
      throw err
    }
  }

  // Update the list of members joining for this performance day
  const updateAttendance = async (memberIds, details = {}, providedItinId = null) => {
    const activeItinId = providedItinId || itinerary?.id
    if (!activeItinId) {
      showToast('Cannot update attendance without an active itinerary.', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('itineraries')
        .update({
          attendance: memberIds,
          attendancedetails: details,
          updatedat: new Date().toISOString()
        })
        .eq('id', activeItinId)

      if (error) throw error
    } catch (err) {
      console.error('updateAttendance failed:', err.message)
      throw err
    }
  }

  // ──────────────────────────────────────────────────────────
  // ATOMIC RPC: deleteFullItinerary
  // ──────────────────────────────────────────────────────────
  const deleteFullItinerary = async () => {
    if (!itinerary) return
    try {
      const { error } = await supabase.rpc('delete_full_itinerary', {
        p_itinerary_id: itinerary.id
      })
      if (error) throw error

      logAction('DELETE_FULL_ITINERARY', { itinId: itinerary.id, date: itinerary.date, troupeName: itinerary.troupename })
    } catch (err) {
      console.error('deleteFullItinerary failed:', err.message)
      showToast('Failed to delete itinerary', 'error')
      throw err
    }
  }

  // ──────────────────────────────────────────────────────────
  // ATOMIC RPC: transferStop
  // ──────────────────────────────────────────────────────────
  const transferStop = async (stopId, targetTroupeId, targetTroupeName) => {
    try {
      if (!date || !orgId) throw new Error('Missing date or organization context')

      const { error } = await supabase.rpc('transfer_stop', {
        p_stop_id: stopId,
        p_target_troupe_id: targetTroupeId,
        p_target_troupe_name: targetTroupeName || 'Unknown',
        p_date: date
      })

      if (error) throw error

      // Refresh to update local state
      await fetchItinerary()

      showToast('Stop transferred successfully', 'success')
      logAction('TRANSFER_STOP', { stopId, fromItinId: itinerary?.id })
    } catch (err) {
      console.error('transferStop failed:', err.message)
      showToast('Failed to transfer stop', 'error')
      throw err
    }
  }

  return { itinerary, stops, attendance, attendanceDetails, loading, timeoutError, updateStopStatus, updateStop, addStop, createItinerary, deleteStop, reorderStops, updateAttendance, deleteFullItinerary, transferStop, refresh: fetchItinerary }
}

export function useAllPerformanceDates() {
  const { orgId } = useOrg()
  const CACHE_KEY = `liondance_cache_perf_dates_${orgId || 'none'}`
  const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes
  const [allItineraries, setAllItineraries] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY) return data
      }
    } catch (e) { console.warn('Performance dates cache read failed:', e) }
    return []
  })
  const [loading, setLoading] = useState(!allItineraries.length)
  const [error, setError] = useState(null)


  const fetchItineraries = useCallback(async () => {
    if (!orgId) return;

    const { data, error: fetchError } = await supabase
      .from('itineraries')
      .select(TABLES.ITINERARIES_LIGHT)
      .eq('org_id', orgId)

    if (fetchError) {
      console.error('fetchItineraries failed:', fetchError.message)
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setAllItineraries(data || [])
    setLoading(false)

    // Update Cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
    } catch (e) { console.warn('Performance dates cache write failed:', e) }
  }, [CACHE_KEY, orgId])

  useEffect(() => {
    if (!orgId) return

    setTimeout(() => {
      fetchItineraries()
    }, 0)

    // Subscribe to realtime changes on itineraries
    const allItinSafeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`all-itin-${orgId}-${allItinSafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllItineraries(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setAllItineraries(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
          } else if (payload.eventType === 'DELETE') {
            setAllItineraries(prev => prev.filter(i => i.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItineraries, orgId])

  const { dates, dateStopCounts, unfinishedDates, dateTroupes } = useMemo(() => {
    const counts = {}
    const unfinishedSet = new Set()
    const troupesMap = {}

    allItineraries.forEach(itin => {
      if (!itin.date) return
      const total = Math.max(0, Number(itin.totalstops) || 0)
      const comp = Math.max(0, Number(itin.completedstops) || 0)
      const skipped = Math.max(0, Number(itin.skippedstops) || 0)
      const unfinishedCount = Math.max(0, total - comp - skipped)

      counts[itin.date] = (counts[itin.date] || 0) + unfinishedCount
      if (unfinishedCount > 0) {
        unfinishedSet.add(itin.date)
      }

      if (itin.troupeid) {
        if (!troupesMap[itin.date]) troupesMap[itin.date] = []
        if (!troupesMap[itin.date].includes(itin.troupeid)) {
          troupesMap[itin.date].push(itin.troupeid)
        }
      }
    })

    const filteredDates = [...new Set(allItineraries.map(i => i.date))].filter(d => (counts[d] || 0) > 0)
    return {
      dates: filteredDates,
      dateStopCounts: counts,
      unfinishedDates: Array.from(unfinishedSet),
      dateTroupes: troupesMap
    }
  }, [allItineraries])

  return { dates, unfinishedDates, dateTroupes, dateStopCounts, allItineraries, loading, error, refresh: fetchItineraries }
}
