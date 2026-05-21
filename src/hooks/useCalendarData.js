import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from './useOrg'
import { useAuth } from './useAuth'
import { getActualCnyDate, CNY_START_DATES } from '../utils/constants'
import { useSettings } from './useSettings'

/**
 * useCalendarData — Unified Calendar Data Hook
 * 
 * Merges pending performances (itineraries) and custom calendar events
 * into a single array for the calendar view.
 * 
 * @param {number} year - The calendar year to display
 * @param {number} month - The calendar month (0-indexed, like JS Date)
 */
export function useCalendarData(year, month) {
  const [calendarEvents, setCalendarEvents] = useState([])
  const [performances, setPerformances] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { orgId } = useOrg()
  const { user } = useAuth()
  const { settings } = useSettings()

  // Compute month range boundaries
  const monthRange = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      startDate: start,
      endDate: end
    }
  }, [year, month])

  // ─── Fetch Calendar Events ───
  const fetchCalendarEvents = useCallback(async () => {
    if (!orgId) return

    const { data, error } = await supabase
      .from('calendar_events')
      .select(TABLES.CALENDAR_EVENTS)
      .eq('org_id', orgId)
      .gte('start_time', monthRange.startISO)
      .lte('start_time', monthRange.endISO)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('fetchCalendarEvents failed:', error.message)
    } else {
      setCalendarEvents(data || [])
    }
  }, [orgId, monthRange.startISO, monthRange.endISO])

  // ─── Fetch Performances (Pending/Published Itineraries) ───
  const fetchPerformances = useCallback(async () => {
    if (!orgId) return

    const { data, error } = await supabase
      .from('itineraries')
      .select(TABLES.ITINERARIES_LIGHT)
      .eq('org_id', orgId)
      .neq('status', 'completed')

    if (error) {
      console.error('fetchPerformances failed:', error.message)
    } else {
      setPerformances(data || [])
    }
  }, [orgId])

  // ─── Combined Fetch ───
  const fetchAll = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setTimeoutError(false)
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      await Promise.all([fetchCalendarEvents(), fetchPerformances()])
    } catch (err) {
      console.error('fetchAll exception:', err.message)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [orgId, fetchCalendarEvents, fetchPerformances])

  // ─── Initial fetch + Realtime subscriptions ───
  useEffect(() => {
    fetchAll()

    if (!orgId) return

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`calendar-unified-${orgId}-${safeId}`)
      // Listen to calendar_events changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCalendarEvents(prev => {
              if (prev.some(e => e.id === payload.new.id)) return prev
              return [...prev, payload.new].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            })
          } else if (payload.eventType === 'UPDATE') {
            setCalendarEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
          } else if (payload.eventType === 'DELETE') {
            setCalendarEvents(prev => prev.filter(e => e.id !== payload.old.id))
          }
        }
      )
      // Listen to itineraries changes (stop counts, new itineraries, status changes)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPerformances(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
          } else if (payload.eventType === 'INSERT') {
            setPerformances(prev => {
              if (prev.some(p => p.id === payload.new.id)) return prev
              if (payload.new.status === 'completed') return prev
              return [...prev, payload.new]
            })
          } else if (payload.eventType === 'DELETE') {
            setPerformances(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll, orgId])

  // ─── Merge into unified events array ───
  const events = useMemo(() => {
    const unified = []

    // Merge built-in defaults with manual overrides (manual takes priority)
    const cnyOverrides = { ...CNY_START_DATES, ...(settings?.cnyoverrides || {}) }

    // Map performances to unified shape, deduplicating by troupe + resolved date
    const perfMap = new Map()

    performances.forEach(perf => {
      if (!perf.date) return

      let resolvedDate = null

      if (perf.date.startsWith('day')) {
        // CNY-style date like 'day1_2026'
        const parts = perf.date.split('_')
        const perfYear = parts[1] ? Number(parts[1]) : year
        
        // Only include if we can resolve the date
        if (cnyOverrides[perfYear]) {
          const dateObj = getActualCnyDate(perf.date, perfYear, cnyOverrides)
          if (dateObj && !isNaN(dateObj.getTime())) {
            resolvedDate = dateObj
          }
        }
      } else {
        // ISO date string like '2026-05-21'
        const dateObj = new Date(perf.date + 'T00:00:00')
        if (!isNaN(dateObj.getTime())) {
          resolvedDate = dateObj
        }
      }

      if (!resolvedDate) return

      // Check if performance date falls within current month view
      if (resolvedDate.getFullYear() !== year || resolvedDate.getMonth() !== month) return

      const resolvedIso = `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}-${String(resolvedDate.getDate()).padStart(2, '0')}`
      const totalStops = Math.max(0, Number(perf.totalstops) || 0)

      // Skip empty itineraries (no stops assigned)
      if (totalStops === 0) return

      const dedupeKey = `${perf.troupeid}_${resolvedIso}`

      // Keep the entry with higher totalStops when duplicates exist
      const existing = perfMap.get(dedupeKey)
      if (existing && existing.totalStops >= totalStops) return

      perfMap.set(dedupeKey, {
        id: perf.id,
        title: perf.troupename || 'Performance',
        description: `${totalStops} stops`,
        start: resolvedDate,
        end: resolvedDate,
        dateKey: resolvedIso,
        type: 'performance',
        color: 'crimson',
        source: perf,
        totalStops,
        troupeId: perf.troupeid
      })
    })

    // Add deduplicated performances to unified list
    perfMap.forEach(entry => unified.push(entry))

    // Map calendar events to unified shape
    calendarEvents.forEach(evt => {
      const startDate = new Date(evt.start_time)
      const endDate = new Date(evt.end_time)
      const startIso = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

      unified.push({
        id: evt.id,
        title: evt.title,
        description: evt.description || '',
        start: startDate,
        end: endDate,
        dateKey: startIso,
        type: 'event',
        color: evt.color || 'blue',
        source: evt,
        createdBy: evt.created_by
      })
    })

    // Sort by start date/time
    unified.sort((a, b) => a.start.getTime() - b.start.getTime())

    return unified
  }, [calendarEvents, performances, year, month, settings])

  // ─── CRUD: Calendar Events ───
  const addEvent = async (data) => {
    if (!orgId || !user) throw new Error('Authentication required.')

    const newRecord = {
      ...sanitizeObject(data),
      org_id: orgId,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('calendar_events')
      .insert(newRecord)

    if (error) {
      console.error('addEvent failed:', error.message)
      throw error
    }
  }

  const updateEvent = async (id, data) => {
    if (!user) throw new Error('Authentication required.')

    const updatedFields = {
      ...sanitizeObject(data),
      updated_at: new Date().toISOString()
    }

    // Optimistic update
    const prevEvents = [...calendarEvents]
    setCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, ...updatedFields } : e))

    const { error } = await supabase
      .from('calendar_events')
      .update(updatedFields)
      .eq('id', id)

    if (error) {
      setCalendarEvents(prevEvents)
      console.error('updateEvent failed:', error.message)
      throw error
    }
  }

  const deleteEvent = async (id) => {
    if (!user) throw new Error('Authentication required.')

    // Optimistic update
    const prevEvents = [...calendarEvents]
    setCalendarEvents(prev => prev.filter(e => e.id !== id))

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      setCalendarEvents(prevEvents)
      console.error('deleteEvent failed:', error.message)
      throw error
    }
  }

  return {
    events,
    loading,
    timeoutError,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchAll
  }
}
