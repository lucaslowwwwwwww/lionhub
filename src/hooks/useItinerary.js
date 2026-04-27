import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'

export function useItinerary(troupeId, date) {
  const [itinerary, setItinerary] = useState(null)
  const [stops, setStops] = useState([])
  const [attendance, setAttendance] = useState([])
  const [attendanceDetails, setAttendanceDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const { logAction } = useAudit()

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
    let currentItinId = null

    // 1. Fetch itinerary for this troupe & date
    const fetchItinerary = async () => {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('troupeId', troupeId)
        .eq('date', date)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching itinerary:', error)
        setLoading(false)
        return
      }

      if (data) {
        currentItinId = data.id
        setItinerary(data)
        setAttendance(data.attendance || [])
        setAttendanceDetails(data.attendanceDetails || {})
        await fetchStops(data.id)
        subscribeToStops(data.id)
      } else {
        setItinerary(null)
        setStops([])
        setAttendance([])
        setAttendanceDetails({})
        setLoading(false)
      }
    }

    // 2. Fetch stops for the itinerary (flat table with itinerary_id FK)
    const fetchStops = async (itinId) => {
      const { data, error } = await supabase
        .from('stops')
        .select('*')
        .eq('itinerary_id', itinId)
        .order('order', { ascending: true })

      if (error) {
        console.error('Error fetching stops:', error)
      } else {
        setStops(data || [])
      }
      setLoading(false)
    }

    // 3. Subscribe to stops changes
    const subscribeToStops = (itinId) => {
      stopsChannel = supabase
        .channel(`stops-${itinId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stops',
            filter: `itinerary_id=eq.${itinId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setStops(prev => [...prev, payload.new].sort((a, b) => (a.order || 0) - (b.order || 0)))
            } else if (payload.eventType === 'UPDATE') {
              setStops(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
            } else if (payload.eventType === 'DELETE') {
              setStops(prev => prev.filter(s => s.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    fetchItinerary()

    // 4. Subscribe to itinerary changes
    itinChannel = supabase
      .channel(`itin-${troupeId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itineraries'
        },
        (payload) => {
          const row = payload.new || payload.old
          // Only react to this troupe+date combo
          if (row?.troupeId !== troupeId || row?.date !== date) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setItinerary(payload.new)
            setAttendance(payload.new.attendance || [])
            setAttendanceDetails(payload.new.attendanceDetails || {})

            // If this is a new itinerary (INSERT), start listening to its stops
            if (payload.eventType === 'INSERT' && payload.new.id !== currentItinId) {
              currentItinId = payload.new.id
              fetchStops(payload.new.id)
              if (stopsChannel) supabase.removeChannel(stopsChannel)
              subscribeToStops(payload.new.id)
            }
          } else if (payload.eventType === 'DELETE') {
            setItinerary(null)
            setStops([])
            setAttendance([])
            setAttendanceDetails({})
          }
        }
      )
      .subscribe()

    return () => {
      if (itinChannel) supabase.removeChannel(itinChannel)
      if (stopsChannel) supabase.removeChannel(stopsChannel)
    }
  }, [troupeId, date])

  // Helper to mark a stop as in-progress, completed, or skipped
  const updateStopStatus = async (stopId, newStatus, extraData = {}) => {
    if (!itinerary) return
    const stopData = stops.find(s => s.id === stopId)
    const oldStatus = stopData?.status || 'pending'

    if (oldStatus === newStatus) return

    const now = new Date().toISOString()
    const stopUpdates = { status: newStatus, updatedAt: now }

    // Status timestamps
    if (newStatus === 'performing') stopUpdates.performanceStartedAt = now
    else if (newStatus === 'completed') {
      stopUpdates.completedAt = now
      if (extraData.actualAmount !== undefined) stopUpdates.actualAmount = Number(extraData.actualAmount) || 0
      if (extraData.paymentMethod) stopUpdates.paymentMethod = extraData.paymentMethod
    }

    // Update stop
    const { error: stopError } = await supabase
      .from('stops')
      .update(stopUpdates)
      .eq('id', stopId)

    if (stopError) throw stopError

    // ⭐ Counter Updates (sequential read-update since Supabase lacks client-side increment)
    const itinUpdates = { updatedAt: now }
    let totalRevDelta = 0

    if (oldStatus === 'completed' && newStatus !== 'completed') {
      itinUpdates.completedStops = Math.max(0, (itinerary.completedStops || 0) - 1)
      totalRevDelta = -(Number(stopData.actualAmount) || 0)
    } else if (oldStatus !== 'completed' && newStatus === 'completed') {
      itinUpdates.completedStops = (itinerary.completedStops || 0) + 1
      totalRevDelta = Number(extraData.actualAmount) || 0
    } else if (oldStatus === 'completed' && newStatus === 'completed') {
      totalRevDelta = (Number(extraData.actualAmount) || 0) - (Number(stopData.actualAmount) || 0)
    }

    if (totalRevDelta !== 0) {
      itinUpdates.totalRevenue = (itinerary.totalRevenue || 0) + totalRevDelta
    }

    if (oldStatus === 'skipped' && newStatus !== 'skipped') {
      itinUpdates.skippedStops = Math.max(0, (itinerary.skippedStops || 0) - 1)
    } else if (oldStatus !== 'skipped' && newStatus === 'skipped') {
      itinUpdates.skippedStops = (itinerary.skippedStops || 0) + 1
    }

    await supabase.from('itineraries').update(itinUpdates).eq('id', itinerary.id)

    // Sync Finance — delete if un-completing
    if (newStatus !== 'completed' && oldStatus === 'completed') {
      try {
        await supabase.from('finance').delete().eq('sourceStopId', stopId)
      } catch (err) { console.error('Finance cleanup failed:', err) }
    }

    // 💰 Deterministic Finance Recording
    if (newStatus === 'completed' && (Number(extraData.actualAmount) || 0) > 0) {
      const amount = Number(extraData.actualAmount) || 0
      const customerName = stopData?.householdName || extraData.customerName || 'Standard Performance'
      const recordDate = stopData?.scheduledDate || date
      const financeId = `FIN_${recordDate}_${stopId}`

      await supabase.from('finance').upsert({
        id: financeId,
        type: 'income',
        amount: amount,
        category: 'Performances',
        date: recordDate,
        description: `Performance: ${customerName} (${itinerary.troupeName || 'Unknown'})`,
        paymentMethod: extraData.paymentMethod || 'Cash',
        troupeId: itinerary.troupeId,
        sourceStopId: stopId,
        createdAt: now
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
          updatedAt: new Date().toISOString()
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
          troupeId,
          date,
          status: 'published',
          attendance: [],
          attendanceDetails: {},
          totalStops: 0,
          completedStops: 0,
          skippedStops: 0,
          totalRevenue: 0,
          createdAt: new Date().toISOString(),
          ...itinData
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
          createdBy: userId,
          createdAt: now,
          updatedAt: now
        })

      if (stopError) throw stopError

      // 2. Update itinerary counter
      await supabase
        .from('itineraries')
        .update({
          totalStops: (itinerary?.totalStops || 0) + 1,
          updatedAt: now
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
      await supabase.from('finance').delete().eq('sourceStopId', stopId)

      // 2. Delete the stop
      const { error: stopError } = await supabase
        .from('stops')
        .delete()
        .eq('id', stopId)

      if (stopError) throw stopError

      // 3. ⭐ Counter Updates
      const itinUpdates = {
        totalStops: Math.max(0, (itinerary.totalStops || 0) - 1),
        updatedAt: now
      }

      if (stopData?.status === 'completed') {
        itinUpdates.completedStops = Math.max(0, (itinerary.completedStops || 0) - 1)
        itinUpdates.totalRevenue = (itinerary.totalRevenue || 0) - (Number(stopData.actualAmount) || 0)
      } else if (stopData?.status === 'skipped') {
        itinUpdates.skippedStops = Math.max(0, (itinerary.skippedStops || 0) - 1)
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
          .update({ order: index, updatedAt: now })
          .eq('id', stop.id)
      )
      await Promise.all(updates)
    } catch (err) {
      console.error('Error reordering stops:', err)
      throw err
    }
  }

  // Update the list of members joining for this performance day
  const updateAttendance = async (memberIds, details = {}) => {
    if (!itinerary) {
      console.error('Cannot update attendance without an active itinerary.')
      return
    }

    try {
      const { error } = await supabase
        .from('itineraries')
        .update({
          attendance: memberIds,
          attendanceDetails: details,
          updatedAt: new Date().toISOString()
        })
        .eq('id', itinerary.id)

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
        await supabase.from('finance').delete().in('sourceStopId', stopIds)
      }

      // 2. Delete all stops for this itinerary
      await supabase.from('stops').delete().eq('itinerary_id', itinerary.id)

      // 3. Delete the itinerary
      await supabase.from('itineraries').delete().eq('id', itinerary.id)

      logAction('DELETE_FULL_ITINERARY', { itinId: itinerary.id, date: itinerary.date, troupeName: itinerary.troupeName })
    } catch (err) {
      console.error('Error deleting full itinerary:', err)
      throw err
    }
  }

  return { itinerary, stops, attendance, attendanceDetails, loading, updateStopStatus, updateStop, addStop, createItinerary, deleteStop, reorderStops, updateAttendance, deleteFullItinerary }
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

  useEffect(() => {
    const startRange = new Date()
    startRange.setMonth(startRange.getMonth() - 2)
    const endRange = new Date()
    endRange.setMonth(endRange.getMonth() + 2)

    const startStr = startRange.toISOString().split('T')[0]
    const endStr = endRange.toISOString().split('T')[0]

    const fetchItineraries = async () => {
      const { data, error: fetchError } = await supabase
        .from('itineraries')
        .select('*')
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
    }

    fetchItineraries()

    // Subscribe to realtime changes on itineraries
    const channel = supabase
      .channel('all-itineraries')
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
  }, [])

  const { dates, dateStopCounts, unfinishedDates, dateTroupes } = useMemo(() => {
    const counts = {}
    const unfinishedSet = new Set()
    const troupesMap = {}

    allItineraries.forEach(itin => {
      if (!itin.date) return
      const total = Math.max(0, Number(itin.totalStops) || 0)
      const comp = Math.max(0, Number(itin.completedStops) || 0)

      counts[itin.date] = (counts[itin.date] || 0) + total
      if (comp < total) {
        unfinishedSet.add(itin.date)
      }

      if (itin.troupeId) {
        if (!troupesMap[itin.date]) troupesMap[itin.date] = []
        if (!troupesMap[itin.date].includes(itin.troupeId)) {
          troupesMap[itin.date].push(itin.troupeId)
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

  return { dates, unfinishedDates, dateTroupes, dateStopCounts, allItineraries, loading, error }
}
