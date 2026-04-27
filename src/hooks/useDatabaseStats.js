import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useDatabaseStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch counts for all major tables using head:true for count-only queries
      const [
        itinerariesRes,
        financeRes,
        customersRes,
        troupesRes,
        usersRes,
        stopsRes
      ] = await Promise.all([
        supabase.from('itineraries').select('id', { count: 'exact', head: true }),
        supabase.from('finance').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('troupes').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('stops').select('id', { count: 'exact', head: true })
      ])

      const counts = {
        itineraries: itinerariesRes.count || 0,
        finance: financeRes.count || 0,
        customers: customersRes.count || 0,
        troupes: troupesRes.count || 0,
        members: usersRes.count || 0,
        users: usersRes.count || 0,
        stops: stopsRes.count || 0
      }

      // Total row count
      const totalDocs = Object.values(counts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)

      // Estimated storage in bytes (average 750 bytes per row including indexes)
      const estimatedBytes = totalDocs * 750

      setStats({
        counts,
        totalDocs,
        estimatedBytes,
        lastUpdated: new Date()
      })
    } catch (err) {
      console.error('Error fetching database stats:', err)
      setError('Failed to calculate database statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refresh: fetchStats }
}
