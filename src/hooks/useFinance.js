import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from '../contexts/OrgContext'

export function useFinance(troupeId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { logAction } = useAudit()
  const { orgId } = useOrg()

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
        .limit(100)

      if (troupeId && troupeId !== 'all') {
        query = query.eq('troupeid', troupeId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching finance records:", error)
      } else {
        setTransactions(data || [])
      }
    } catch (err) {
      console.error("Unexpected finance error:", err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [troupeId, orgId])

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
          setTransactions(prev => [newRow, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 100))
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
        } else if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTransactions, troupeId, orgId])

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

    const { error } = await supabase
      .from('finance')
      .insert({
        id: generatedId,
        ...sanitizeObject(data),
        troupeid: tid,
        org_id: orgId || data.org_id || null,
        createdat: now
      })

    if (error) throw error
    await logAction('ADD_FINANCE_RECORD', { type: data.type, amount: data.amount, date: data.date })
  }

  const updateTransaction = async (id, data) => {
    // Normalize troupeid: if 'all' or empty, it must be null for the UUID column
    let tid = data.troupeid
    if (tid === undefined) tid = data.troupeId
    if (tid === undefined) tid = troupeId
    
    if (tid === 'all' || tid === '') tid = null

    const { error } = await supabase
      .from('finance')
      .update({
        ...sanitizeObject(data),
        troupeid: tid,
        updatedat: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    await logAction('UPDATE_FINANCE_RECORD', { id, ...data })
  }

  const deleteTransaction = async (id) => {
    const { error } = await supabase
      .from('finance')
      .delete()
      .eq('id', id)

    if (error) throw error
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
