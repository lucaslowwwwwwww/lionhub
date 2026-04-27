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
      await supabase.from('audit_logs').insert({
        actionType, // e.g., 'DELETE_ITINERARY', 'UPDATE_FINANCE', 'CHANGE_ROLE'
        details,    // Any relevant metadata (ID of affected object, etc.)
        performedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || userProfile.email,
          role: userProfile.role
        },
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      // We don't want to crash the main app if logging fails, but we should know
      console.warn("Audit logging failed:", err)
    }
  }

  return { logAction }
}
