import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAudit } from './useAudit'
import { sanitizeObject } from '../utils/sanitize'

export function useFinance(troupeId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const { logAction } = useAudit()

  useEffect(() => {
    const fetchTransactions = async () => {
      let query = supabase
        .from('finance')
        .select('*')
        .order('date', { ascending: false })
        .limit(100)

      if (troupeId && troupeId !== 'all') {
        query = query.eq('troupeId', troupeId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching finance records:", error)
      } else {
        setTransactions(data || [])
      }
      setLoading(false)
    }

    fetchTransactions()

    // Subscribe to realtime changes
    // CRITICAL: .on() MUST come before .subscribe()
    const channelName = `finance-${crypto.randomUUID()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new
          // Apply troupeId filter for realtime events
          if (troupeId && troupeId !== 'all' && newRow.troupeId !== troupeId) return
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
  }, [troupeId])

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
    const { error } = await supabase
      .from('finance')
      .insert({
        ...sanitizeObject(data),
        troupeId: data.troupeId || troupeId,
        createdAt: new Date().toISOString()
      })

    if (error) throw error
    logAction('ADD_FINANCE_RECORD', { type: data.type, amount: data.amount, date: data.date })
  }

  const updateTransaction = async (id, data) => {
    const { error } = await supabase
      .from('finance')
      .update({
        ...sanitizeObject(data),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    logAction('UPDATE_FINANCE_RECORD', { id, ...data })
  }

  const deleteTransaction = async (id) => {
    const { error } = await supabase
      .from('finance')
      .delete()
      .eq('id', id)

    if (error) throw error
    logAction('DELETE_FINANCE_RECORD', { id })
  }

  return { transactions, loading, stats, addTransaction, updateTransaction, deleteTransaction }
}
