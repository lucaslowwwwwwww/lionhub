import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'

const SETTINGS_DOC_ID = 'general'

export function useSettings() {
  const { logAction } = useAudit()
  const [settings, setSettings] = useState({
    baseLocation: '23, Jalan Imj 2, Melaka',
    defaultDuration: 30,
    lionColors: ['黑', '黄', '紫', '橙', '青', '红'],
    cnyOverrides: {},
    // Club Profile/Receipt Metadata
    clubNameEn: 'Persatuan Tarian Singa Dan Naga Chuan Cheng Melaka',
    clubNameCn: '馬來西亞馬六甲傳承龍獅體育會',
    clubRegistrationNo: '(PPM-015-04-30122019)',
    clubAddress: 'NO 23-1, JALAN IMJ 2, TAMAN INDUSTRI MALIM JAYA, 75250, MELAKA',
    clubPhone: '012-328 2862 / 013-666 0979',
    receiptPreparedBy: 'REX YONG',
    signatoryPhone: '60136660979',
    bankName: 'PERSATUAN TARIAN NAGA DAN SINGA CHUAN CHENG MELAKA',
    bankType: 'CIMB',
    bankNumber: '8011396083'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch initial settings
    const fetchSettings = async () => {
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
      }
      setLoading(false)
    }

    fetchSettings()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('settings-changes')
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

  return { settings, loading, error, updateSettings }
}
