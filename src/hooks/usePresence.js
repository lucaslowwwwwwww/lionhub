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
    if (!userProfile?.uid) return

    // Update immediately on mount
    const updatePresence = async () => {
      // Rule #29: Prevent aggressive updates (max once every 30s)
      const lastUpdate = Number(sessionStorage.getItem('last_presence_update') || 0)
      if (Date.now() - lastUpdate < 30000) return

      try {
        await supabase
          .from('users')
          .update({ lastactive: new Date().toISOString() })
          .eq('id', userProfile.uid)
        sessionStorage.setItem('last_presence_update', Date.now().toString())
      } catch {
        console.error("An error occurred")
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
  }, [userProfile?.uid, userProfile?.role])
}
