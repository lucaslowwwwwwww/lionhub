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
      const authEmail = (authUser.email || '').toLowerCase().trim()
      const MASTER_EMAIL = 'chuancheng2020@gmail.com'

      const { data: profileData, error } = await supabase
        .from('users')
        .select(TABLES.USERS)
        .eq('id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch user profile:', error)
      }

      const profileEmail = (profileData?.email || '').toLowerCase().trim()
      const isMaster = authEmail === MASTER_EMAIL || profileEmail === MASTER_EMAIL

      if (isMaster) {
        setUserProfile({
          ...(profileData || {}),
          uid: authUser.id,
          displayname: profileData?.displayname || 'Master Admin',
          email: authUser.email || profileData?.email,
          role: 'master',
          troupeid: null
        })
      } else if (profileData) {
        if (profileData.status === 'deleted' || profileData.role === 'member') {
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

    // Clean up any existing channel BEFORE creating a new one
    // This prevents the "cannot add callbacks after subscribe" error
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current)
      profileChannelRef.current = null
    }

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

            // Master override — check both auth email and updated row email
            const updEmail = (updated.email || '').toLowerCase().trim()
            const aEmail = (authUser.email || '').toLowerCase().trim()
            const isMasterUser = aEmail === 'chuancheng2020@gmail.com' || updEmail === 'chuancheng2020@gmail.com'
            
            if (isMasterUser) {
              setUserProfile(prev => ({
                ...prev,
                ...updated,
                uid: authUser.id,
                role: 'master',
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

  const value = useMemo(() => ({ 
    user, 
    userProfile, 
    loading, 
    connectionError, 
    logout, 
    deleteAccount, 
    refreshProfile: () => user && fetchProfile(user, true) 
  }), [user, userProfile, loading, connectionError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
