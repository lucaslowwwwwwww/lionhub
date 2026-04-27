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

  useEffect(() => {
    // Fetch initial troupes
    const fetchTroupes = async () => {
      const { data, error } = await supabase
        .from('troupes')
        .select('*')
        .order('name')
        .limit(50)

      if (error) {
        console.error('Error fetching troupes:', error)
      } else {
        setTroupes(data || [])
        setLoading(false)
        // Update Cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
        } catch (e) { console.warn("Troupe cache write failed:", e) }
      }
    }

    fetchTroupes()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`troupes-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'troupes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTroupes(prev => [...prev, payload.new].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
          } else if (payload.eventType === 'UPDATE') {
            setTroupes(prev => prev.map(t => t.id === payload.new.id ? payload.new : t).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
          } else if (payload.eventType === 'DELETE') {
            setTroupes(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
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
        memberIds: [],
        createdAt: new Date().toISOString()
      })

    if (error) throw error
  }

  const updateTroupe = async (id, data) => {
    const { error } = await supabase
      .from('troupes')
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  const deleteTroupe = async (id) => {
    const { error } = await supabase
      .from('troupes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { troupes, loading, addTroupe, updateTroupe, deleteTroupe }
}
