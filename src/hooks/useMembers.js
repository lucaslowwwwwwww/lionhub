import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'

export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()

  const fetchMembers = async () => {
    if (members.length === 0) {
      setLoading(true)
    }
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Members fetch timed out. Forcing loading to false.")
        setTimeoutError(true)
        setLoading(false)
      }
    }, 10000)

    try {
      setTimeoutError(false)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('status', 'deleted')
        .limit(100)

      if (error) {
        console.error('Error fetching members:', error)
      } else {
        setMembers(data || [])
      }
    } catch (err) {
      console.error('Unexpected members error:', err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch initial members with a safety timeout
    fetchMembers()

    // Subscribe to realtime changes
    // CRITICAL: .on() MUST come before .subscribe()
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `members-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status !== 'deleted') {
            setMembers(prev => [...prev, payload.new])
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'deleted') {
            // Soft-deleted: remove from UI
            setMembers(prev => prev.filter(m => m.id !== payload.new.id))
          } else {
            setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          }
        } else if (payload.eventType === 'DELETE') {
          setMembers(prev => prev.filter(m => m.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  const addMember = async (memberData) => {
    // Use a custom ID if provided (e.g. Supabase Auth UID), otherwise auto-generate
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const id = memberData.uid || safeId
    console.log('Inserting into public.users table...', { id })
    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        ...sanitizeObject(memberData),
        createdat: new Date().toISOString()
      })

    if (error) {
      console.error('Database insert error:', error)
      throw error
    }
    
    console.log('Logging audit action: ADD_MEMBER')
    await logAction('ADD_MEMBER', { id, ...memberData })
    console.log('Audit log completed.')
    return id
  }

  const updateMember = async (id, data) => {
    console.log('Executing UPDATE on public.users...', { id })
    const { error } = await supabase
      .from('users')
      .update({ ...sanitizeObject(data), updatedat: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Database update error:', error)
      throw error
    }
    
    console.log('Logging audit action: UPDATE_MEMBER')
    await logAction('UPDATE_MEMBER', { id, ...data })
    console.log('Audit log completed.')
  }

  const deleteMember = async (id) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        status: 'deleted', 
        deletedat: new Date().toISOString() 
      })
      .eq('id', id)

    if (error) throw error
    await logAction('DELETE_MEMBER', { id })
  }

  return { 
    members, 
    loading, 
    timeoutError,
    addMember, 
    updateMember, 
    deleteMember,
    refresh: fetchMembers
  }
}
