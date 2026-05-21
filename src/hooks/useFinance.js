import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from './useOrg'

export function useFinance(troupeId, options = {}) {
  const { date } = options
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()
  const { orgId } = useOrg()

  const dateStr = useMemo(() => {
    if (Array.isArray(date)) {
      return [...date].sort().join(',')
    }
    return date || ''
  }, [date])

  const fetchTransactions = useCallback(async () => {
    if (!orgId) return;
    setLoading(true)
    setTimeoutError(false)

    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      let query = supabase
        .from('finance')
        .select(TABLES.FINANCE)
        .eq('org_id', orgId)
        .order('date', { ascending: false })

      if (troupeId && troupeId !== 'all') {
        query = query.eq('troupeid', troupeId)
      }

      if (dateStr) {
        const datesArray = dateStr.split(',')
        if (datesArray.length > 1) {
          query = query.in('date', datesArray)
        } else {
          query = query.eq('date', datesArray[0])
        }
      }

      // No .limit() — fetch all finance records so stats/totals/exports are complete
      const { data, error } = await query

      if (error) {
        console.error('fetchTransactions failed:', error.message)
      } else {
        setTransactions(data || [])
      }
    } catch (err) {
      console.error('fetchTransactions exception:', err.message)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [troupeId, orgId, dateStr])

  useEffect(() => {
    fetchTransactions()

    // Subscribe to realtime changes
    if (!orgId) return;

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channelName = `finance-${orgId}-${safeId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance', filter: `org_id=eq.${orgId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new
          if (troupeId && troupeId !== 'all' && newRow.troupeid !== troupeId) return
          
          if (dateStr) {
            const datesArray = dateStr.split(',')
            if (!datesArray.includes(newRow.date)) return
          }

          setTransactions(prev => {
            // Prevent duplicates from optimistic updates
            if (prev.some(t => t.id === newRow.id)) return prev;
            return [newRow, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          })
        } else if (payload.eventType === 'UPDATE') {
          const updatedRow = payload.new
          if (troupeId && troupeId !== 'all' && updatedRow.troupeid !== troupeId) {
            setTransactions(prev => prev.filter(t => t.id !== updatedRow.id))
            return
          }
          if (dateStr) {
            const datesArray = dateStr.split(',')
            if (!datesArray.includes(updatedRow.date)) {
              setTransactions(prev => prev.filter(t => t.id !== updatedRow.id))
              return
            }
          }
          setTransactions(prev => prev.map(t => t.id === updatedRow.id ? updatedRow : t))
        } else if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTransactions, troupeId, orgId, dateStr])

  const stats = useMemo(() => {
    let income = 0
    let expenses = 0
    
    transactions.forEach(t => {
      if (t.type === 'income') income += Number(t.amount) || 0
      else if (t.type === 'expense') expenses += Number(t.amount) || 0
    })

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses
    }
  }, [transactions])

  const addTransaction = async (data) => {
    const now = new Date().toISOString()
    const generatedId = `FIN_${data.date || now.split('T')[0]}_${Date.now()}`
    
    // Normalize troupeid: if 'all' or empty, it must be null for the UUID column
    let tid = data.troupeid
    if (tid === undefined) tid = data.troupeId
    if (tid === undefined) tid = troupeId
    
    if (tid === 'all' || tid === '') tid = null

    const newRecord = {
      id: generatedId,
      ...sanitizeObject(data),
      troupeid: tid,
      org_id: orgId || data.org_id || null,
      createdat: now
    }

    // Optimistic UI Update
    setTransactions(prev => {
      if (prev.some(t => t.id === generatedId)) return prev;
      return [newRecord, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    })

    const { error } = await supabase
      .from('finance')
      .insert(newRecord)

    if (error) {
      // Revert if error
      setTransactions(prev => prev.filter(t => t.id !== generatedId))
      console.error('addTransaction failed:', error.message)
      throw error
    }
    await logAction('ADD_FINANCE_RECORD', { type: data.type, amount: data.amount, date: data.date })
  }

  const updateTransaction = async (id, data) => {
    // Normalize troupeid: if 'all' or empty, it must be null for the UUID column
    let tid = data.troupeid
    if (tid === undefined) tid = data.troupeId
    if (tid === undefined) tid = troupeId
    
    if (tid === 'all' || tid === '') tid = null

    const updatedFields = {
      ...sanitizeObject(data),
      troupeid: tid,
      updatedat: new Date().toISOString()
    }

    // Optimistic UI Update
    const prevTransactions = [...transactions]
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t))

    const { error } = await supabase
      .from('finance')
      .update(updatedFields)
      .eq('id', id)

    if (error) {
      // Rollback optimistic update on failure
      setTransactions(prevTransactions)
      console.error('updateTransaction failed:', error.message)
      throw error
    }
    await logAction('UPDATE_FINANCE_RECORD', { id, ...data })
  }

  const deleteTransaction = async (id) => {
    // Optimistic UI Update
    const prevTransactions = [...transactions]
    setTransactions(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase
      .from('finance')
      .delete()
      .eq('id', id)

    if (error) {
       // Rollback optimistic update on failure
       setTransactions(prevTransactions)
       console.error('deleteTransaction failed:', error.message)
       throw error
    }
    await logAction('DELETE_FINANCE_RECORD', { id })
  }

  return { 
    transactions, 
    loading, 
    timeoutError,
    stats, 
    addTransaction, 
    deleteTransaction, 
    updateTransaction,
    refresh: fetchTransactions
  }
}
