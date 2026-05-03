import { useState, useEffect, useCallback, useContext, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { createFetchTimeout } from '../utils/fetchHelper'
import { OrgContext } from '../contexts/OrgContext'

/**
 * useSettings — Bridge hook that provides settings data.
 * 
 * Priority:
 *   1. OrgContext (multi-tenant: reads from `organizations` table)
 *   2. Legacy `settings` table (fallback during migration)
 * 
 * The API remains the same so existing components don't break:
 *   settings.lioncolors, settings.clubnameen, etc.
 */

const SETTINGS_DOC_ID = 'general'

export function useSettings() {
  const { logAction } = useAudit()
  const orgCtx = useContext(OrgContext)

  // Legacy defaults (used if no OrgContext and no DB row)
  const [legacySettings, setLegacySettings] = useState({
    baselocation: '',
    defaultduration: 30,
    lioncolors: [],
    cnyoverrides: {},
    clubnameen: '',
    clubnamecn: '',
    clubregistrationno: '',
    clubaddress: '',
    clubphone: '',
    receiptpreparedby: '',
    signatoryphone: '',
    bankname: '',
    banktype: '',
    banknumber: '',
    theme: 'dark',
    clublogo: ''
  })
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    // Skip fetching legacy settings if we are in a proper tenant context
    if (orgCtx?.orgId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setTimeoutError(false)
    
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError, 30000)

    try {
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', SETTINGS_DOC_ID)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch settings:', fetchError)
        setError(fetchError)
      } else if (data) {
        setLegacySettings(prev => ({ ...prev, ...data }))
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected settings error:", err)
      setError(err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()

    if (orgCtx?.orgId) return;

    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`settings-${safeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: `id=eq.${SETTINGS_DOC_ID}`
        },
        (payload) => {
          if (payload.new) {
            setLegacySettings(prev => ({ ...prev, ...payload.new }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSettings])

  // Bridge: map org fields to settings API for backwards compatibility
  // MUST be memoized to prevent infinite re-renders in consuming useEffect hooks
  const settings = useMemo(() => {
    if (orgCtx?.org) {
      return {
        baselocation: orgCtx.org.base_location || '',
        defaultduration: orgCtx.org.default_duration || 30,
        lioncolors: orgCtx.org.lion_colors || [],
        cnyoverrides: orgCtx.org.cny_overrides || {},
        clubnameen: orgCtx.org.name_en || '',
        clubnamecn: orgCtx.org.name_cn || '',
        clubregistrationno: orgCtx.org.registration_no || '',
        clubaddress: orgCtx.org.address || '',
        clubphone: orgCtx.org.phone || '',
        clublogo: orgCtx.org.logo_url || '',
        theme: orgCtx.org.theme || 'dark',
        receiptpreparedby: orgCtx.org.financial_info?.prepared_by || '',
        signatoryphone: orgCtx.org.financial_info?.signatory_phone || '',
        bankname: orgCtx.org.financial_info?.bank_name || '',
        banktype: orgCtx.org.financial_info?.bank_type || '',
        banknumber: orgCtx.org.financial_info?.bank_number || '',
        cai_qing_types: orgCtx.org.cai_qing_types || [],
        extra_characters: orgCtx.org.extra_characters || [],
      }
    }
    
    return legacySettings
  }, [orgCtx?.org, legacySettings])

  const updateSettings = async (newValues) => {
    try {
      // If we have an org context, update the organizations table
      if (orgCtx?.orgId) {
        // Map settings fields back to org fields
        const orgUpdates = {}
        if (newValues.baselocation !== undefined) orgUpdates.base_location = newValues.baselocation
        if (newValues.defaultduration !== undefined) orgUpdates.default_duration = newValues.defaultduration
        if (newValues.lioncolors !== undefined) orgUpdates.lion_colors = newValues.lioncolors
        if (newValues.cnyoverrides !== undefined) orgUpdates.cny_overrides = newValues.cnyoverrides
        if (newValues.clubnameen !== undefined) orgUpdates.name_en = newValues.clubnameen
        if (newValues.clubnamecn !== undefined) orgUpdates.name_cn = newValues.clubnamecn
        if (newValues.clubphone !== undefined) orgUpdates.phone = newValues.clubphone
        if (newValues.clublogo !== undefined) orgUpdates.logo_url = newValues.clublogo
        if (newValues.theme !== undefined) orgUpdates.theme = newValues.theme
        if (newValues.cai_qing_types !== undefined) orgUpdates.cai_qing_types = newValues.cai_qing_types
        if (newValues.extra_characters !== undefined) orgUpdates.extra_characters = newValues.extra_characters

        // Financial info updates
        const finKeys = ['receiptpreparedby', 'signatoryphone', 'bankname', 'banktype', 'banknumber']
        const hasFinUpdate = finKeys.some(k => newValues[k] !== undefined)
        if (hasFinUpdate) {
          const currentFin = orgCtx.org?.financial_info || {}
          orgUpdates.financial_info = {
            ...currentFin,
            ...(newValues.receiptpreparedby !== undefined && { prepared_by: newValues.receiptpreparedby }),
            ...(newValues.signatoryphone !== undefined && { signatory_phone: newValues.signatoryphone }),
            ...(newValues.bankname !== undefined && { bank_name: newValues.bankname }),
            ...(newValues.banktype !== undefined && { bank_type: newValues.banktype }),
            ...(newValues.banknumber !== undefined && { bank_number: newValues.banknumber }),
          }
        }

        if (Object.keys(orgUpdates).length > 0) {
          await orgCtx.updateOrg(orgUpdates)
        }
        
        logAction('UPDATE_SETTINGS', { updatedFields: Object.keys(newValues) })
        return
      }

      // Also update legacy settings table for backwards compatibility ONLY if no orgCtx
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ id: SETTINGS_DOC_ID, ...newValues })

      if (upsertError) throw upsertError
      logAction('UPDATE_SETTINGS', { updatedFields: Object.keys(newValues) })
    } catch (err) {
      console.error('Failed to update settings:', err)
      throw err
    }
  }

  const uploadLogo = async (file) => {
    if (!orgCtx?.orgId) throw new Error('Organization context not found')
    
    const fileExt = file.name.split('.').pop()
    const filePath = `org_${orgCtx.orgId}/logo.${fileExt}`
    
    const { data, error: uploadError } = await supabase.storage
      .from('org-assets')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('org-assets')
      .getPublicUrl(filePath)

    // Update org
    await updateSettings({ clublogo: publicUrl })
    return publicUrl
  }

  return { settings, loading, timeoutError, error, updateSettings, uploadLogo, refresh: fetchSettings }
}
