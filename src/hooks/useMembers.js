import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'

export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()

  const fetchMembers = useCallback(async () => {
    // Only show full loading if we don't have cached data
    if (members.length === 0) {
      setLoading(true)
    }
    setTimeoutError(false)

    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error } = await supabase
        .from('users')
        .select(TABLES.USERS)
        .neq('status', 'deleted')
        .order('displayname', { ascending: true })

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
  }, [members.length])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  useEffect(() => {
    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `members-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.status !== 'deleted') {
            setMembers(prev => [...prev, payload.new].sort((a, b) => (a.displayname || '').localeCompare(b.displayname || '')))
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'deleted') {
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
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const id = memberData.uid || safeId
    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        ...sanitizeObject(memberData),
        createdat: new Date().toISOString()
      })

    if (error) throw error
    await logAction('ADD_MEMBER', { id, ...memberData })
    return id
  }

  const updateMember = async (id, data) => {
    const { error } = await supabase
      .from('users')
      .update({ ...sanitizeObject(data), updatedat: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await logAction('UPDATE_MEMBER', { id, ...data })
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
