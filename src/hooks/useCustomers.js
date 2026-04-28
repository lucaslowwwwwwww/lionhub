import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { sanitizeObject } from '../utils/sanitize'

/**
 * useCustomers — Global Customer Management
 * Provides visibility and write access to the shared club customer database for all authorized users.
 */
export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const [error, setError] = useState(null)
  
  const { userProfile, user } = useAuth()
  const troupeId = userProfile?.troupeid

  const fetchCustomers = async () => {
    setLoading(true)
    setTimeoutError(false)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Customers fetch timed out. Forcing loading to false.")
        setTimeoutError(true)
        setLoading(false)
      }
    }, 10000)

    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .limit(100)

      if (fetchError) {
        console.error('Error fetching global customer list:', fetchError)
        setError(fetchError)
      } else {
        const sorted = (data || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setCustomers(sorted)
        setError(null)
      }
    } catch (err) {
      console.error('Unexpected customers error:', err)
      setError(err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchCustomers()

    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`customers-${safeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomers(prev => [...prev, payload.new].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
          } else if (payload.eventType === 'UPDATE') {
            setCustomers(prev => prev.map(c => c.id === payload.new.id ? payload.new : c).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
          } else if (payload.eventType === 'DELETE') {
            setCustomers(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const addCustomer = async (customerData) => {
    if (!user) throw new Error("Authentication required.")
    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({
        ...sanitizeObject(customerData),
        troupeid: troupeId || null,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    return data.id
  }

  const updateCustomer = async (customerId, updates) => {
    if (!user) throw new Error("Authentication required.")
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        ...sanitizeObject(updates),
        updatedat: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) throw updateError
  }

  const deleteCustomer = async (customerId) => {
    if (!user) throw new Error("Authentication required.")
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (deleteError) throw deleteError
  }

  return { 
    customers, 
    loading, 
    timeoutError,
    error, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    refresh: fetchCustomers
  }
}
