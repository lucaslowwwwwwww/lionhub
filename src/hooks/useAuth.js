import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

/**
 * useAuth — convenience hook.
 * Returns { user, userProfile, loading, logout }
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
