import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from './useOrg'

export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()
  const { orgId } = useOrg()
  const hasFetchedRef = useRef(false)

  const fetchMembers = useCallback(async (limit = 1000, offset = 0) => {
    if (!orgId) return

    // Only show full loading on first fetch
    if (!hasFetchedRef.current) {
      setLoading(true)
    }
    setTimeoutError(false)

    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error, count } = await supabase
        .from('users')
        .select(TABLES.USERS, { count: 'exact' })
        .neq('status', 'deleted')
        .neq('is_super_admin', true)
        .eq('org_id', orgId)
        .order('displayname', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error("An error occurred")
      } else {
        setMembers(data || [])
        return { data: data || [], count: count || 0 }
      }
    } catch {
      console.error("An error occurred")
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
      hasFetchedRef.current = true
    }
  }, [orgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  useEffect(() => {
    // Subscribe to realtime changes
    if (!orgId) return

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `members-${orgId}-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `org_id=eq.${orgId}` }, (payload) => {
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
  }, [orgId])

  const addMember = async (memberData) => {
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const id = memberData.uid || safeId
    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        ...sanitizeObject(memberData),
        org_id: orgId || memberData.org_id || null,
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
