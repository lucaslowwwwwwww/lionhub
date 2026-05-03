import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { sanitizeObject } from '../utils/sanitize'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from '../contexts/OrgContext'

/**
 * useInventory
 * Hook to manage real-time inventory tracking.
 */
export function useInventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const [error, setError] = useState(null)
  const { orgId } = useOrg()
  const itemsRef = useRef([])

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const fetchInventory = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setTimeoutError(false)
    const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

    try {
      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select(TABLES.INVENTORY)
        .eq('org_id', orgId)
        .order('name', { ascending: true })

      if (fetchError) {
        console.error("Inventory error:", fetchError)
        setError(fetchError)
      } else {
        setItems(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected inventory error:", err)
      setError(err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchInventory()

    // Subscribe to realtime changes
    if (!orgId) return

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const channel = supabase
      .channel(`inventory-${orgId}-${safeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInventory, orgId])

  /**
   * updateQuantity
   * Reads current quantity then updates. Safe for single-user workloads.
   */
  const updateQuantity = async (itemId, delta) => {
    // 1. Capture current state for rollback
    const previousItems = [...items]
    const item = previousItems.find(i => i.id === itemId)
    if (!item) return

    const newQty = (item.currentquantity || 0) + delta
    
    // 2. Optimistic Update (Immediate UI response)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, currentquantity: newQty, lastupdated: new Date().toISOString() } : i))

    try {
      // 3. Atomic Database Update (Prevents race conditions)
      const { error } = await supabase.rpc('increment_inventory', { 
        row_id: itemId, 
        amt: delta 
      })

      if (error) {
        console.error("Supabase RPC error:", error)
        setItems(previousItems)
        throw error
      }
    } catch (err) {
      console.error("Failed to update inventory:", err)
      setItems(previousItems)
      throw err
    }
  }

  /**
   * updateItem
   * Updates general item metadata.
   */
  const updateItem = async (itemId, itemData) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          ...sanitizeObject(itemData),
          currentquantity: Number(itemData.currentquantity),
          lowstockthreshold: Number(itemData.lowstockthreshold),
          lastupdated: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
    } catch (err) {
      console.error("Failed to update inventory item:", err)
      throw err
    }
  }

  /**
   * addItem
   * Adds a new item to the inventory table.
   */
  const addItem = async (itemData) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .insert({
          ...sanitizeObject(itemData),
          currentquantity: Number(itemData.currentquantity) || 0,
          lowstockthreshold: Number(itemData.lowstockthreshold) || 5,
          unit: itemData.unit || 'pcs',
          notes: itemData.notes || '',
          org_id: orgId || itemData.org_id || null,
          createdat: new Date().toISOString(),
          lastupdated: new Date().toISOString()
        })

      if (error) throw error
    } catch (err) {
      console.error("Failed to add inventory item:", err)
      throw err
    }
  }

  /**
   * deleteItem
   * Removes an item from the inventory table.
   */
  const deleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)

      if (error) throw error
    } catch (err) {
      console.error("Failed to delete inventory item:", err)
      throw err
    }
  }

  // Group items by category for the UI
  const groupedItems = items.reduce((groups, item) => {
    const category = item.category || 'Uncategorized'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(item)
    return groups
  }, {})

  return {
    items,
    groupedItems,
    loading,
    timeoutError,
    error,
    updateQuantity,
    updateItem,
    addItem,
    deleteItem,
    refresh: fetchInventory
  }
}
