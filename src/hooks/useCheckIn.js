import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useOrg } from '../contexts/OrgContext'
import { useAuth } from './useAuth'

export function useCheckIn(dateKey) {
  const { orgId } = useOrg()
  const { userProfile } = useAuth()
  const [activeCheckIn, setActiveCheckIn] = useState(null)
  const [dailyCheckIns, setDailyCheckIns] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch current user's active check-in (where check_out_at is NULL)
  const fetchActiveCheckIn = useCallback(async () => {
    const memberId = userProfile?.id || userProfile?.uid
    if (!memberId || !orgId) return
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('org_id', orgId)
        .eq('member_id', memberId)
        .is('check_out_at', null)
        .maybeSingle()

      if (!error) {
        setActiveCheckIn(data)
      }
    } catch (err) {
      console.error('Error fetching active check-in:', err)
    }
  }, [userProfile?.id, userProfile?.uid, orgId])

  // Fetch all check-ins for the current date (for timesheets and overview)
  const fetchDailyCheckIns = useCallback(async () => {
    if (!orgId || !dateKey) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          member:users ( id, displayname ),
          troupe:troupes ( id, name )
        `)
        .eq('org_id', orgId)
        .eq('date', dateKey)
        .order('check_in_at', { ascending: true })

      if (!error) {
        setDailyCheckIns(data || [])
      }
    } catch (err) {
      console.error('Error fetching daily check-ins:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, dateKey])

  const checkIn = async (troupeId) => {
    const memberId = userProfile?.id || userProfile?.uid
    if (!memberId || !orgId || !dateKey) {
      console.warn('Missing check-in parameters:', { memberId, orgId, dateKey })
      return
    }
    if (activeCheckIn) {
      alert('Already checked in to another team.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          org_id: orgId,
          member_id: memberId,
          troupe_id: troupeId,
          date: dateKey
        })
        .select()
        .single()

      if (error) {
        console.error('Check-in insertion error:', error)
        alert('Check-in failed: ' + error.message)
        return
      }
      setActiveCheckIn(data)
      fetchDailyCheckIns()
      return data
    } catch (err) {
      console.error('Unexpected check-in error:', err)
      alert('Error checking in: ' + err.message)
    }
  }

  const checkOut = async () => {
    if (!activeCheckIn) return

    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ 
          check_out_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activeCheckIn.id)

      if (error) {
        console.error('Check-out update error:', error)
        alert('Check-out failed: ' + error.message)
        return
      }
      setActiveCheckIn(null)
      fetchDailyCheckIns()
    } catch (err) {
      console.error('Unexpected check-out error:', err)
      alert('Error checking out: ' + err.message)
    }
  }

  useEffect(() => {
    if (!orgId) return

    fetchActiveCheckIn()
    fetchDailyCheckIns()

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `checkins-${orgId}-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins', filter: `org_id=eq.${orgId}` }, () => {
        fetchActiveCheckIn()
        fetchDailyCheckIns()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, fetchActiveCheckIn, fetchDailyCheckIns])

  return { 
    activeCheckIn, 
    dailyCheckIns, 
    loading, 
    checkIn, 
    checkOut, 
    refresh: fetchDailyCheckIns 
  }
}
