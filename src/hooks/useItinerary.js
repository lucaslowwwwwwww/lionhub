import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { useToast } from '../contexts/ToastContext'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'

export function useItinerary(troupeId, date) {
  const [itinerary, setItinerary] = useState(null)
  const [stops, setStops] = useState([])
  const [attendance, setAttendance] = useState([])
  const [attendanceDetails, setAttendanceDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()
  const { showToast } = useToast()
  
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
        .eq('itinerary_id', itinId)
        .order('order', { ascending: true })

      if (error) {
        console.error('Error fetching stops:', error)
      } else {
        setStops(data || [])
      }
    } catch (err) {
      console.error('Unexpected stops error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchItinerary = useCallback(async () => {
    if (!troupeId || !date) return

    setLoading(true)
    setTimeoutError(false)
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select(TABLES.ITINERARIES)
        .eq('troupeid', troupeId)
        .eq('date', date)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching itinerary:', error)
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
      console.error('Unexpected itinerary error:', err)
      setLoading(false)
    } finally {
      clearTimeout(timeoutId)
    }
  }, [troupeId, date, fetchStops])

  useEffect(() => {
    // Reset state immediately when parameters change to avoid showing stale data
    setLoading(true)
    setStops([])
    setItinerary(null)
    setAttendance([])
    setAttendanceDetails({})

    if (!troupeId || !date) {
      setLoading(false)
      return
    }

    let itinChannel = null
    let stopsChannel = null

    // 3. Subscribe to stops changes
    const subscribeToStops = (itinId) => {
      if (stopsChannel) supabase.removeChannel(stopsChannel)
      const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      stopsChannel = supabase
        .channel(`stops-${itinId}-${safeId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stops', filter: `itinerary_id=eq.${itinId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setStops(prev => [...prev, payload.new].sort((a, b) => (a.order || 0) - (b.order || 0)))
          } else if (payload.eventType === 'UPDATE') {
            setStops(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
          } else if (payload.eventType === 'DELETE') {
            setStops(prev => prev.filter(s => s.id !== payload.old.id))
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
      .channel(`itin-${troupeId}-${date}-${itinSafeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries' },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.troupeid !== troupeId || row?.date !== date) return

          if (payload.eventType === 'UPDATE') {
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
  }, [troupeId, date, fetchItinerary])

  // Helper to mark a stop as in-progress, completed, or skipped
  const updateStopStatus = async (stopId, newStatus, extraData = {}) => {
    const currentItin = itinRef.current
    const currentStops = stopsRef.current
    if (!currentItin) return
    
    const stopData = currentStops.find(s => s.id === stopId)
    const oldStatus = stopData?.status || 'pending'

    if (oldStatus === newStatus && newStatus !== 'completed') return

    const now = new Date().toISOString()
    const stopUpdates = { status: newStatus, updatedat: now }

    // Status timestamps
    if (newStatus === 'performing') stopUpdates.performancestartedat = now
    else if (newStatus === 'completed') {
      stopUpdates.completedat = now
      if (extraData.actualamount !== undefined) stopUpdates.actualamount = Number(extraData.actualamount) || 0
      if (extraData.paymentmethod) stopUpdates.paymentmethod = extraData.paymentmethod
    }

    // Update stop
    const { error: stopError } = await supabase
      .from('stops')
      .update(stopUpdates)
      .eq('id', stopId)

    if (stopError) throw stopError

    // ⭐ Counter Updates (sequential read-update since Supabase lacks client-side increment)
    const itinUpdates = { updatedat: now }
    let totalRevDelta = 0

    if (oldStatus === 'completed' && newStatus !== 'completed') {
      itinUpdates.completedstops = Math.max(0, (currentItin.completedstops || 0) - 1)
      totalRevDelta = -(Number(stopData.actualamount) || 0)
    } else if (oldStatus !== 'completed' && newStatus === 'completed') {
      itinUpdates.completedstops = (currentItin.completedstops || 0) + 1
      totalRevDelta = Number(extraData.actualamount) || 0
    } else if (oldStatus === 'completed' && newStatus === 'completed') {
      totalRevDelta = (Number(extraData.actualamount) || 0) - (Number(stopData.actualamount) || 0)
    }

    if (totalRevDelta !== 0) {
      itinUpdates.totalrevenue = (currentItin.totalrevenue || 0) + totalRevDelta
    }

    if (oldStatus === 'skipped' && newStatus !== 'skipped') {
      itinUpdates.skippedstops = Math.max(0, (currentItin.skippedstops || 0) - 1)
    } else if (oldStatus !== 'skipped' && newStatus === 'skipped') {
      itinUpdates.skippedstops = (currentItin.skippedstops || 0) + 1
    }

    await supabase.from('itineraries').update(itinUpdates).eq('id', currentItin.id)

    // Sync Finance — delete if un-completing
    if (newStatus !== 'completed' && oldStatus === 'completed') {
      try {
        await supabase.from('finance').delete().eq('sourcestopid', stopId)
      } catch (err) { console.error('Finance cleanup failed:', err) }
    }

    // 💰 Deterministic Finance Recording
    if (newStatus === 'completed' && (Number(extraData.actualamount) || 0) > 0) {
      const amount = Number(extraData.actualamount) || 0
      const customerName = stopData?.householdname || extraData.customerName || 'Standard Performance'
      const recordDate = stopData?.scheduleddate || date
      const financeId = `FIN_${recordDate}_${stopId}`

      await supabase.from('finance').upsert({
        id: financeId,
        type: 'income',
        amount: amount,
        category: 'Performances',
        date: recordDate,
        description: `Performance: ${customerName} (${itinerary.troupename || 'Unknown'})`,
        paymentmethod: extraData.paymentmethod || 'Cash',
        troupeid: currentItin.troupeid,
        sourcestopid: stopId,
        createdat: now
      })
    }
  }

  // Update an existing stop's data
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
      console.error('Error updating stop:', err)
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
          date,
          status: 'published',
          attendance: [],
          attendancedetails: {},
          totalstops: 0,
          completedstops: 0,
          skippedstops: 0,
          totalrevenue: 0,
          createdat: new Date().toISOString(),
          ...sanitizeObject(itinData)
        })

      if (error) throw error
      return docId
    } catch (err) {
      console.error('Error creating itinerary:', err)
      throw err
    }
  }

  // Add a new stop to the current itinerary
  const addStop = async (stopData, userId, providedItinId = null) => {
    const activeItinId = itinerary?.id || providedItinId
    if (!activeItinId) {
      console.error('Cannot add stop without an active itinerary.')
      return
    }

    try {
      const now = new Date().toISOString()

      // 1. Insert stop into flat stops table with itinerary_id FK
      const { error: stopError } = await supabase
        .from('stops')
        .insert({
          ...sanitizeObject(stopData),
          itinerary_id: activeItinId,
          order: stops.length,
          status: 'pending',
          createdby: userId,
          createdat: now,
          updatedat: now
        })

      if (stopError) throw stopError

      // 2. Update itinerary counter
      await supabase
        .from('itineraries')
        .update({
          totalstops: (itinerary?.totalstops || 0) + 1,
          updatedat: now
        })
        .eq('id', activeItinId)
    } catch (err) {
      console.error('Error adding stop:', err)
      throw err
    }
  }

  // Delete a specific stop and its associated finance records
  const deleteStop = async (stopId) => {
    if (!itinerary) return
    try {
      const stopData = stops.find(s => s.id === stopId)
      const now = new Date().toISOString()

      // 1. Delete associated finance records
      await supabase.from('finance').delete().eq('sourcestopid', stopId)

      // 2. Delete the stop
      const { error: stopError } = await supabase
        .from('stops')
        .delete()
        .eq('id', stopId)

      if (stopError) throw stopError

      // 3. ⭐ Counter Updates
      const itinUpdates = {
        totalstops: Math.max(0, (itinerary.totalstops || 0) - 1),
        updatedat: now
      }

      if (stopData?.status === 'completed') {
        itinUpdates.completedstops = Math.max(0, (itinerary.completedstops || 0) - 1)
        itinUpdates.totalrevenue = (itinerary.totalrevenue || 0) - (Number(stopData.actualamount) || 0)
      } else if (stopData?.status === 'skipped') {
        itinUpdates.skippedstops = Math.max(0, (itinerary.skippedstops || 0) - 1)
      }

      await supabase.from('itineraries').update(itinUpdates).eq('id', itinerary.id)
      logAction('DELETE_STOP', { stopId, itinId: itinerary.id })
    } catch (err) {
      console.error('Error deleting stop:', err)
      throw err
    }
  }

  // Update stop sequential order
  const reorderStops = async (newStops) => {
    if (!itinerary) return
    try {
      const now = new Date().toISOString()
      // Update each stop's order individually
      const updates = newStops.map((stop, index) =>
        supabase
          .from('stops')
          .update({ order: index, updatedat: now })
          .eq('id', stop.id)
      )
      await Promise.all(updates)
    } catch (err) {
      console.error('Error reordering stops:', err)
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
      console.error('Error updating attendance:', err)
      throw err
    }
  }

  // Delete the entire itinerary document and all its stops (and associated finance)
  const deleteFullItinerary = async () => {
    if (!itinerary) return
    try {
      // 1. Delete all finance records linked to any stop in this itinerary
      const stopIds = stops.map(s => s.id)
      if (stopIds.length > 0) {
        await supabase.from('finance').delete().in('sourcestopid', stopIds)
      }

      // 2. Delete all stops for this itinerary
      await supabase.from('stops').delete().eq('itinerary_id', itinerary.id)

      // 3. Delete the itinerary
      await supabase.from('itineraries').delete().eq('id', itinerary.id)

      logAction('DELETE_FULL_ITINERARY', { itinId: itinerary.id, date: itinerary.date, troupeName: itinerary.troupename })
    } catch (err) {
      console.error('Error deleting full itinerary:', err)
      throw err
    }
  }

  return { itinerary, stops, attendance, attendanceDetails, loading, timeoutError, updateStopStatus, updateStop, addStop, createItinerary, deleteStop, reorderStops, updateAttendance, deleteFullItinerary, refresh: fetchItinerary }
}

export function useAllPerformanceDates(troupeId) {
  const CACHE_KEY = 'liondance_cache_perf_dates'
  const CACHE_EXPIRY = 10 * 60 * 1000

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
    const startRange = new Date()
    startRange.setMonth(startRange.getMonth() - 2)
    const endRange = new Date()
    endRange.setMonth(endRange.getMonth() + 2)

    const startStr = startRange.toISOString().split('T')[0]
    const endStr = endRange.toISOString().split('T')[0]

    const { data, error: fetchError } = await supabase
      .from('itineraries')
      .select(TABLES.ITINERARIES)
      .gte('date', startStr)
      .lte('date', endStr)

    if (fetchError) {
      console.error('Itinerary query error:', fetchError)
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
  }, [CACHE_KEY])

  useEffect(() => {
    fetchItineraries()

    // Subscribe to realtime changes on itineraries
    const allItinSafeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`all-itin-${allItinSafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries' },
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
  }, [fetchItineraries])

  const { dates, dateStopCounts, unfinishedDates, dateTroupes } = useMemo(() => {
    const counts = {}
    const unfinishedSet = new Set()
    const troupesMap = {}

    allItineraries.forEach(itin => {
      if (!itin.date) return
      const total = Math.max(0, Number(itin.totalstops) || 0)
      const comp = Math.max(0, Number(itin.completedstops) || 0)

      counts[itin.date] = (counts[itin.date] || 0) + total
      if (comp < total) {
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
