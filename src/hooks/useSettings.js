import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'

const SETTINGS_DOC_ID = 'general'

export function useSettings() {
  const { logAction } = useAudit()
  const [settings, setSettings] = useState({
    baselocation: '23, Jalan Imj 2, Melaka',
    defaultduration: 30,
    lioncolors: ['黑', '黄', '紫', '橙', '青', '红'],
    cnyoverrides: {},
    clubnameen: 'Persatuan Tarian Singa Dan Naga Chuan Cheng Melaka',
    clubnamecn: '馬來西亞馬六甲傳承龍獅體育會',
    clubregistrationno: '(PPM-015-04-30122019)',
    clubaddress: 'NO 23-1, JALAN IMJ 2, TAMAN INDUSTRI MALIM JAYA, 75250, MELAKA',
    clubphone: '012-328 2862 / 013-666 0979',
    receiptpreparedby: 'REX YONG',
    signatoryphone: '60136660979',
    bankname: 'PERSATUAN TARIAN NAGA DAN SINGA CHUAN CHENG MELAKA',
    banktype: 'CIMB',
    banknumber: '8011396083',
    theme: 'dark'
  })
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const [error, setError] = useState(null)

  const fetchSettings = async () => {
    // Only show loading if we don't have settings yet
    const hasData = settings && settings.baselocation !== '23, Jalan Imj 2, Melaka' // Check for non-default value
    if (!hasData) {
      setLoading(true)
    }
    setTimeoutError(false)
    
    // Rule #29: Safety timeout (increased to 30s)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Settings fetch timed out. Forcing loading to false.")
        setTimeoutError(true)
        setLoading(false)
      }
    }, 30000)

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
        setSettings(prev => ({ ...prev, ...data }))
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected settings error:", err)
      setError(err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()

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
            setSettings(prev => ({ ...prev, ...payload.new }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateSettings = async (newValues) => {
    try {
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

  return { settings, loading, timeoutError, error, updateSettings, refresh: fetchSettings }
}
