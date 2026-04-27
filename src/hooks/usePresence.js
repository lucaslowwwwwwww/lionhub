import { useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

/**
 * usePresence — tracks the current user's activity.
 * Updates the 'lastActive' field in the user's Supabase row.
 */
export function usePresence() {
  const { userProfile } = useAuth()

  useEffect(() => {
    if (!userProfile?.uid || userProfile.role === 'master') return

    // Update immediately on mount
    const updatePresence = async () => {
      try {
        await supabase
          .from('users')
          .update({ lastActive: new Date().toISOString() })
          .eq('id', userProfile.uid)
      } catch (err) {
        console.error('Failed to update presence:', err)
      }
    }

    updatePresence()

    // Update every 2 minutes
    const interval = setInterval(updatePresence, 120000)

    // Also update on visibility change (re-entering the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userProfile?.uid])
}
