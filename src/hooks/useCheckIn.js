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

  /**
   * Fetch current user's active check-in (check_out_at IS NULL).
   * ISSUE-1 FIX: If the active check-in is from a PREVIOUS day,
   * auto-close it (set check_out_at to end-of-that-day) so the user
   * isn't permanently locked out.
   */
  const fetchActiveCheckIn = useCallback(async () => {
    const memberId = userProfile?.id || userProfile?.uid
    if (!memberId || !orgId) return
    try {
      // Use .select() instead of .maybeSingle() to handle potential duplicates gracefully
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('org_id', orgId)
        .eq('member_id', memberId)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })

      if (error) {
        console.error("An error occurred")
        return
      }

      if (!data || data.length === 0) {
        setActiveCheckIn(null)
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // Auto-close any check-ins from before today
      const stale = data.filter(ci => {
        const ciDate = new Date(ci.check_in_at).toISOString().split('T')[0]
        return ciDate < today
      })

      if (stale.length > 0) {
        for (const ci of stale) {
          // Close at end-of-day for the day they checked in
          const closeTime = new Date(ci.check_in_at).toISOString().split('T')[0] + 'T23:59:59.000Z'
          await supabase
            .from('check_ins')
            .update({
              check_out_at: closeTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', ci.id)
        }
      }

      // Find today's active check-in (if any)
      const todayCheckIn = data.find(ci => {
        const ciDate = new Date(ci.check_in_at).toISOString().split('T')[0]
        return ciDate >= today
      })
      setActiveCheckIn(todayCheckIn || null)
    } catch (err) {
      console.error("An error occurred")
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
      console.error("An error occurred")
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

    // ISSUE-3 FIX: Block check-in on non-today dates
    const todayIso = new Date().toISOString().split('T')[0]
    // Resolve current dateKey to an actual ISO date for comparison
    // dateKey is either ISO format '2026-05-10' or CNY format 'day1_2026'
    // For CNY keys, the component passes them as-is, but the underlying
    // calendar date is what matters. We compare the check_in_at (which is always now)
    // against the selected date. Since checking in always records now(), 
    // just ensure the user is on today's page.
    if (dateKey !== todayIso && !dateKey.startsWith('day')) {
      alert('You can only check in for today\'s date.')
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
        // ISSUE-2: Handle unique constraint violation gracefully
        if (error.code === '23505') {
          alert('You already have an active check-in. Please check out first.')
          fetchActiveCheckIn()
          return
        }
        console.error("An error occurred")
        alert('Check-in failed: ' + error.message)
        return
      }
      setActiveCheckIn(data)
      fetchDailyCheckIns()
      return data
    } catch (err) {
      console.error("An error occurred")
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
        console.error("An error occurred")
        alert('Check-out failed: ' + error.message)
        return
      }
      setActiveCheckIn(null)
      fetchDailyCheckIns()
    } catch (err) {
      console.error("An error occurred")
      alert('Error checking out: ' + err.message)
    }
  }

  const updateCheckIn = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      fetchDailyCheckIns()
      fetchActiveCheckIn()
      return { success: true }
    } catch (err) {
      console.error("An error occurred")
      alert('Update failed: ' + err.message)
      return { success: false, error: err }
    }
  }

  const deleteCheckIn = async (id) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDailyCheckIns()
      fetchActiveCheckIn()
      return { success: true }
    } catch (err) {
      console.error("An error occurred")
      alert('Deletion failed: ' + err.message)
      return { success: false, error: err }
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
    updateCheckIn,
    deleteCheckIn,
    refresh: fetchDailyCheckIns 
  }
}
