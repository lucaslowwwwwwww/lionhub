import { createContext, useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabase'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'

export const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the app and provides:
 *  • user        – Supabase Auth user object (or null)
 *  • userProfile – /users/{uid} row (includes role, troupeId)
 *  • loading     – true while auth state is being resolved
 *  • logout()    – sign out helper
 *  • deleteAccount() – soft-delete + sign out
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const profileChannelRef = useRef(null)
  const subscribedUserIdRef = useRef(null)
  const userProfileRef = useRef(null)
  const fetchingRef = useRef(false)
 
   // Keep Ref in sync with state for use in callbacks/listeners
   useEffect(() => {
     userProfileRef.current = userProfile
   }, [userProfile])

  // Fetch the user profile from the 'users' table with safety timeout
  const fetchProfile = async (authUser, forceLoading = false) => {
    if (!authUser) {
      setUserProfile(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true

    const shouldShowLoading = !userProfileRef.current || forceLoading
    if (shouldShowLoading) {
      setLoading(true)
      setConnectionError(false)
    }
    
    const timeoutId = createFetchTimeout(setLoading, (val) => {
      if (val && shouldShowLoading) setConnectionError(true)
    }, 30000)

    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select(`${TABLES.USERS}, organizations(status)`)
        .eq('id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch user profile:', error)
      }

      // Use database-driven flags instead of hardcoded email
      const isSuperAdmin = profileData?.is_super_admin === true
      const isMaster = isSuperAdmin || profileData?.role === 'master'
      const isOrgInactive = profileData?.organizations?.status === 'inactive'

      if (isOrgInactive && !isSuperAdmin) {
        console.warn('Organization deactivated:', authUser.email)
        sessionStorage.setItem('login_error', "Your association's account is currently inactive. Please contact support.")
        await supabase.auth.signOut()
        setUser(null)
        setUserProfile(null)
        setConnectionError(false)
        setLoading(false)
        return
      }

      if (isMaster) {
        setUserProfile({
          ...(profileData || {}),
          uid: authUser.id,
          displayname: profileData?.displayname || 'Master Admin',
          email: authUser.email || profileData?.email,
          role: 'master',
          is_super_admin: isSuperAdmin,
          org_id: profileData?.org_id || null,
          troupeid: null
        })
      } else if (profileData) {
        if (profileData.status === 'deleted') {
          console.warn('User blocked:', authUser.email)
          sessionStorage.setItem('login_error', 'Access Denied.')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
        } else {
          setUserProfile({ uid: authUser.id, ...profileData })
        }
      } else {
        console.warn('No profile found for user:', authUser.email)
        sessionStorage.setItem('login_error', 'No profile found.')
        await supabase.auth.signOut()
        setUser(null)
        setUserProfile(null)
      }
      setConnectionError(false)
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err)
      if (shouldShowLoading) {
        setConnectionError(true)
      }
    } finally {
      fetchingRef.current = false
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  // Subscribe to profile changes (role, status updates) via Supabase Realtime
  const subscribeToProfile = (authUser) => {
    if (!authUser) return

    if (subscribedUserIdRef.current === authUser.id && profileChannelRef.current) {
      return
    }

    // Clean up any existing channel BEFORE creating a new one
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current)
      profileChannelRef.current = null
      subscribedUserIdRef.current = null
    }

    subscribedUserIdRef.current = authUser.id

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    profileChannelRef.current = supabase
      .channel(`profile-${authUser.id}-${safeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${authUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new

            if (updated.status === 'deleted') {
              sessionStorage.setItem('login_error', 'Account Disabled.')
              supabase.auth.signOut()
              setUser(null)
              setUserProfile(null)
              return
            }



            // Master override — use database flag
            const isMasterUser = updated.is_super_admin === true || updated.role === 'master'
            
            if (isMasterUser) {
              setUserProfile(prev => ({
                ...prev,
                ...updated,
                uid: authUser.id,
                role: 'master',
                is_super_admin: updated.is_super_admin === true,
                org_id: updated.org_id || prev?.org_id,
                troupeid: null
              }))
            } else {
              setUserProfile(prev => ({ ...prev, ...updated, uid: authUser.id }))
            }
          }

          if (payload.eventType === 'DELETE') {
            supabase.auth.signOut()
            setUser(null)
            setUserProfile(null)
          }
        }
      )
      .subscribe()
  }

  useEffect(() => {
    // Timeout fallback in case auth takes too long
    const timer = setTimeout(() => {
      setLoading(false)
      console.warn('Auth state resolution timed out. Forcing UI mount.')
    }, 10000)

    // Fallback: Check if URL hash or search contains recovery tokens or type=recovery
    const checkRecoveryParam = () => {
      const hash = window.location.hash || ''
      const search = window.location.search || ''
      if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('recovery_token=')) {
        setShowRecoveryModal(true)
      }
    }
    checkRecoveryParam()

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setShowRecoveryModal(true)
        }
        const authUser = session?.user ?? null
        setUser(authUser)

        if (authUser) {
          const currentProfile = userProfileRef.current
          const isSameUser = currentProfile && currentProfile.uid === authUser.id
          
          // Rule #29: Add a small delay for background refreshes on focus
          // This gives the OS/Network time to settle (avoiding instant timeouts)
          setTimeout(() => {
            fetchProfile(authUser, !isSameUser) 
          }, isSameUser ? 1000 : 0)

          subscribeToProfile(authUser)
        } else {
          setUserProfile(null)
          setLoading(false)
          // Clean up profile channel
          if (profileChannelRef.current) {
            supabase.removeChannel(profileChannelRef.current)
            profileChannelRef.current = null
          }
        }

        clearTimeout(timer)
      }
    )

    return () => {
      subscription.unsubscribe()
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current)
      }
      clearTimeout(timer)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  const deleteAccount = async () => {
    if (!user) return
    const uid = user.id
    try {
      // 0. Audit Log the deletion before destroying userProfile
      if (userProfile) {
        try {
          await supabase.from('audit_logs').insert({
            actiontype: 'DELETE_ACCOUNT',
            details: { uid },
            performedby: {
              uid: userProfile.uid,
              name: userProfile.displayname || userProfile.email,
              role: userProfile.role
            },
            timestamp: new Date().toISOString()
          })
        } catch(e) { console.warn('Failed to audit log account deletion', e) }
      }

      // 1. Soft-delete user profile
      await supabase
        .from('users')
        .update({ status: 'deleted', deletedat: new Date().toISOString() })
        .eq('id', uid)
      
      // 2. Sign out (cannot delete Supabase Auth user client-side)
      await supabase.auth.signOut()
      
      setUser(null)
      setUserProfile(null)
    } catch (err) {
      console.error("Failed to delete account:", err)
      throw err
    }
  }

  const updateProfile = async (newValues) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('users')
        .update(newValues)
        .eq('id', user.id)

      if (error) throw error
      // Local state is updated via the realtime subscription
    } catch (err) {
      console.error('Failed to update profile:', err)
      throw err
    }
  }

  const value = useMemo(() => ({ 
    user, 
    userProfile, 
    loading, 
    connectionError, 
    logout, 
    deleteAccount, 
    updateProfile,
    refreshProfile: () => user && fetchProfile(user, true) 
  }), [user, userProfile, loading, connectionError])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showRecoveryModal && (
        <RecoveryModal onClose={() => setShowRecoveryModal(false)} />
      )}
    </AuthContext.Provider>
  )
}

function RecoveryModal({ onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError
      setSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {success ? (
          <div className="p-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Password Updated</h3>
              <p className="text-sm text-surface-400 mt-2 px-4 leading-relaxed">
                Your password has been changed successfully. You may now securely access the system.
              </p>
            </div>
            <button 
              onClick={() => {
                // Remove recovery details from URL hash/search to prevent re-opening on manual refreshes
                try {
                  window.location.hash = ''
                  const url = new URL(window.location.href)
                  url.searchParams.delete('type')
                  window.history.replaceState({}, document.title, url.pathname)
                } catch(e) {}
                onClose()
              }}
              className="w-full py-4 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all"
            >
              Proceed to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="p-8 space-y-6">
            <header className="text-center">
              <div className="w-12 h-12 rounded-full bg-surface-950 border border-surface-800 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-inner">
                <img src="/lionhub_logo.jpeg" alt="Lionhub" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Reset Password</h2>
              <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mt-1">Set Your Secure Credentials</p>
            </header>

            {error && (
              <div className="p-4 bg-crimson-900/10 border border-crimson-500/20 rounded-2xl text-crimson-400 text-[11px] font-bold flex gap-3 items-center">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
