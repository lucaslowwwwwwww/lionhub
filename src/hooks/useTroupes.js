import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useTroupes() {
  const CACHE_KEY = 'liondance_cache_troupes'
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

  const fetchTroupes = async () => {
    setLoading(true)
    setTimeoutError(false)

    // Rule #29: Safety timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Troupes fetch timed out. Forcing loading to false.")
        setTimeoutError(true)
        setLoading(false)
      }
    }, 10000)

    try {
      const { data, error } = await supabase
        .from('troupes')
        .select('*')
        .order('name')
        .limit(50)

      if (error) {
        console.error('Error fetching troupes:', error)
      } else {
        setTroupes(data || [])
        // Update Cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
        } catch (e) { console.warn("Troupe cache write failed:", e) }
      }
    } catch (err) {
      console.error("Unexpected troupes error:", err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTroupes()

    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `troupes-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'troupes' }, (payload) => {
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
  }, [])

  const addTroupe = async (troupeData) => {
    const { error } = await supabase
      .from('troupes')
      .insert({
        ...troupeData,
        memberids: [],
        createdat: new Date().toISOString()
      })

    if (error) throw error
  }

  const updateTroupe = async (id, data) => {
    const { error } = await supabase
      .from('troupes')
      .update({ ...data, updatedat: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  const deleteTroupe = async (id) => {
    try {
      // 1. Unlink members from this troupe
      await supabase
        .from('users')
        .update({ troupeid: null })
        .eq('troupeid', id)

      // 2. Unlink customers from this troupe
      await supabase
        .from('customers')
        .update({ troupeid: null })
        .eq('troupeid', id)

      // 3. Delete itineraries and their stops (cascade manually)
      const { data: itins } = await supabase
        .from('itineraries')
        .select('id')
        .eq('troupeid', id)

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

      if (error) throw error
    } catch (err) {
      console.error('Failed to delete troupe:', err)
      throw err
    }
  }

  return { troupes, loading, timeoutError, addTroupe, updateTroupe, deleteTroupe, refresh: fetchTroupes }
}
