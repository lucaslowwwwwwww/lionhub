import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMembers } from '../../hooks/useMembers'
import { useOrg } from '../../contexts/OrgContext'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../supabase'
import { exportSalaryReportPDF } from '../../utils/exportUtils'
import * as XLSX from 'xlsx'

export default function SalaryCalculator() {
  const { userProfile } = useAuth()
  const { members = [], loading: loadingM } = useMembers()
  const { orgId } = useOrg()
  const { settings } = useSettings()

  // Ensure only 'master' role is allowed (safety redirect fallback, though handled in routes)
  const isMaster = userProfile?.role === 'master'

  // Date Range state: Default to the first day of the current month up to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [checkIns, setCheckIns] = useState([])
  const [loadingC, setLoadingC] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Salary Mode: 'hourly' or 'daily'
  const [rateMode, setRateMode] = useState('hourly') // 'hourly' or 'daily'
  
  // Default general rates
  const [defaultRate, setDefaultRate] = useState(20) // default RM20/hr or RM150/day

  // Customized per-member parameters state: { [memberId]: { rate, bonus, deduction } }
  const [memberAdjustments, setMemberAdjustments] = useState({})

  // Fetch check-ins inside the date range
  const fetchCheckIns = async () => {
    if (!orgId || !startDate || !endDate) return
    setLoadingC(true)
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('org_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)

      if (!error) {
        setCheckIns(data || [])
      }
    } catch (err) {
      console.error('Error fetching check-ins for salary calculation:', err)
    } finally {
      setLoadingC(false)
    }
  }

  useEffect(() => {
    fetchCheckIns()
  }, [orgId, startDate, endDate])

  // Helper: Calculate duration in hours from check_in_at & check_out_at
  const calcCheckInHours = (inIso, outIso, checkInDate) => {
    if (!inIso) return { hours: 0, incomplete: false }
    const start = new Date(inIso).getTime()
    
    let end
    let incomplete = false
    if (outIso) {
      end = new Date(outIso).getTime()
    } else {
      const todayStr = new Date().toISOString().split('T')[0]
      if (checkInDate === todayStr) {
        end = Date.now()
      } else {
        // Past date with no check-out: forgot to check out!
        return { hours: 0, incomplete: true }
      }
    }
    const diffMs = end - start
    if (diffMs <= 0) return { hours: 0, incomplete: false }
    return { hours: diffMs / 3600000, incomplete: !outIso }
  }

  // Pre-aggregate check-ins per member
  const memberStats = useMemo(() => {
    const stats = {}
    checkIns.forEach(c => {
      const mId = c.member_id
      if (!stats[mId]) {
        stats[mId] = {
          daysWorked: 0,
          hoursWorked: 0,
          hasIncomplete: false,
          sessions: []
        }
      }
      const { hours, incomplete } = calcCheckInHours(c.check_in_at, c.check_out_at, c.date)
      stats[mId].daysWorked += 1
      stats[mId].hoursWorked += hours
      if (incomplete) {
        stats[mId].hasIncomplete = true
      }
      stats[mId].sessions.push(c)
    })
    return stats
  }, [checkIns])

  // Set default default rate when mode changes
  useEffect(() => {
    setDefaultRate(rateMode === 'hourly' ? 20 : 150)
  }, [rateMode])

  // Handle setting individual adjustments
  const handleAdjustmentChange = (memberId, field, value) => {
    setMemberAdjustments(prev => {
      const existing = prev[memberId] || { rate: '', bonus: 0, deduction: 0 }
      return {
        ...prev,
        [memberId]: {
          ...existing,
          [field]: value
        }
      }
    })
  }

  // Compute full table list of members with salary details
  const calculatedSalaries = useMemo(() => {
    const rolePriority = { master: 1, admin: 2, member: 3 }
    const activeMembers = [...members]
      .filter(m => m.status !== 'deleted')
      .sort((a, b) => {
        const priorityA = rolePriority[a.role?.toLowerCase()] || 4
        const priorityB = rolePriority[b.role?.toLowerCase()] || 4
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        return (a.displayname || '').localeCompare(b.displayname || '')
      })
    
    return activeMembers.map(m => {
      const stats = memberStats[m.id] || { daysWorked: 0, hoursWorked: 0, hasIncomplete: false }
      const adj = memberAdjustments[m.id] || { rate: '', bonus: '', deduction: '' }

      // Custom rate fallback to global default
      const finalRate = adj.rate !== '' ? Number(adj.rate) : defaultRate
      const bonus = Number(adj.bonus) || 0
      const deduction = Number(adj.deduction) || 0

      let calculatedPay = 0
      if (rateMode === 'hourly') {
        calculatedPay = (stats.hoursWorked * finalRate) + bonus - deduction
      } else {
        calculatedPay = (stats.daysWorked * finalRate) + bonus - deduction
      }

      return {
        member: m,
        daysWorked: stats.daysWorked,
        hoursWorked: stats.hoursWorked,
        hasIncomplete: stats.hasIncomplete,
        rate: finalRate,
        isCustomRate: adj.rate !== '',
        bonus,
        deduction,
        totalPay: Math.max(0, calculatedPay)
      }
    })
  }, [members, memberStats, memberAdjustments, defaultRate, rateMode])

  // Name Search filter
  const filteredSalaries = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) return calculatedSalaries
    return calculatedSalaries.filter(s => {
      const name = (s.member.displayname || s.member.displayName || '').toLowerCase()
      return name.includes(query)
    })
  }, [calculatedSalaries, searchTerm])

  // Summary Metrics
  const summary = useMemo(() => {
    let totalPayout = 0
    let totalHours = 0
    let totalDays = 0
    let participatingCount = 0

    calculatedSalaries.forEach(s => {
      totalPayout += s.totalPay
      totalHours += s.hoursWorked
      totalDays += s.daysWorked
      if (s.daysWorked > 0) participatingCount++
    })

    return {
      totalPayout,
      totalHours,
      totalDays,
      participatingCount
    }
  }, [calculatedSalaries])

  // Export to Excel sheet
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const data = [
      [`SALARY REPORT (${rateMode.toUpperCase()} BASIS)`],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ['#', 'NAME', 'ROLE', 'DAYS WORKED', 'HOURS WORKED', `RATE (RM/${rateMode === 'hourly' ? 'Hr' : 'Day'})`, 'BONUS (RM)', 'DEDUCTION (RM)', 'NET PAY (RM)'],
      ...filteredSalaries.map((s, idx) => [
        idx + 1,
        s.member.displayname || s.member.displayName || '-',
        (s.member.role || 'member').toUpperCase(),
        s.daysWorked,
        Number(s.hoursWorked.toFixed(2)),
        s.rate,
        s.bonus,
        s.deduction,
        Number(s.totalPay.toFixed(2))
      ]),
      [],
      ['', '', '', 'TOTAL DAYS', 'TOTAL HOURS', '', '', 'TOTAL PAYOUT', summary.totalPayout]
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Salary')
    XLSX.writeFile(wb, `SalaryReport_${startDate}_to_${endDate}.xlsx`)
  }

  const handleExportPDF = async () => {
    await exportSalaryReportPDF(filteredSalaries, rateMode, { startDate, endDate }, settings)
  }

  const [selectedMemberLogs, setSelectedMemberLogs] = useState(null)
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newLogCheckIn, setNewLogCheckIn] = useState('09:00')
  const [newLogCheckOut, setNewLogCheckOut] = useState('18:00')
  const [modalActionLoading, setModalActionLoading] = useState(false)

  // Helper to parse ISO into HH:MM string (local timezone)
  const getLocalTimeStr = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const hrs = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${hrs}:${mins}`
  }

  // Helper to construct ISO from date string and HH:MM time string
  const makeIsoString = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null
    return new Date(`${dateStr}T${timeStr}:00`).toISOString()
  }

  // Update a check-in field (e.g. date)
  const handleUpdateLogField = async (logId, field, value) => {
    setModalActionLoading(true)
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ [field]: value })
        .eq('id', logId)

      if (!error) {
        await fetchCheckIns()
        // Refresh local logs in state
        setSelectedMemberLogs(prev => {
          if (!prev) return null
          const updatedLogs = prev.logs.map(l => l.id === logId ? { ...l, [field]: value } : l)
          return { ...prev, logs: updatedLogs }
        })
      }
    } catch (err) {
      console.error('Error updating log field:', err)
    } finally {
      setModalActionLoading(false)
    }
  }

  // Update a check-in time field (requires combining with date)
  const handleUpdateLogTime = async (log, field, timeStr) => {
    setModalActionLoading(true)
    try {
      let isoVal = null
      if (timeStr) {
        isoVal = makeIsoString(log.date, timeStr)
      }
      const { error } = await supabase
        .from('check_ins')
        .update({ [field]: isoVal })
        .eq('id', log.id)

      if (!error) {
        await fetchCheckIns()
        // Refresh local logs in state
        setSelectedMemberLogs(prev => {
          if (!prev) return null
          const updatedLogs = prev.logs.map(l => l.id === log.id ? { ...l, [field]: isoVal } : l)
          return { ...prev, logs: updatedLogs }
        })
      }
    } catch (err) {
      console.error('Error updating log time:', err)
    } finally {
      setModalActionLoading(false)
    }
  }

  // Delete log
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this check-in session?')) return
    setModalActionLoading(true)
    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', logId)

      if (!error) {
        await fetchCheckIns()
        // Refresh local logs in state
        setSelectedMemberLogs(prev => {
          if (!prev) return null
          const updatedLogs = prev.logs.filter(l => l.id !== logId)
          return { ...prev, logs: updatedLogs }
        })
      }
    } catch (err) {
      console.error('Error deleting log:', err)
    } finally {
      setModalActionLoading(false)
    }
  }

  // Add a manual check-in record
  const handleAddManualLog = async () => {
    if (!selectedMemberLogs || !orgId) return
    setModalActionLoading(true)
    try {
      const checkInIso = makeIsoString(newLogDate, newLogCheckIn)
      const checkOutIso = newLogCheckOut ? makeIsoString(newLogDate, newLogCheckOut) : null

      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          org_id: orgId,
          member_id: selectedMemberLogs.member.id,
          date: newLogDate,
          check_in_at: checkInIso,
          check_out_at: checkOutIso
        })
        .select()

      if (!error && data && data[0]) {
        await fetchCheckIns()
        // Append to local modal logs
        setSelectedMemberLogs(prev => {
          if (!prev) return null
          return { ...prev, logs: [...prev.logs, data[0]] }
        })
        // Reset manual inputs
        setNewLogCheckIn('09:00')
        setNewLogCheckOut('18:00')
      }
    } catch (err) {
      console.error('Error adding manual log:', err)
    } finally {
      setModalActionLoading(false)
    }
  }

  if (!isMaster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-crimson-500/10 flex items-center justify-center text-crimson-500 border border-crimson-500/20">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-surface-200 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-surface-500 text-xs font-semibold max-w-xs text-center leading-relaxed">This module is strictly reserved for organizational Masters only.</p>
      </div>
    )
  }

  const loading = loadingM || loadingC

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* ── HEADER & RANGE SELECTION ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-6 shadow-sm backdrop-blur-md">
        <div>
          <span className="text-[10px] font-black text-crimson-500 uppercase tracking-[0.25em]">Accounting & Payroll</span>
          <h1 className="text-2xl font-black text-surface-50 uppercase tracking-tight mt-0.5">Salary Calculator</h1>
          <p className="text-surface-500 text-xs font-semibold mt-1">Calculate and manage payroll distributions based on real-time roster attendance.</p>
        </div>

        {/* Date Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-surface-950 border border-surface-800 rounded-2xl px-4 py-2.5 w-full sm:w-auto">
            <span className="text-[10px] font-black text-surface-500 uppercase tracking-wider">From:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-surface-100 font-bold border-none outline-none focus:ring-0 w-full"
            />
          </div>
          <div className="flex items-center gap-2 bg-surface-950 border border-surface-800 rounded-2xl px-4 py-2.5 w-full sm:w-auto">
            <span className="text-[10px] font-black text-surface-500 uppercase tracking-wider">To:</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-surface-100 font-bold border-none outline-none focus:ring-0 w-full"
            />
          </div>
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-wider">Total Payout</p>
          <p className="text-2xl font-black text-crimson-400 mt-2">RM {summary.totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute top-0 right-0 w-16 h-16 bg-crimson-600/5 rounded-bl-full transition-all group-hover:scale-110" />
        </div>

        <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-wider">Accumulated Hours</p>
          <p className="text-2xl font-black text-violet-400 mt-2">{summary.totalHours.toFixed(1)} hrs</p>
          <div className="absolute top-0 right-0 w-16 h-16 bg-violet-600/5 rounded-bl-full transition-all group-hover:scale-110" />
        </div>

        <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-wider">Total Days Worked</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">{summary.totalDays} sessions</p>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-600/5 rounded-bl-full transition-all group-hover:scale-110" />
        </div>

        <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-wider">Active Personnel</p>
          <p className="text-2xl font-black text-gold-400 mt-2">{summary.participatingCount} members</p>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold-600/5 rounded-bl-full transition-all group-hover:scale-110" />
        </div>
      </div>

      {/* ── CONTROLS & TABLE ── */}
      <div className="bg-surface-900/20 border border-surface-800/50 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
        
        {/* Table Top Toolbar */}
        <div className="p-6 border-b border-surface-800 bg-surface-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input 
                type="text"
                placeholder="Search member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 pl-10 text-sm text-surface-100 font-bold focus:ring-1 focus:ring-crimson-500 outline-none"
              />
              <svg className="w-4 h-4 text-surface-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Mode Selector */}
            <div className="flex bg-surface-950 border border-surface-800 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setRateMode('hourly')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rateMode === 'hourly' ? 'bg-crimson-600 text-white' : 'text-surface-400 hover:text-white'}`}
              >
                Hourly Basis
              </button>
              <button 
                onClick={() => setRateMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rateMode === 'daily' ? 'bg-crimson-600 text-white' : 'text-surface-400 hover:text-white'}`}
              >
                Daily Basis
              </button>
            </div>
          </div>

          {/* Default Rate Config & Export */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 bg-surface-950 border border-surface-800 rounded-xl px-3 py-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-[9px] font-black text-surface-500 uppercase tracking-wider">Default Rate (RM):</span>
              <input 
                type="number"
                value={defaultRate}
                onChange={(e) => setDefaultRate(Math.max(0, Number(e.target.value)))}
                className="w-16 bg-transparent text-sm text-surface-100 font-bold border-none outline-none focus:ring-0 text-center"
              />
            </div>

            <button 
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>

            <button 
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none px-4 py-2 bg-crimson-600 hover:bg-crimson-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-crimson-600/15"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        {/* Live Payroll List (Responsive Views) */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-surface-800 border-t-crimson-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">Aggregating Timesheets...</p>
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="text-center py-20 text-surface-500 text-sm font-bold uppercase tracking-widest">No active personnel found</div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-800 bg-surface-950/40 text-[10px] font-black text-surface-500 uppercase tracking-wider">
                      <th className="px-6 py-4 text-center">#</th>
                      <th className="px-6 py-4">Name & Role</th>
                      <th className="px-6 py-4 text-center">Days Worked</th>
                      <th className="px-6 py-4 text-center">Hours Worked</th>
                      <th className="px-6 py-4 text-center">Rate (RM/{rateMode === 'hourly' ? 'Hr' : 'Day'})</th>
                      <th className="px-6 py-4 text-center">Bonus (RM)</th>
                      <th className="px-6 py-4 text-center">Deduction (RM)</th>
                      <th className="px-6 py-4 text-right">Net Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/40 text-sm">
                    {filteredSalaries.map((s, idx) => {
                      const m = s.member
                      const adj = memberAdjustments[m.id] || { rate: '', bonus: '', deduction: '' }

                      return (
                        <tr key={m.id} className="hover:bg-surface-900/30 transition-colors">
                          <td className="px-6 py-4 text-center text-surface-500 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-surface-100">{m.displayname || m.displayName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                m.role === 'master' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : m.role === 'admin'
                                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                                  : 'bg-crimson-500/10 text-crimson-400 border border-crimson-500/20'
                              }`}>
                                {m.role || 'member'}
                              </span>
                              {s.hasIncomplete && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                                  ⚠️ Incomplete Check-out
                                </span>
                              )}
                              <button 
                                onClick={() => setSelectedMemberLogs({ member: m, logs: checkIns.filter(c => c.member_id === m.id) })}
                                className="px-2 py-0.5 rounded-full bg-crimson-600/10 hover:bg-crimson-600 hover:text-white text-[9px] font-black text-crimson-400 uppercase tracking-wider transition-all border border-crimson-600/20 cursor-pointer flex items-center gap-1"
                              >
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Logs
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-surface-300">
                            {s.daysWorked}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-surface-300">
                            {s.hoursWorked.toFixed(1)}
                          </td>
                          
                          {/* Rate Input */}
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="number"
                              placeholder={`${defaultRate}`}
                              value={adj.rate}
                              onChange={(e) => handleAdjustmentChange(m.id, 'rate', e.target.value)}
                              className={`w-20 bg-surface-950 border rounded-lg px-2 py-1 text-center font-bold text-xs ${
                                s.isCustomRate ? 'border-crimson-500 text-crimson-400' : 'border-surface-800 text-surface-300'
                              }`}
                            />
                          </td>

                          {/* Bonus Input */}
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="number"
                              placeholder="0"
                              value={adj.bonus}
                              onChange={(e) => handleAdjustmentChange(m.id, 'bonus', e.target.value)}
                              className="w-20 bg-surface-950 border border-surface-800 rounded-lg px-2 py-1 text-center font-bold text-xs text-emerald-400"
                            />
                          </td>

                          {/* Deduction Input */}
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="number"
                              placeholder="0"
                              value={adj.deduction}
                              onChange={(e) => handleAdjustmentChange(m.id, 'deduction', e.target.value)}
                              className="w-20 bg-surface-950 border border-surface-800 rounded-lg px-2 py-1 text-center font-bold text-xs text-orange-400"
                            />
                          </td>

                          {/* Total Net Pay */}
                          <td className="px-6 py-4 text-right font-black text-crimson-400">
                            RM {s.totalPay.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Hidden on Desktop) */}
              <div className="block md:hidden divide-y divide-surface-800/40">
                {filteredSalaries.map((s) => {
                  const m = s.member
                  const adj = memberAdjustments[m.id] || { rate: '', bonus: '', deduction: '' }

                  return (
                    <div key={m.id} className="p-4 space-y-4 bg-surface-950/20">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-surface-100 text-sm">{m.displayname || m.displayName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              m.role === 'master' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : m.role === 'admin'
                                ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                                : 'bg-crimson-500/10 text-crimson-400 border border-crimson-500/20'
                            }`}>
                              {m.role || 'member'}
                            </span>
                            {s.hasIncomplete && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                                ⚠️ Incomplete
                              </span>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => setSelectedMemberLogs({ member: m, logs: checkIns.filter(c => c.member_id === m.id) })}
                          className="px-2.5 py-1 rounded-full bg-crimson-600/10 hover:bg-crimson-600 hover:text-white text-[9px] font-black text-crimson-400 uppercase tracking-wider transition-all border border-crimson-600/20 cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Logs
                        </button>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-surface-950/40 border border-surface-800/40 rounded-xl p-3 text-center">
                        <div>
                          <p className="text-[8px] font-black text-surface-500 uppercase tracking-wider">Days Worked</p>
                          <p className="text-xs font-bold text-surface-300 mt-0.5">{s.daysWorked}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-surface-500 uppercase tracking-wider">Hours Worked</p>
                          <p className="text-xs font-bold text-surface-300 mt-0.5">{s.hoursWorked.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-crimson-500 uppercase tracking-wider">Net Payout</p>
                          <p className="text-xs font-black text-crimson-400 mt-0.5">RM {s.totalPay.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Inputs Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider text-center">Rate (RM/{rateMode === 'hourly' ? 'Hr' : 'Day'})</span>
                          <input 
                            type="number"
                            placeholder={`${defaultRate}`}
                            value={adj.rate}
                            onChange={(e) => handleAdjustmentChange(m.id, 'rate', e.target.value)}
                            className={`w-full bg-surface-950 border rounded-lg px-2 py-1 text-center font-bold text-xs ${
                              s.isCustomRate ? 'border-crimson-500 text-crimson-400' : 'border-surface-800 text-surface-300'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider text-center">Bonus (RM)</span>
                          <input 
                            type="number"
                            placeholder="0"
                            value={adj.bonus}
                            onChange={(e) => handleAdjustmentChange(m.id, 'bonus', e.target.value)}
                            className="w-full bg-surface-950 border border-surface-800 rounded-lg px-2 py-1 text-center font-bold text-xs text-emerald-400"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider text-center">Deduct (RM)</span>
                          <input 
                            type="number"
                            placeholder="0"
                            value={adj.deduction}
                            onChange={(e) => handleAdjustmentChange(m.id, 'deduction', e.target.value)}
                            className="w-full bg-surface-950 border border-surface-800 rounded-lg px-2 py-1 text-center font-bold text-xs text-orange-400"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        </div>

      {/* ── TIMESHEET LOGS MODAL (MASTER ONLY) ── */}
      {selectedMemberLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-950 border border-surface-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/10">
              <div>
                <h3 className="text-lg font-black text-surface-5 uppercase tracking-tight">
                  Timesheet Logs
                </h3>
                <p className="text-xs text-surface-500 font-semibold mt-0.5">
                  Managing logs for <span className="text-crimson-400 font-bold">{selectedMemberLogs.member.displayname || selectedMemberLogs.member.displayName}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedMemberLogs(null)}
                className="text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Existing Logs List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-wider">
                  Logged Sessions inside selected range
                </h4>
                {selectedMemberLogs.logs.length === 0 ? (
                  <div className="text-center py-8 text-surface-600 text-xs font-bold uppercase tracking-wider bg-surface-900/20 border border-surface-800/40 rounded-2xl">
                    No active timesheet sessions found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMemberLogs.logs.map(log => (
                      <div key={log.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-900/30 border border-surface-800/50 rounded-2xl p-4">
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          
                          {/* Date input */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider">Date:</span>
                            <input 
                              type="date"
                              value={log.date}
                              onChange={(e) => handleUpdateLogField(log.id, 'date', e.target.value)}
                              className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                            />
                          </div>

                          {/* Check-In input */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider">Check In:</span>
                            <input 
                              type="time"
                              value={getLocalTimeStr(log.check_in_at)}
                              onChange={(e) => handleUpdateLogTime(log, 'check_in_at', e.target.value)}
                              className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                            />
                          </div>

                          {/* Check-Out input */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-surface-500 uppercase tracking-wider">Check Out:</span>
                            <input 
                              type="time"
                              value={getLocalTimeStr(log.check_out_at)}
                              placeholder="Active"
                              onChange={(e) => handleUpdateLogTime(log, 'check_out_at', e.target.value)}
                              className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                            />
                          </div>

                        </div>

                        {/* Delete Session Button */}
                        <button 
                          disabled={modalActionLoading}
                          onClick={() => handleDeleteLog(log.id)}
                          className="px-3 py-1.5 bg-crimson-600/10 hover:bg-crimson-600 hover:text-white text-crimson-400 text-[9px] font-black uppercase tracking-wider rounded-lg border border-crimson-600/20 transition-all cursor-pointer self-stretch sm:self-center flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Manual Log Section */}
              <div className="border-t border-surface-800/60 pt-6 space-y-4">
                <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-wider">
                  Create Manual Timesheet Entry
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Select Date:</span>
                    <input 
                      type="date"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Check In Time:</span>
                    <input 
                      type="time"
                      value={newLogCheckIn}
                      onChange={(e) => setNewLogCheckIn(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Check Out Time:</span>
                    <input 
                      type="time"
                      value={newLogCheckOut}
                      onChange={(e) => setNewLogCheckOut(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 font-bold outline-none focus:ring-1 focus:ring-crimson-500"
                    />
                  </div>
                </div>

                <button 
                  disabled={modalActionLoading}
                  onClick={handleAddManualLog}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Timesheet Entry
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-surface-800 bg-surface-900/10 flex justify-end">
              <button 
                onClick={() => setSelectedMemberLogs(null)}
                className="px-5 py-2 bg-surface-800 hover:bg-surface-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
