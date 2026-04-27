import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'

export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const { logAction } = useAudit()

  useEffect(() => {
    // Fetch initial members
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(100)

      if (error) {
        console.error('Error fetching members:', error)
      } else {
        setMembers(data || [])
      }
      setLoading(false)
    }

    fetchMembers()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`users-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const addMember = async (memberData) => {
    // Use a custom ID if provided (e.g. Supabase Auth UID), otherwise auto-generate
    const id = memberData.uid || crypto.randomUUID()
    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        ...sanitizeObject(memberData),
        createdAt: new Date().toISOString()
      })

    if (error) throw error
    logAction('ADD_MEMBER', { id, ...memberData })
    return id
  }

  const updateMember = async (id, data) => {
    const { error } = await supabase
      .from('users')
      .update({ ...sanitizeObject(data), updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    logAction('UPDATE_MEMBER', { id, ...data })
  }

  const deleteMember = async (id) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        status: 'deleted', 
        deletedAt: new Date().toISOString() 
      })
      .eq('id', id)

    if (error) throw error
    logAction('DELETE_MEMBER', { id })
  }

  return { members, loading, addMember, updateMember, deleteMember }
}
