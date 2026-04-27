import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { sanitizeObject } from '../utils/sanitize'

/**
 * useInventory
 * Hook to manage real-time inventory tracking.
 */
export function useInventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch initial inventory
    const fetchInventory = async () => {
      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .limit(200)

      if (fetchError) {
        console.error("Inventory error:", fetchError)
        setError(fetchError)
      } else {
        setItems(data || [])
      }
      setLoading(false)
    }

    fetchInventory()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`inventory-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new])
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
  }, [])

  /**
   * updateQuantity
   * Reads current quantity then updates. Safe for single-user workloads.
   */
  const updateQuantity = async (itemId, delta) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) throw new Error('Item not found')

      const { error } = await supabase
        .from('inventory')
        .update({
          currentQuantity: (item.currentQuantity || 0) + delta,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
    } catch (err) {
      console.error("Failed to update inventory:", err)
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
          currentQuantity: Number(itemData.currentQuantity),
          lowStockThreshold: Number(itemData.lowStockThreshold),
          lastUpdated: new Date().toISOString()
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
          currentQuantity: Number(itemData.currentQuantity) || 0,
          lowStockThreshold: Number(itemData.lowStockThreshold) || 5,
          unit: itemData.unit || 'pcs',
          notes: itemData.notes || '',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
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
    error,
    updateQuantity,
    updateItem,
    addItem,
    deleteItem
  }
}
