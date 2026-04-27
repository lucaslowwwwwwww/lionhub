import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getActualCnyDate } from '../utils/constants'

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalStops: 0,
    completedStops: 0,
    pendingStops: 0,
    skippedStops: 0,
    activeTroupes: 0,
    totalMembers: 0,
    monthlyData: {}, // { 2026: [Jan...Dec], 2025: [...] }
    yearlyData: [],  // [ { day: '2024', revenue: 100... }, { day: '2025'... } ]
  })
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 2
    const startIso = `${startYear}-01-01`
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Process itineraries into monthly/yearly stats
    const processItineraries = (docs) => {
      setStats(prev => {
        const yearSet = new Set([currentYear])
        const newMonthly = { ...prev.monthlyData }
        const newYearlyMap = {}

        // Reset stop counts
        Object.keys(newMonthly).forEach(y => {
          newMonthly[y] = newMonthly[y].map(m => ({ ...m, stops: 0, completed: 0 }))
          yearSet.add(Number(y))
        })
        prev.yearlyData.forEach(y => {
          newYearlyMap[y.day] = { ...y, stops: 0, completed: 0 }
          yearSet.add(Number(y.day))
        })

        let totalStops = 0
        let completedStops = 0
        let skippedStops = 0

        docs.forEach(data => {
          const dateStr = data.date
          if (dateStr && typeof dateStr === 'string') {
            try {
              const dateObj = dateStr.startsWith('day') ? getActualCnyDate(dateStr) : new Date(dateStr)
              if (dateObj && !isNaN(dateObj.getTime())) {
                const y = dateObj.getFullYear()
                const m = dateObj.getMonth()
                yearSet.add(y)

                let dStop = Math.max(0, Number(data.totalStops) || 0)
                let dComp = Math.max(0, Number(data.completedStops) || 0)
                let dSkip = Math.max(0, Number(data.skippedStops) || 0)

                if (y === currentYear) {
                  totalStops += dStop
                  completedStops += dComp
                  skippedStops += dSkip
                }

                if (!newMonthly[y]) {
                  newMonthly[y] = MONTHS.map(name => ({ day: name, revenue: 0, stops: 0, completed: 0 }))
                }
                const targetMonth = { ...newMonthly[y][m] }
                targetMonth.stops += dStop
                targetMonth.completed += dComp
                newMonthly[y][m] = targetMonth

                if (!newYearlyMap[y]) {
                  newYearlyMap[y] = { day: y.toString(), revenue: 0, stops: 0, completed: 0 }
                }
                newYearlyMap[y].stops += dStop
                newYearlyMap[y].completed += dComp
              }
            } catch (e) {
              console.error('Error processing itinerary date:', e)
            }
          }
        })

        setAvailableYears(Array.from(yearSet).sort((a, b) => b - a))
        const pendingStops = Math.max(0, totalStops - completedStops - skippedStops)

        return {
          ...prev,
          totalStops: Math.max(0, totalStops),
          completedStops: Math.max(0, completedStops),
          skippedStops: Math.max(0, skippedStops),
          pendingStops,
          monthlyData: newMonthly,
          yearlyData: Object.values(newYearlyMap).sort((a, b) => Number(a.day) - Number(b.day))
        }
      })
    }

    // Process finance into monthly/yearly revenue
    const processFinance = (docs) => {
      setStats(prev => {
        const newMonthly = { ...prev.monthlyData }
        const newYearlyMap = {}
        let globalTotalRevenue = 0

        Object.keys(newMonthly).forEach(y => {
          newMonthly[y] = newMonthly[y].map(m => ({ ...m, revenue: 0 }))
        })
        prev.yearlyData.forEach(y => {
          newYearlyMap[y.day] = { ...y, revenue: 0 }
        })

        docs.forEach(t => {
          if (t.type !== 'income') return
          const amount = Number(t.amount) || 0
          globalTotalRevenue += amount

          let transDate = null
          if (t.date && typeof t.date === 'string') {
            transDate = t.date.startsWith('day') ? getActualCnyDate(t.date) : new Date(t.date)
          }

          if (transDate && !isNaN(transDate.getTime())) {
            const y = transDate.getFullYear()
            const m = transDate.getMonth()

            if (!newMonthly[y]) {
              newMonthly[y] = MONTHS.map(name => ({ day: name, revenue: 0, stops: 0, completed: 0 }))
            }
            const targetMonth = { ...newMonthly[y][m] }
            targetMonth.revenue += amount
            newMonthly[y][m] = targetMonth

            if (!newYearlyMap[y]) {
              newYearlyMap[y] = { day: y.toString(), revenue: 0, stops: 0, completed: 0 }
            }
            newYearlyMap[y].revenue += amount
          }
        })

        return {
          ...prev,
          totalRevenue: globalTotalRevenue,
          monthlyData: newMonthly,
          yearlyData: Object.values(newYearlyMap).sort((a, b) => Number(a.day) - Number(b.day))
        }
      })
    }

    // Initial fetch all data
    const fetchAll = async () => {
      const [itinRes, finRes, troupeRes, memberRes] = await Promise.all([
        supabase.from('itineraries').select('*').gte('date', startIso),
        supabase.from('finance').select('*').gte('date', startIso),
        supabase.from('troupes').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true })
      ])

      if (itinRes.data) processItineraries(itinRes.data)
      if (finRes.data) processFinance(finRes.data)

      setStats(prev => ({
        ...prev,
        activeTroupes: troupeRes.count || 0,
        totalMembers: memberRes.count || 0
      }))
      setLoading(false)
    }

    fetchAll()

    // Realtime subscriptions
    const itinChannel = supabase
      .channel(`dash-itin-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries' }, async () => {
        const { data } = await supabase.from('itineraries').select('*').gte('date', startIso)
        if (data) processItineraries(data)
      })
      .subscribe()

    const finChannel = supabase
      .channel(`dash-fin-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance' }, async () => {
        const { data } = await supabase.from('finance').select('*').gte('date', startIso)
        if (data) processFinance(data)
      })
      .subscribe()

    const troupeChannel = supabase
      .channel(`dash-troupes-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'troupes' }, async () => {
        const { count } = await supabase.from('troupes').select('id', { count: 'exact', head: true })
        setStats(prev => ({ ...prev, activeTroupes: count || 0 }))
      })
      .subscribe()

    const memberChannel = supabase
      .channel(`dash-members-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
        const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
        setStats(prev => ({ ...prev, totalMembers: count || 0 }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(itinChannel)
      supabase.removeChannel(finChannel)
      supabase.removeChannel(troupeChannel)
      supabase.removeChannel(memberChannel)
    }
  }, [])

  return { stats, availableYears, loading }
}
