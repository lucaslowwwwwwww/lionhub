import { supabase } from '../supabase'
import { useAuth } from './useAuth'

/**
 * useAudit - Hook for logging critical administrative actions.
 * Rule #26: Log critical actions: deletions, role changes, payments, exports.
 */
export function useAudit() {
  const { userProfile } = useAuth()

  const logAction = async (actionType, details = {}) => {
    if (!userProfile) return

    try {
      // Rule #29: Add a safety timeout to audit logging so it never blocks the main UI flow
      const logPromise = supabase.from('audit_logs').insert({
        actiontype: actionType,
        details,
        performedby: {
          uid: userProfile.uid,
          name: userProfile.displayname || userProfile.email,
          role: userProfile.role
        },
        org_id: userProfile.org_id || null,
        timestamp: new Date().toISOString()
      })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Audit logging timed out')), 5000)
      )

      await Promise.race([logPromise, timeoutPromise])
    } catch (err) {
      // We don't want to crash the main app if logging fails, but we should know
      console.warn("Audit logging failed or timed out:", err)
    }
  }

  return { logAction }
}
