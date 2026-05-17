import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useAudit } from './useAudit'
import { useOrg } from './useOrg'

export function useTroupes() {
  const { logAction } = useAudit()
  const { orgId } = useOrg()
  const CACHE_KEY = `liondance_cache_troupes_${orgId || 'none'}`
  const CACHE_EXPIRY = 10 * 60 * 1000 // 10 minutes

  const [troupes, setTroupes] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY) return data
      }
    } catch (e) { console.warn("Troupe cache read failed:", e) }
    return []
  })
  const [loading, setLoading] = useState(!troupes.length)
  const [timeoutError, setTimeoutError] = useState(false)


  const fetchTroupes = useCallback(async () => {
    if (!orgId) return;
    setLoading(true)
    setTimeoutError(false)

    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error } = await supabase
        .from('troupes')
        .select(TABLES.TROUPES)
        .eq('org_id', orgId)
        .order('name')

      if (error) {
        console.error("Operation failed:", error?.message || "unknown")
      } else {
        setTroupes(data || [])
        // Update Cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
        } catch (e) { console.warn("Troupe cache write failed:", e) }
      }
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [orgId, CACHE_KEY])

  useEffect(() => {
    if (!orgId) return

    fetchTroupes()

    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `troupes-${orgId}-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'troupes', filter: `org_id=eq.${orgId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTroupes(prev => [...prev, payload.new].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
        } else if (payload.eventType === 'UPDATE') {
          setTroupes(prev => prev.map(t => t.id === payload.new.id ? payload.new : t).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
        } else if (payload.eventType === 'DELETE') {
          setTroupes(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTroupes, orgId])

  const addTroupe = async (troupeData) => {
    const { error } = await supabase
      .from('troupes')
      .insert({
        ...troupeData,
        memberids: [],
        org_id: orgId || troupeData.org_id || null,
        createdat: new Date().toISOString()
      })

    if (error) throw error
    await logAction('ADD_TROUPE', troupeData)
  }

  const updateTroupe = async (id, data) => {
    const { error } = await supabase
      .from('troupes')
      .update({ ...data, updatedat: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await logAction('UPDATE_TROUPE', { id, ...data })
  }

  const deleteTroupe = async (id) => {
    try {
      // 1. Unlink members from this troupe
      await supabase
        .from('users')
        .update({ troupeid: null })
        .eq('troupeid', id)
        .eq('org_id', orgId)

      // 2. Unlink customers from this troupe
      await supabase
        .from('customers')
        .update({ troupeid: null })
        .eq('troupeid', id)
        .eq('org_id', orgId)

      // 3. Delete itineraries and their stops (cascade manually)
      const { data: itins } = await supabase
        .from('itineraries')
        .select('id')
        .eq('troupeid', id)
        .eq('org_id', orgId)

      if (itins && itins.length > 0) {
        const itinIds = itins.map(i => i.id)
        // Delete stops linked to these itineraries
        await supabase.from('stops').delete().in('itinerary_id', itinIds)
        // Delete the itineraries
        await supabase.from('itineraries').delete().in('id', itinIds)
      }

      // 4. Now safe to delete the troupe
      const { error } = await supabase
        .from('troupes')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId)

      if (error) throw error
      await logAction('DELETE_TROUPE', { id })
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      throw err
    }
  }

  return { troupes, loading, timeoutError, addTroupe, updateTroupe, deleteTroupe, refresh: fetchTroupes }
}
