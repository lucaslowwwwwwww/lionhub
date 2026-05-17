import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useFinance } from '../../hooks/useFinance'
import { useTroupes } from '../../hooks/useTroupes'
import { useAllPerformanceDates } from '../../hooks/useItinerary'
import { AddTransactionModal } from './FinanceModals'
import CountUp from '../common/CountUp'
import { exportFinancePDF, exportFinanceExcel } from '../../utils/exportUtils'
import { useSettings } from '../../hooks/useSettings'

export default function FinancePage() {
  const { userProfile } = useAuth()
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)
  const troupeid = isAdmin ? 'all' : (userProfile?.troupeid || 'DEMO_TROUPE')
  const { transactions, loading: loadingF, timeoutError, addTransaction, deleteTransaction, updateTransaction } = useFinance(troupeid)
  const { troupes, loading: loadingT } = useTroupes()
  const { dateTroupes = {}, loading: loadingD } = useAllPerformanceDates()
  const { settings } = useSettings()
  
  const loading = loadingF || loadingT || loadingD
  
  const [filter, setFilter] = useState('all') // 'all', 'income', 'expense', 'sponsorship'
  const [period, setPeriod] = useState('all') // 'all', 'daily', 'monthly', 'yearly'
  
  // Custom period selection states
  const now = new Date()
  const localDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(localDateStr)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [startDate, setStartDate] = useState(localDateStr)
  const [endDate, setEndDate] = useState(localDateStr)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20) // 20, 40, 60, 80, 100, 'all'

  const isMaster = userProfile?.role === 'master'

  // Helper to check if a date string matches a period
  const matchesPeriod = useCallback((dateStr, targetPeriod) => {
    if (targetPeriod === 'all') return true
    const date = new Date(dateStr)
    
    if (targetPeriod === 'daily') {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const [y, m, d] = selectedDate.split('-').map(Number)
      const pickedDate = new Date(y, m - 1, d)
      return targetDate.getTime() === pickedDate.getTime()
    }
    if (targetPeriod === 'monthly') {
      return date.getMonth() === Number(selectedMonth) && date.getFullYear() === Number(selectedYear)
    }
    if (targetPeriod === 'yearly') {
      return date.getFullYear() === Number(selectedYear)
    }
    if (targetPeriod === 'custom') {
      const transTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const [sy, sm, sd] = startDate.split('-').map(Number)
      const startMs = new Date(sy, sm - 1, sd).getTime()
      const [ey, em, ed] = endDate.split('-').map(Number)
      const endMs = new Date(ey, em - 1, ed).getTime()
      return transTime >= startMs && transTime <= endMs
    }
    return true
  }, [selectedDate, selectedMonth, selectedYear, startDate, endDate])

  const filteredTransactions = useMemo(() => {
    let result = transactions
    if (filter !== 'all') {
      result = result.filter(t => t.type === filter)
    }
    if (period !== 'all') {
      result = result.filter(t => matchesPeriod(t.date, period))
    }
    return result
  }, [transactions, filter, period, matchesPeriod])

  // Reset to first page when filters change (moved out of useMemo)
  useEffect(() => {
    setTimeout(() => {
      setCurrentPage(1)
    }, 0)
  }, [filter, period, selectedDate, selectedMonth, selectedYear, startDate, endDate])

  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') return filteredTransactions
    const start = (currentPage - 1) * Number(pageSize)
    const end = start + Number(pageSize)
    return filteredTransactions.slice(start, end)
  }, [filteredTransactions, currentPage, pageSize])

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1
    return Math.ceil(filteredTransactions.length / Number(pageSize)) || 1
  }, [filteredTransactions, pageSize])

  const periodStats = useMemo(() => {
    const periodTransactions = period === 'all' ? transactions : transactions.filter(t => matchesPeriod(t.date, period))
    
    return periodTransactions.reduce((acc, t) => {
      const amount = Number(t.amount) || 0
      if (t.type === 'income') {
        acc.totalIncome += amount
        acc.balance += amount
      } else if (t.type === 'sponsorship') {
        acc.totalSponsorship += amount
        acc.balance += amount
      } else {
        acc.totalExpenses += amount
        acc.balance -= amount
      }
      return acc
    }, { balance: 0, totalIncome: 0, totalExpenses: 0, totalSponsorship: 0 })
  }, [transactions, period, matchesPeriod])

  const confirmDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteTransaction(id)
      } catch (err) {
        console.error("An error occurred")
        alert("Failed to delete record: " + (err.message || "Unknown error"))
      }
    }
  }

  const handleEdit = (t) => {
    setEditingTransaction(t)
    setIsModalOpen(true)
  }

  const handleSave = async (data) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data)
    } else {
      await addTransaction(data)
    }
    setEditingTransaction(null)
  }

  const getPeriodLabel = () => {
    if (period === 'all') return 'All Time'
    if (period === 'daily') return new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    if (period === 'monthly') return `${['January','February','March','April','May','June','July','August','September','October','November','December'][selectedMonth]} ${selectedYear}`
    if (period === 'yearly') return `${selectedYear}`
    if (period === 'custom') {
      const s = new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      const e = new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      return s === e ? s : `${s} — ${e}`
    }
    return 'All Time'
  }

  const handleExportPDF = async () => {
    setIsExportOpen(false)
    await exportFinancePDF(filteredTransactions, periodStats, settings, { periodLabel: getPeriodLabel() })
  }

  const handleExportExcel = () => {
    setIsExportOpen(false)
    exportFinanceExcel(filteredTransactions, periodStats, { periodLabel: getPeriodLabel() })
  }


  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-crimson-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {timeoutError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-bold">Slow connection detected</p>
            <p className="text-amber-500/70 text-xs font-medium">The system took longer than expected to fetch records. Some data might be missing. Try refreshing.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-800 pb-8">
        <div>
          <h1 className="text-3xl font-black text-surface-50 tracking-tight">Finance Records</h1>
          <p className="text-surface-500 text-sm mt-1 font-medium">Manage club income, expenses, and strategic budget.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setEditingTransaction(null)
              setIsModalOpen(true)
            }}
            className="hidden md:flex items-center justify-center gap-2 px-6 py-3.5 bg-crimson-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-crimson-500 shadow-lg shadow-crimson-500/20 transition-all shrink-0"
          >
            <svg className="w-5 h-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Record Transaction
          </button>

          {isMaster && (
            <div className="relative hidden md:block">
              <button 
                onClick={() => setIsExportOpen(!isExportOpen)} 
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export
              </button>
              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl overflow-hidden w-48 animate-fade-in">
                    <button onClick={handleExportPDF} className="w-full px-4 py-3 text-left text-[10px] font-black text-surface-200 uppercase tracking-widest hover:bg-surface-800 flex items-center gap-3 transition-colors">
                      <svg className="w-4 h-4 text-crimson-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Export PDF
                    </button>
                    <button onClick={handleExportExcel} className="w-full px-4 py-3 text-left text-[10px] font-black text-surface-200 uppercase tracking-widest hover:bg-surface-800 flex items-center gap-3 transition-colors border-t border-surface-800">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Export Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Section - Responsive */}
      <div className="space-y-6">
        {/* Unified Card (Mobile) */}
        <div className="md:hidden bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-800 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 border-b-4 border-surface-800/80 group transition-all duration-500">
          <div className="p-8 pb-6 text-center">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.4em] mb-2">Total Available Balance</p>
            <p className={`text-4xl font-black tracking-tighter ${periodStats.balance >= 0 ? 'text-surface-100' : 'text-crimson-500'}`}>
              <CountUp end={periodStats.balance} prefix="RM " decimals={2} />
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${periodStats.balance >= 0 ? 'bg-green-500 animate-pulse' : 'bg-crimson-500'}`}></div>
              <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">{period === 'all' ? 'All Time' : 'Current Period'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 border-t border-surface-800 bg-surface-950/30">
            <div className="p-4 text-center border-r border-surface-800">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Income</p>
              <p className="text-sm font-black text-green-400 tracking-tight">
                <CountUp end={periodStats.totalIncome} prefix="RM" decimals={2} />
              </p>
            </div>
            <div className="p-4 text-center border-r border-surface-800">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Spons</p>
              <p className="text-sm font-black text-indigo-400 tracking-tight">
                <CountUp end={periodStats.totalSponsorship} prefix="RM" decimals={2} />
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Costs</p>
              <p className="text-sm font-black text-crimson-500 tracking-tight">
                <CountUp end={periodStats.totalExpenses} prefix="RM" decimals={2} />
              </p>
            </div>
          </div>
        </div>

      {/* Summary Grid (Responsive Layout) */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-surface-900 border border-surface-800 p-6 rounded-3xl shadow-card group hover:border-crimson-500/30 transition-all">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-2 group-hover:text-crimson-400/70 transition-colors">
            {period === 'all' ? 'Overall Balance' : 'Period Balance'}
          </p>
          <p className={`text-2xl font-black tracking-tight ${periodStats.balance >= 0 ? 'text-surface-50' : 'text-crimson-500'}`}>
            <CountUp end={periodStats.balance} prefix="RM " decimals={2} />
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${periodStats.balance >= 0 ? 'bg-green-500 animate-pulse' : 'bg-crimson-500'}`}></div>
            <span className="text-[10px] font-bold text-surface-600 uppercase tracking-widest">
              {period === 'all' ? 'Total Available' : 'Current Period'}
            </span>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 p-6 rounded-3xl shadow-card group hover:border-green-500/30 transition-all">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-2 group-hover:text-green-400/70 transition-colors">Income</p>
          <p className="text-2xl font-black text-green-400 tracking-tight">
            <CountUp end={periodStats.totalIncome} prefix="RM " decimals={2} />
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-green-500/40 text-[10px] font-bold uppercase tracking-widest">Performance</div>
        </div>

        <div className="bg-surface-900 border border-surface-800 p-6 rounded-3xl shadow-card group hover:border-indigo-500/30 transition-all">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-2 group-hover:text-indigo-400/70 transition-colors">Sponsorship</p>
          <p className="text-2xl font-black text-indigo-400 tracking-tight">
            <CountUp end={periodStats.totalSponsorship} prefix="RM " decimals={2} />
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-indigo-500/40 text-[10px] font-bold uppercase tracking-widest">Strategic Funding</div>
        </div>

        <div className="bg-surface-900 border border-surface-800 p-6 rounded-3xl shadow-card group hover:border-crimson-500/30 transition-all">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-2 group-hover:text-crimson-400/70 transition-colors">Expenses</p>
          <p className="text-2xl font-black text-crimson-500 tracking-tight">
            <CountUp end={periodStats.totalExpenses} prefix="RM " decimals={2} />
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-crimson-500/40 text-[10px] font-bold uppercase tracking-widest">Operating Cost</div>
        </div>
      </div>
    </div>

      {/* Record Button (Mobile Only) */}
      <div className="md:hidden px-1 space-y-2">
        <button
          onClick={() => {
            setEditingTransaction(null)
            setIsModalOpen(true)
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-crimson-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-crimson-500 shadow-xl shadow-crimson-900/20 transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Record Transaction
        </button>
        {isMaster && (
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 shadow-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDF
            </button>
            <button onClick={handleExportExcel} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-500 shadow-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Excel
            </button>
          </div>
        )}
      </div>

      {/* Filters & List */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl md:rounded-[32px] overflow-hidden shadow-card">
        <div className="px-5 py-5 border-b border-surface-800/50 bg-surface-900/50 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em]">Activity</h3>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-950/50 rounded-xl border border-surface-800/50">
                <span className="text-[8px] font-black text-surface-600 uppercase tracking-widest">Show</span>
                <select 
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value
                    setPageSize(val === 'all' ? 'all' : Number(val))
                    setCurrentPage(1)
                  }}
                  className="bg-transparent text-[9px] font-black text-gold-400 uppercase tracking-widest outline-none cursor-pointer focus:text-gold-300 transition-colors appearance-none pr-4 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23fbbf24%22%20stroke-width%3D%223%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_0.6rem] bg-right-center bg-no-repeat"
                >
                  {[20, 40, 60, 80, 100].map(size => (
                    <option key={size} value={size} className="bg-surface-900 text-surface-200">{size}</option>
                  ))}
                  <option value="all" className="bg-surface-900 text-surface-200">All</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-950/50 rounded-full border border-surface-800/50">
               <div className="w-1 h-1 rounded-full bg-gold-400 animate-pulse"></div>
               <span className="text-[8px] font-black text-surface-400 uppercase tracking-widest whitespace-nowrap">
                 {period === 'all' ? 'All Time' : 
                  period === 'daily' ? `${new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` :
                  period === 'monthly' ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth]} ${selectedYear}` :
                  period === 'yearly' ? `${selectedYear}` :
                  startDate === endDate ? `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` :
                  `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
               </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Horizontal Pill Filters - Period */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
              {['all', 'daily', 'monthly', 'yearly', 'custom'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                    period === p 
                      ? 'bg-surface-800 text-gold-400 border-gold-500/30' 
                      : 'bg-surface-950 border-surface-800 text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom Range Selector - Inline & Compact */}
            {period !== 'all' && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
                {period === 'daily' && (
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                  />
                )}
                
                {period === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {period === 'yearly' && (
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}

                {period === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                    />
                    <span className="text-[9px] text-surface-500 font-bold uppercase tracking-widest">TO</span>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-full px-4 py-1.5 text-[9px] font-black text-surface-200 focus:outline-none focus:border-crimson-600 transition-all uppercase tracking-widest h-8"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Type Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
              {['all', 'income', 'sponsorship', 'expense'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                    filter === t 
                      ? (t === 'income' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                         t === 'sponsorship' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                         t === 'expense' ? 'bg-crimson-500/10 text-crimson-400 border-crimson-500/30' :
                         'bg-surface-800 text-gold-400 border-gold-500/30')
                      : 'bg-surface-950 border-surface-800 text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-950/30">
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-surface-500 font-medium">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-sm">No transaction records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-800/30 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-surface-200">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1.5 rounded-lg bg-surface-950 text-[10px] font-black uppercase tracking-widest text-surface-400 border border-surface-800">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-surface-400 font-medium max-w-xs truncate">{t.description || '-'}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider whitespace-nowrap ${t.paymentmethod === 'Bank In' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-surface-800 text-surface-400 border border-surface-700/50'}`}>
                        {t.paymentmethod || 'Cash'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className={`text-sm font-black ${
                        t.type === 'income' ? 'text-green-400' : 
                        t.type === 'sponsorship' ? 'text-indigo-400' :
                        'text-crimson-500'
                      }`}>
                        {t.type === 'expense' ? '-' : '+'} RM {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 transition-opacity">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-gold-400 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => confirmDelete(t.id)}
                          className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-crimson-500 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-surface-800/50">
          {paginatedTransactions.length === 0 ? (
            <div className="px-6 py-20 text-center text-surface-500 font-medium">
              <div className="flex flex-col items-center gap-3 opacity-20">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No transaction records found.</p>
              </div>
            </div>
          ) : (
            paginatedTransactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 active:bg-surface-800/50 transition-colors">
                {/* Banking Style Icon */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-surface-800/50 ${
                  t.type === 'income' ? 'bg-green-500/10 text-green-400' : 
                  t.type === 'sponsorship' ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-crimson-500/10 text-crimson-500'
                }`}>
                   {t.type === 'income' || t.type === 'sponsorship' ? (
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                   ) : (
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                   )}
                </div>

                {/* Left: Info Stack */}
                <div className="flex-1 min-w-0 py-0.5">
                  <h4 className="text-[11px] font-black text-surface-100 uppercase tracking-wide truncate">{t.category}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[9px] text-surface-500 font-bold uppercase tracking-widest shrink-0">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>
                    <div className="w-0.5 h-0.5 rounded-full bg-surface-800" />
                    <p className="text-[9px] text-surface-500 truncate lowercase tracking-tight">
                      {t.description || 'No description'}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="text-right shrink-0 px-1">
                  <p className={`text-sm font-black tracking-tighter ${
                    t.type === 'income' ? 'text-green-400' : 
                    t.type === 'sponsorship' ? 'text-indigo-400' :
                    'text-crimson-500'
                  }`}>
                    {t.type === 'expense' ? '-' : '+'} {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex justify-end gap-1 mt-0.5">
                    <button onClick={() => handleEdit(t)} className="p-1 rounded text-surface-600 hover:text-gold-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => confirmDelete(t.id)} className="p-1 rounded text-surface-600 hover:text-crimson-500"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {pageSize !== 'all' && filteredTransactions.length > pageSize && (
          <div className="px-6 py-4 bg-surface-950/20 border-t border-surface-800/50 flex items-center justify-between gap-4">
            <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest hidden sm:block">
              Showing <span className="text-surface-400">{Math.min(filteredTransactions.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="text-surface-400">{Math.min(filteredTransactions.length, currentPage * pageSize)}</span> of <span className="text-surface-400">{filteredTransactions.length}</span> records
            </p>
            
            <div className="flex items-center gap-1 ml-auto">
              <button 
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-gold-400 disabled:opacity-30 disabled:hover:text-surface-400 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              
              <div className="flex items-center px-4 py-2 bg-surface-900 border border-surface-800 rounded-xl">
                <span className="text-[10px] font-black text-gold-400 uppercase tracking-widest">Page {currentPage}</span>
                <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest mx-2">of</span>
                <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{totalPages}</span>
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-gold-400 disabled:opacity-30 disabled:hover:text-surface-400 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddTransactionModal 
          key={editingTransaction?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingTransaction(null)
          }}
          onSave={handleSave}
          initialData={editingTransaction}
          troupes={troupes}
          dateTroupes={dateTroupes}
          transactions={transactions}
        />
      )}
    </div>
  )
}
