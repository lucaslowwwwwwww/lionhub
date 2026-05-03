import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getActualCnyDate } from '../utils/constants'
import { createFetchTimeout, TABLES } from '../utils/fetchHelper'
import { useOrg } from '../contexts/OrgContext'

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalStops: 0,
    completedStops: 0,
    pendingStops: 0,
    skippedStops: 0,

    totalMembers: 0,
    monthlyData: {}, // { 2026: [Jan...Dec], 2025: [...] }
    yearlyData: [],  // [ { day: '2024', revenue: 100... }, { day: '2025'... } ]
    categoryData: { income: [], expense: [] }
  })
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()])
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const { orgId } = useOrg()

  useEffect(() => {
    if (!orgId) return;
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

                let dStop = Math.max(0, Number(data.totalstops) || 0)
                let dComp = Math.max(0, Number(data.completedstops) || 0)
                let dSkip = Math.max(0, Number(data.skippedstops) || 0)

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

    // Process finance into monthly/yearly revenue, expenses, and profit
    const processFinance = (docs) => {
      setStats(prev => {
        const newMonthly = { ...prev.monthlyData }
        const newYearlyMap = {}
        const newCategoryMap = { income: {}, expense: {} }
        let globalTotalRevenue = 0
        let globalTotalExpenses = 0

        Object.keys(newMonthly).forEach(y => {
          newMonthly[y] = newMonthly[y].map(m => ({ ...m, revenue: 0, expenses: 0, profit: 0 }))
        })
        prev.yearlyData.forEach(y => {
          newYearlyMap[y.day] = { ...y, revenue: 0, expenses: 0, profit: 0 }
        })

        docs.forEach(t => {
          const amount = Number(t.amount) || 0
          const isIncome = t.type === 'income' || t.type === 'sponsorship'
          const isExpense = t.type === 'expense'

          if (isIncome) globalTotalRevenue += amount
          if (isExpense) globalTotalExpenses += amount

          let transDate = null
          if (t.date && typeof t.date === 'string') {
            transDate = t.date.startsWith('day') ? getActualCnyDate(t.date) : new Date(t.date)
          }

          if (transDate && !isNaN(transDate.getTime())) {
            const y = transDate.getFullYear()
            const m = transDate.getMonth()

            // Category Aggregation (Income/Expense breakdown)
            const cat = t.category || 'Uncategorized'
            if (isIncome) {
              newCategoryMap.income[cat] = (newCategoryMap.income[cat] || 0) + amount
            } else if (isExpense) {
              newCategoryMap.expense[cat] = (newCategoryMap.expense[cat] || 0) + amount
            }

            if (!newMonthly[y]) {
              newMonthly[y] = MONTHS.map(name => ({ day: name, revenue: 0, expenses: 0, profit: 0, stops: 0, completed: 0 }))
            }
            const targetMonth = { ...newMonthly[y][m] }
            if (isIncome) targetMonth.revenue += amount
            if (isExpense) targetMonth.expenses += amount
            targetMonth.profit = targetMonth.revenue - targetMonth.expenses
            newMonthly[y][m] = targetMonth

            if (!newYearlyMap[y]) {
              newYearlyMap[y] = { day: y.toString(), revenue: 0, expenses: 0, profit: 0, stops: 0, completed: 0 }
            }
            if (isIncome) newYearlyMap[y].revenue += amount
            if (isExpense) newYearlyMap[y].expenses += amount
            newYearlyMap[y].profit = newYearlyMap[y].revenue - newYearlyMap[y].expenses
          }
        })

        // Convert category maps to arrays for charts
        const categoryData = {
          income: Object.entries(newCategoryMap.income).map(([name, value]) => ({ name, value })),
          expense: Object.entries(newCategoryMap.expense).map(([name, value]) => ({ name, value }))
        }

        return {
          ...prev,
          totalRevenue: globalTotalRevenue,
          totalExpenses: globalTotalExpenses,
          netProfit: globalTotalRevenue - globalTotalExpenses,
          monthlyData: newMonthly,
          yearlyData: Object.values(newYearlyMap).sort((a, b) => Number(a.day) - Number(b.day)),
          categoryData
        }
      })
    }

    // Initial fetch all data with safety timeout
    const fetchAll = async () => {
      // Only show loading if we don't have any stats yet
      const hasData = stats.totalStops > 0 || Object.keys(stats.monthlyData).length > 0
      if (!hasData) {
        setLoading(true)
      }
      setTimeoutError(false)

      const timeoutId = createFetchTimeout(setLoading, setTimeoutError)

      try {
        const [itinRes, finRes, troupeRes, memberRes] = await Promise.all([
          supabase.from('itineraries').select(TABLES.ITINERARIES).eq('org_id', orgId).gte('date', startIso),
          supabase.from('finance').select(TABLES.FINANCE).eq('org_id', orgId).gte('date', startIso),
          supabase.from('troupes').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
        ])

        if (itinRes.data) processItineraries(itinRes.data)
        if (finRes.data) processFinance(finRes.data)

        setStats(prev => ({
          ...prev,

          totalMembers: memberRes.count || 0
        }))
      } catch (err) {
        console.error("Unexpected dashboard stats error:", err)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    fetchAll()

    // Realtime subscriptions
    const safeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    
    // Consolidated Realtime subscription
    const dashChannel = supabase
      .channel(`dashboard-updates-${orgId}-${safeId()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries', filter: `org_id=eq.${orgId}` }, async () => {
        const { data } = await supabase.from('itineraries').select(TABLES.ITINERARIES).eq('org_id', orgId).gte('date', startIso)
        if (data) processItineraries(data)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance', filter: `org_id=eq.${orgId}` }, async () => {
        const { data } = await supabase.from('finance').select(TABLES.FINANCE).eq('org_id', orgId).gte('date', startIso)
        if (data) processFinance(data)
      })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `org_id=eq.${orgId}` }, async () => {
        const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
        setStats(prev => ({ ...prev, totalMembers: count || 0 }))
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(dashChannel)
    }
  }, [orgId])

  return { stats, availableYears, loading, timeoutError }
}
