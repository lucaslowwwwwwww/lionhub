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
        if (isSuperAdmin) {
          localStorage.setItem('ldms_is_super_admin', 'true')
        } else {
          localStorage.removeItem('ldms_is_super_admin')
        }
        
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
        if (profileData.status === 'deleted' || profileData.role === 'member') {
          console.warn('User blocked:', authUser.email)
          sessionStorage.setItem('login_error', 'Access Denied.')
          localStorage.removeItem('ldms_is_super_admin')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
        } else {
          localStorage.removeItem('ldms_is_super_admin')
          setUserProfile({ uid: authUser.id, ...profileData })
        }
      } else {
        console.warn('No profile found for user:', authUser.email)
        sessionStorage.setItem('login_error', 'No profile found.')
        localStorage.removeItem('ldms_is_super_admin')
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

            if (updated.role === 'member') {
              sessionStorage.setItem('login_error', 'Access Denied: Members cannot log in.')
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

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
    localStorage.removeItem('ldms_is_super_admin')
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
      localStorage.removeItem('ldms_is_super_admin')
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
    </AuthContext.Provider>
  )
}
