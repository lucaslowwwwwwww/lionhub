import { createContext, useState, useEffect, useRef, useMemo, useContext, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../hooks/useAuth'

export const OrgContext = createContext(null)

/**
 * OrgProvider — provides the current organization's identity, branding,
 * and configuration data to the entire app.
 * 
 * This is the "tenant" context. Every component that needs org-specific
 * data (lion colors, cai qing, characters, logo, etc.) reads from here.
 */
export function OrgProvider({ children }) {
  const { userProfile } = useAuth()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedOrgId, setImpersonatedOrgId] = useState(null)
  const channelRef = useRef(null)

  // The effective org_id: impersonated (super admin) or the user's own
  const effectiveOrgId = impersonatedOrgId || userProfile?.org_id

  const fetchOrg = useCallback(async (orgId) => {
    if (!orgId) {
      setOrg(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()

      if (error) {
        console.error('Failed to fetch organization:', error)
      } else if (data) {
        setOrg(data)
      }
    } catch (err) {
      console.error('Unexpected org fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch org when the effective org_id changes
  useEffect(() => {
    if (!effectiveOrgId) {
      setOrg(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchOrg(effectiveOrgId)

    // Subscribe to realtime changes on this org
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2)

    channelRef.current = supabase
      .channel(`org-${effectiveOrgId}-${safeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${effectiveOrgId}`
        },
        (payload) => {
          if (payload.new) {
            setOrg(prev => ({ ...prev, ...payload.new }))
          }
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [effectiveOrgId, fetchOrg])

  // Update organization settings
  const updateOrg = useCallback(async (updates) => {
    if (!effectiveOrgId) return
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', effectiveOrgId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to update organization:', err)
      throw err
    }
  }, [effectiveOrgId])

  // Convenience accessors
  const value = useMemo(() => ({
    org,
    orgId: effectiveOrgId,
    loading,
    updateOrg,
    refreshOrg: () => fetchOrg(effectiveOrgId),

    // Super Admin: org switching
    isSuperAdmin: userProfile?.is_super_admin === true,
    impersonatedOrgId,
    setImpersonatedOrgId,

    // Convenience: branding
    logoUrl: org?.logo_url || '',
    nameEn: org?.name_en || '',
    nameCn: org?.name_cn || '',
    brandColor: org?.brand_color || '#e11d48',

    // Convenience: config lists
    lionColors: org?.lion_colors || [],
    caiQingTypes: org?.cai_qing_types || [],
    extraCharacters: org?.extra_characters || [],

    // Convenience: financial info
    financialInfo: org?.financial_info || {},

    // Convenience: operational settings
    baseLocation: org?.base_location || '',
    defaultDuration: org?.default_duration || 30,
    cnyOverrides: org?.cny_overrides || {},
    theme: org?.theme || 'dark',
  }), [org, effectiveOrgId, loading, updateOrg, fetchOrg, userProfile?.is_super_admin, impersonatedOrgId])

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  )
}

/**
 * useOrg — convenience hook to access OrgContext
 */
export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return ctx
}
