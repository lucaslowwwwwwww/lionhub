import { createContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

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

  useEffect(() => {
    let profileChannel = null

    // Fetch the user profile from the 'users' table
    const fetchProfile = async (authUser) => {
      if (!authUser) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      // Master email check — case-insensitive, check both auth email and profile email
      const MASTER_EMAIL = 'chuancheng2020@gmail.com'
      const authEmail = (authUser.email || '').toLowerCase().trim()

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch user profile:', error)
      }

      // Check master status from both the auth object AND the database row
      const profileEmail = (profileData?.email || '').toLowerCase().trim()
      const isMaster = authEmail === MASTER_EMAIL || profileEmail === MASTER_EMAIL

      // If they are the hardcoded master, override role but keep all profile fields
      if (isMaster) {
        setUserProfile({
          ...(profileData || {}),
          uid: authUser.id,
          displayName: profileData?.displayName || 'Master Admin',
          email: authUser.email || profileData?.email,
          role: 'master',
          troupeId: null
        })
        setLoading(false)
        return
      }

      if (profileData) {
        if (profileData.status === 'deleted') {
          console.warn('Deleted user blocked:', authUser.email)
          sessionStorage.setItem('login_error', 'Account Disabled.')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
        } else if (profileData.role === 'member') {
          console.warn('Member blocked:', authUser.email)
          sessionStorage.setItem('login_error', 'Access Denied: Members cannot log in.')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
        } else {
          setUserProfile({ uid: authUser.id, ...profileData })
        }
      } else {
        // No profile found, and not the master
        console.warn('No profile found for user:', authUser.email)
        sessionStorage.setItem('login_error', 'Access Denied: No profile found.')
        await supabase.auth.signOut()
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    }

    // Subscribe to profile changes (role, status updates) via Supabase Realtime
    const subscribeToProfile = (authUser) => {
      if (!authUser) return

      // Clean up any existing channel BEFORE creating a new one
      // This prevents the "cannot add callbacks after subscribe" error
      if (profileChannel) {
        supabase.removeChannel(profileChannel)
        profileChannel = null
      }

      profileChannel = supabase
        .channel(`profile-${authUser.id}-${Date.now()}`)
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
                  troupeId: null
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
          await fetchProfile(authUser)
          subscribeToProfile(authUser)
        } else {
          setUserProfile(null)
          setLoading(false)
          // Clean up profile channel
          if (profileChannel) {
            supabase.removeChannel(profileChannel)
            profileChannel = null
          }
        }

        clearTimeout(timer)
      }
    )

    return () => {
      subscription.unsubscribe()
      if (profileChannel) {
        supabase.removeChannel(profileChannel)
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
            actionType: 'DELETE_ACCOUNT',
            details: { uid },
            performedBy: {
              uid: userProfile.uid,
              name: userProfile.displayName || userProfile.email,
              role: userProfile.role
            },
            timestamp: new Date().toISOString()
          })
        } catch(e) { console.warn('Failed to audit log account deletion', e) }
      }

      // 1. Soft-delete user profile
      await supabase
        .from('users')
        .update({ status: 'deleted', deletedAt: new Date().toISOString() })
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

  const value = { user, userProfile, loading, logout, deleteAccount }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
