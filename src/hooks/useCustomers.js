import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from './useOrg'

/**
 * useCustomers — Global Customer Management
 */
export function useCustomers(options = {}) {
  const { initialPageSize = 10 } = options
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { userProfile, user } = useAuth()
  const { orgId } = useOrg()
  const troupeId = userProfile?.troupeid

  const fetchCustomers = useCallback(async () => {
    if (!user || !orgId) return;
    
    setLoading(true)
    setTimeoutError(false)
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      let query = supabase
        .from('customers')
        .select(TABLES.CUSTOMERS, { count: 'exact' })
        .eq('org_id', orgId)

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, count, error: fetchError } = await query
        .order('name', { ascending: true })
        .range(from, to)

      if (fetchError) {
        console.error("Operation failed:", error?.message || "unknown")
        setError(fetchError)
      } else {
        setCustomers(data || [])
        setTotalCount(count || 0)
        setError(null)
      }
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      setError(null)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [user, orgId, page, pageSize, searchQuery])

  useEffect(() => {
    if (!user || !orgId) {
      setLoading(false)
      return
    }

    fetchCustomers()

    // Subscribe to realtime changes
    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`customers-${orgId}-${safeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `org_id=eq.${orgId}` },
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
  }, [user, orgId, fetchCustomers])

  const addCustomer = async (customerData) => {
    if (!user) throw new Error("Authentication required.")
    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({
        ...sanitizeObject(customerData),
        troupeid: troupeId || null,
        org_id: orgId || customerData.org_id || null,
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
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    refresh: fetchCustomers
  }
}
