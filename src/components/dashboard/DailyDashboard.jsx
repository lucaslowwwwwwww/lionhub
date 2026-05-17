import { useState, useMemo } from 'react'
import { useItinerary, useAllPerformanceDates } from '../../hooks/useItinerary'
import CountUp from '../common/CountUp'
import { useMembers } from '../../hooks/useMembers'
import { useTroupes } from '../../hooks/useTroupes'
import { useFinance } from '../../hooks/useFinance'
import { getActualCnyDate, getDayInfo } from '../../utils/constants'
import TeamSelectionModal from './TeamSelectionModal'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCheckIn } from '../../hooks/useCheckIn'
import { useOrg } from '../../hooks/useOrg'
import CheckInEditModal from './CheckInEditModal'

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-crimson-500/10 text-crimson-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight mb-2">{title}</h3>
          <p className="text-sm font-bold text-surface-400 uppercase tracking-widest leading-relaxed px-4">{message}</p>
        </div>
        <div className="p-4 bg-surface-950/50 border-t border-surface-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-surface-800 text-[10px] font-black text-surface-300 uppercase tracking-[0.2em] hover:bg-surface-700 transition-all">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3.5 rounded-2xl bg-crimson-600 text-[10px] font-black text-white uppercase tracking-[0.2em] hover:bg-crimson-500 shadow-lg shadow-crimson-600/20 transition-all">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

function ActivateTeamModal({ isOpen, onClose, troupes, activeTroupes, onActivate }) {
  if (!isOpen) return null
  const availableTroupes = troupes.filter(t => !activeTroupes.some(at => at.id === t.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 backdrop-blur-md">
          <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">Deploy New Team</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors p-2 hover:bg-surface-800 rounded-full">✕</button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 px-1">Select a troupe to activate for today</p>
          {availableTroupes.length === 0 ? (
            <div className="py-8 text-center text-surface-400 font-bold bg-surface-950/50 rounded-2xl border-2 border-dashed border-surface-800">
              All troupes are already active.
            </div>
          ) : (
            availableTroupes.map(t => (
              <button 
                key={t.id}
                onClick={() => { onActivate(t.id); onClose(); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-950 border border-surface-800 text-surface-100 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-surface-800 rounded-xl group-hover:bg-brand-500/20 transition-colors text-brand-400">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                   </div>
                   <span className="font-bold">{t.name}</span>
                </div>
                <span className="text-[10px] font-black text-brand-500/50 group-hover:text-brand-500 uppercase tracking-widest">Activate</span>
              </button>
            ))
          )}
        </div>
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/50">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function DailyDashboard({ troupeId: initialTroupeId, isAdmin, readOnly = false }) {
  const { settings } = useSettings()
  const { members, loading: loadingM } = useMembers()
  const { troupes, loading: loadingT } = useTroupes()
  const { orgId } = useOrg()
  const overrides = useMemo(() => settings?.cnyoverrides || {}, [settings?.cnyoverrides])

  const [prevDateKey, setPrevDateKey] = useState(null)
  const [activeTroupeId, setActiveTroupeId] = useState(null)
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCheckIn, setEditingCheckIn] = useState(null)

  const dateRange = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return getDayInfo(d, overrides)
    })
  }, [overrides])

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState(dateRange[0].id)

  const currentActualDate = selectedDay.startsWith('day') 
    ? getActualCnyDate(selectedDay, selectedYear, overrides) 
    : new Date(selectedDay)

  const dateKey = selectedDay.startsWith('day')
    ? `${selectedDay}_${selectedYear}`
    : selectedDay

  const { userProfile } = useAuth()
  const { activeCheckIn, dailyCheckIns, checkIn, checkOut, updateCheckIn, deleteCheckIn } = useCheckIn(dateKey)

  // ISSUE-5: Scope timesheet to active troupe tab
  const filteredCheckIns = useMemo(() => {
    let filtered = dailyCheckIns
    // Non-admins only see their own
    if (!isAdmin) {
      const currentMemberId = userProfile?.id || userProfile?.uid
      filtered = filtered.filter(log => log.member_id === currentMemberId)
    }
    // When a troupe tab is selected, scope timesheet to that troupe
    if (activeTroupeId) {
      filtered = filtered.filter(log => log.troupe_id === activeTroupeId)
    }
    return filtered
  }, [dailyCheckIns, isAdmin, userProfile, activeTroupeId])

  const localIsoDate = currentActualDate.toISOString().split('T')[0]
  const currentDayInfo = getDayInfo(currentActualDate, overrides)

  // ISSUE-3: Determine if selected date is today (for check-in gating)
  const todayIso = new Date().toISOString().split('T')[0]
  const isToday = localIsoDate === todayIso

  const { dateTroupes = {}, allItineraries = [], loading: loadingDates, refresh: refreshDates } = useAllPerformanceDates()
  const { transactions } = useFinance('all')
  const activeTroupesOnDate = useMemo(() => {
    const activeIds = dateTroupes[dateKey] || []
    if (activeIds.length === 0) return []
    
    // Align order with the 'troupes' list which is already sorted alphabetically
    const sortedActive = troupes
      .filter(t => activeIds.includes(t.id))
      .map(t => t.id)

    // Add any orphan IDs (itinerary exists but troupe document was deleted)
    const orphanIds = activeIds.filter(id => !sortedActive.includes(id))
    return [...sortedActive, ...orphanIds]
  }, [dateTroupes, dateKey, troupes])

  const dailyAggregates = useMemo(() => {
    const dayItins = allItineraries.filter(itin => itin.date === dateKey)
    const dayTransactions = transactions.filter(t => t.date === dateKey || t.date === localIsoDate)
    
    const grossRevenue = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const generalExpenses = dayTransactions
      .filter(t => t.type === 'expense' && (t.troupeid === 'all' || !t.troupeid))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const rawTotalStops = dayItins.reduce((sum, itin) => sum + (Number(itin.totalstops) || 0), 0)
    const rawCompletedStops = dayItins.reduce((sum, itin) => sum + (Number(itin.completedstops) || 0), 0)

    return {
      totalStops: Math.max(0, rawTotalStops),
      completedStops: Math.max(0, rawCompletedStops),
      grossRevenue,
      totalExpenses,
      generalExpenses,
      netProfit: grossRevenue - totalExpenses
    }
  }, [allItineraries, transactions, dateKey, localIsoDate])

  const { busyMemberIds } = useMemo(() => {
    const busyIds = new Set()

    allItineraries
      .filter(itin => itin.date === dateKey && itin.troupeid !== activeTroupeId)
      .forEach(itin => {
        const attendanceList = itin.attendance || []
        attendanceList.forEach(memberId => {
          busyIds.add(memberId)
        })
      })

    return {
      busyMemberIds: Array.from(busyIds)
    }
  }, [allItineraries, dateKey, activeTroupeId])

  // Adjust activeTroupeId state in render when dateKey or activeTroupesOnDate changes
  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey)
    if (activeTroupesOnDate.length > 0) {
      setActiveTroupeId(activeTroupesOnDate[0])
    } else {
      setActiveTroupeId(null)
    }
  } else if (activeTroupeId && activeTroupesOnDate.length > 0 && !activeTroupesOnDate.includes(activeTroupeId)) {
    setActiveTroupeId(activeTroupesOnDate[0])
  } else if (!activeTroupeId && activeTroupesOnDate.length > 0) {
    setActiveTroupeId(activeTroupesOnDate[0])
  } else if (activeTroupeId && activeTroupesOnDate.length === 0) {
    setActiveTroupeId(null)
  }

  const handleActivateTroupe = async (tId) => {
    try {
      const troupe = troupes.find(t => t.id === tId)
      const docId = `${dateKey}_${tId}`
      await supabase
        .from('itineraries')
        .upsert({
          id: docId,
          troupeid: tId,
          troupename: troupe?.name || 'Unknown',
          date: dateKey,
          status: 'published',
          attendance: [],
          attendancedetails: {},
          totalstops: 0,
          completedstops: 0,
          skippedstops: 0,
          totalrevenue: 0,
          org_id: orgId,
          createdat: new Date().toISOString()
        })
      setActiveTroupeId(tId)
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
    }
  }

  const troupeIdToUse = activeTroupeId || (isAdmin ? null : initialTroupeId)
  const { itinerary, stops = [], attendance = [], attendanceDetails = {}, loading: loadingI, updateAttendance, createItinerary, deleteFullItinerary } = useItinerary(troupeIdToUse, dateKey)

  const handleDeleteDeployment = async () => {
    try {
      await deleteFullItinerary()
      setActiveTroupeId(null)
      if (refreshDates) await refreshDates()
    } catch {
      alert("Failed to delete deployment")
    }
  }

  const loading = loadingI || loadingM || loadingT || loadingDates

  const getTroupeName = (tid) => {
    const troupe = troupes.find(t => t.id === tid)
    if (troupe) return troupe.name
    // Fallback to denormalized name from itinerary if available
    return itinerary?.troupename || 'Unknown'
  }
  const participatingMembers = members.filter(m => attendance.includes(m.id))

  const userAssignedTroupes = useMemo(() => {
    const memberId = userProfile?.id || userProfile?.uid
    if (!memberId) return []
    return allItineraries
      .filter(itin => itin.date === dateKey && (itin.attendance || []).includes(memberId))
      .map(itin => itin.troupeid)
  }, [allItineraries, dateKey, userProfile])

  const completedStops = stops.filter(s => s.status === 'completed').length
  const totalRevenue = stops
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (Number(s.actualamount) || 0), 0)
  
  const teamExpenses = useMemo(() => {
    if (!activeTroupeId) return 0
    return transactions
      .filter(t => (t.date === dateKey || t.date === localIsoDate) && t.troupeid === activeTroupeId && t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [transactions, dateKey, localIsoDate, activeTroupeId])



  const handlePrevDay = () => {
    const d = new Date(currentActualDate)
    d.setDate(d.getDate() - 1)
    const info = getDayInfo(d, overrides)
    setSelectedDay(info.id)
    setSelectedYear(d.getFullYear())
  }

  const handleNextDay = () => {
    const d = new Date(currentActualDate)
    d.setDate(d.getDate() + 1)
    const info = getDayInfo(d, overrides)
    setSelectedDay(info.id)
    setSelectedYear(d.getFullYear())
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Date Selection Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <button onClick={handlePrevDay} className="p-2 rounded-xl bg-surface-950 border border-surface-800 text-surface-400 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-center sm:text-left min-w-[120px]">
            <p className="text-[10px] font-black text-crimson-500 uppercase tracking-[0.2em]">{currentDayInfo.subLabel || currentActualDate.getFullYear()}</p>
            <h2 className="text-lg font-black text-surface-50 uppercase tracking-tight">{currentDayInfo.label}</h2>
          </div>

          <button onClick={handleNextDay} className="p-2 rounded-xl bg-surface-950 border border-surface-800 text-surface-400 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <div className="flex-1 sm:flex-none min-w-0">
            <input 
              id="daily-date-picker"
              name="selected_date"
              type="date" 
              value={localIsoDate} 
              onChange={(e) => {
                const date = new Date(e.target.value)
                const info = getDayInfo(date, overrides)
                setSelectedYear(date.getFullYear())
                setSelectedDay(info.id)
              }} 
              className="w-full max-w-full bg-surface-950/50 border border-surface-800 rounded-xl px-4 py-2 text-xs font-bold text-crimson-400 focus:outline-none focus:border-crimson-600 transition-all appearance-none" 
            />
          </div>
          {isAdmin && !readOnly && (
            <button onClick={() => setIsActivateModalOpen(true)} className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-all shadow-lg" title="Deploy Team">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
        </div>
      </div>
 
      {/* Real-time Check-In/Check-Out Widget */}
      {userProfile && (
        <div className="bg-surface-900 border border-surface-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">Timesheet Check-In</p>
              <h4 className="text-sm font-black text-surface-100 uppercase mt-0.5">Assigned Daily Support</h4>
            </div>
            {activeCheckIn && (
              <div className="flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Check-In</span>
              </div>
            )}
          </div>

          {activeCheckIn ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-950/40 border border-surface-800/80 p-4 rounded-2xl">
              <div>
                <p className="text-[10px] font-black text-brand-500 uppercase">Currently On</p>
                <p className="text-sm font-black text-surface-100 uppercase mt-1">
                  {troupes.find(t => t.id === activeCheckIn.troupe_id)?.name || 'Deploying Team'}
                </p>
                <p className="text-[10px] text-surface-400 font-bold mt-1">
                  Started at {new Date(activeCheckIn.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={checkOut} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-crimson-600/20 transition-all">
                Check Out
              </button>
            </div>
          ) : !isToday ? (
            <div className="py-4 text-center bg-surface-950/30 rounded-2xl border border-dashed border-surface-800">
              <p className="text-xs text-surface-400 font-bold uppercase tracking-widest">
                Check-in is only available for today's date.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-surface-400 font-bold">Select your assigned team to check in for today:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {userAssignedTroupes.length > 0 ? (
                  userAssignedTroupes.map(tid => {
                    const tName = troupes.find(t => t.id === tid)?.name || 'Unknown Team'
                    return (
                      <button key={tid} onClick={() => checkIn(tid)} className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-500/50 text-left transition-all group">
                        <span className="text-xs font-black text-surface-200 group-hover:text-brand-400 uppercase">{tName}</span>
                        <span className="text-[9px] font-black text-brand-500 uppercase bg-brand-500/10 px-2 py-0.5 rounded-md">Check In</span>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-xs text-surface-400 font-bold col-span-2 py-2">
                    You are not assigned to any team rosters on this date. Please ask an Admin to assemble your roster first.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Operations Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-900/60 border border-surface-800/50 p-3 rounded-2xl text-center shadow-sm">
            <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-1">Assigned</p>
            <p className="text-lg font-black text-surface-100 tracking-tighter"><CountUp end={dailyAggregates.totalStops} /></p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 p-3 rounded-2xl text-center shadow-sm">
            <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-1">Completed</p>
            <p className="text-lg font-black text-green-400 tracking-tighter"><CountUp end={dailyAggregates.completedStops} /></p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 p-3 rounded-2xl text-center shadow-sm">
            <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-1">Pending</p>
            <p className="text-lg font-black text-gold-500 tracking-tighter"><CountUp end={Math.max(0, dailyAggregates.totalStops - dailyAggregates.completedStops)} /></p>
          </div>
        </div>

        {/* Daily Financials Snapshot Card (Status View Only) */}
        {readOnly && (
          <div className="bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.3em]">Daily Financials</p>
                <div className="px-2 py-0.5 bg-surface-800/50 rounded-full border border-surface-700/50">
                  <p className="text-[8px] font-black text-gold-500/80 uppercase tracking-widest">Live Snapshot</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Gross Revenue</span>
                  <span className="text-sm font-black text-green-500 font-numeric">+ RM <CountUp end={dailyAggregates.grossRevenue} decimals={2} /></span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Daily Expenses</span>
                  <span className="text-sm font-black text-crimson-500 font-numeric">- RM <CountUp end={dailyAggregates.totalExpenses} decimals={2} /></span>
                </div>
                {dailyAggregates.generalExpenses > 0 && (
                  <div className="flex justify-between items-baseline px-2 border-l-2 border-surface-800">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider italic">↳ General Costs (All Teams)</span>
                    <span className="text-xs font-bold text-surface-400 font-numeric">- RM <CountUp end={dailyAggregates.generalExpenses} decimals={2} /></span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-surface-800 flex justify-between items-end">
                  <span className="text-sm font-black text-surface-200 uppercase tracking-tight">Net Profit</span>
                  <span className={`text-2xl font-black font-numeric tracking-tighter ${dailyAggregates.netProfit >= 0 ? 'text-surface-50' : 'text-crimson-500'}`}>
                    = RM <CountUp end={dailyAggregates.netProfit} decimals={2} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTroupesOnDate.length > 0 && (
          <div className="flex gap-2 p-1.5 bg-surface-950/50 rounded-2xl border border-surface-800/50 overflow-x-auto no-scrollbar">
            {activeTroupesOnDate.map(tId => {
              const tName = troupes.find(t => t.id === tId)?.name || 
                           allItineraries.find(i => i.date === dateKey && i.troupeid === tId)?.troupename || 
                           'Unknown'
              return (
                <button 
                  key={tId} 
                  onClick={() => setActiveTroupeId(tId)} 
                  className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTroupeId === tId ? 'bg-surface-800 text-brand-400 border border-brand-500/20' : 'text-surface-400 hover:text-surface-300'}`}
                >
                  {tName}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!activeTroupeId && !loading && (
        <div className="bg-surface-900/40 border-2 border-dashed border-surface-800/50 rounded-[2.5rem] p-16 text-center">
           <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6 text-surface-600">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h4 className="text-surface-100 font-black uppercase tracking-tight text-xl">No Operations Active</h4>
           <p className="text-surface-400 text-sm font-bold mt-2 uppercase tracking-widest max-w-sm mx-auto">
             {readOnly ? "No teams have been deployed for this date yet." : `Unlock the power of your troupes by deploying them for ${currentDayInfo.label}.`}
           </p>
           {isAdmin && !readOnly && <button onClick={() => setIsActivateModalOpen(true)} className="mt-8 px-8 py-3.5 rounded-2xl bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 shadow-xl transition-all">Start Deployment</button>}
        </div>
      )}

      {activeTroupeId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
            {readOnly && (
              <>
                <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm">
                  <p className="text-[8px] sm:text-[10px] font-black text-surface-400 uppercase tracking-widest mb-0.5">Route progress</p>
                  <p className="text-base sm:text-3xl font-black text-surface-100 tracking-tight"><CountUp end={stops.length} /> <span className="text-[8px] sm:text-xs text-surface-400">(<CountUp end={completedStops} />)</span></p>
                </div>
                <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm">
                  <p className="text-[8px] sm:text-[10px] font-black text-surface-400 uppercase tracking-widest mb-0.5">Commercial Flow</p>
                  <p className="text-base sm:text-3xl font-black text-gold-500 font-numeric tracking-tight">RM <CountUp end={totalRevenue} /></p>
                </div>
                <div className="bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm">
                  <p className="text-[8px] sm:text-[10px] font-black text-surface-400 uppercase tracking-widest mb-0.5">Team Expenses</p>
                  <p className="text-base sm:text-3xl font-black text-crimson-500 font-numeric tracking-tight">RM <CountUp end={teamExpenses} /></p>
                </div>
              </>
            )}

            <div className={`bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm border-brand-500/10 ${!readOnly ? 'col-span-2 md:col-span-4' : ''}`}>
              <p className="text-[8px] sm:text-[10px] font-black text-surface-400 uppercase tracking-widest mb-0.5">Force Strength</p>
              <p className="text-base sm:text-3xl font-black text-brand-500 tracking-tight"><CountUp end={attendance.length} /></p>
            </div>
          </div>

          <div className="bg-surface-900/40 border border-surface-800/50 rounded-3xl p-4 sm:p-8 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-8">
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-surface-950/50 text-brand-400 rounded-2xl border border-surface-800 shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">{getTroupeName(activeTroupeId)} Personnel</h3>
                  <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest mt-0.5"><CountUp end={participatingMembers.length} /> active for tactical deployment</p>
                </div>
              </div>
              {isAdmin && !readOnly && (
                <div className="flex gap-2">
                  {itinerary && (
                    <button onClick={() => setIsDeleteModalOpen(true)} className="p-3 rounded-2xl bg-surface-950 border border-surface-800 text-surface-400 hover:text-crimson-500 hover:border-crimson-500/50 transition-all shadow-sm" title="Delete Deployment">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <button onClick={() => setIsTeamModalOpen(true)} className="px-6 py-3 rounded-2xl bg-surface-950 border border-surface-800 text-[10px] font-black text-brand-400 uppercase tracking-widest hover:border-brand-500/50 transition-all">Assemble Roster</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {participatingMembers.map(member => {
                const isLiveHere = dailyCheckIns.some(log => log.member_id === member.id && !log.check_out_at && log.troupe_id === activeTroupeId)
                return (
                <div key={member.id} className="px-4 py-3 rounded-2xl bg-surface-950/40 border border-surface-800 flex items-center gap-3 group/member hover:border-brand-500/50 transition-all shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-black text-surface-400 group-hover/member:bg-brand-600 group-hover/member:text-white transition-colors">
                    {(member.displayname || member.displayName)?.charAt(0)}
                  </div>
                  <p className="text-[11px] font-bold text-surface-200 tracking-tight truncate">{member.displayname || member.displayName}</p>
                  {isLiveHere && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" title="Currently Live" />
                  )}
                  {attendanceDetails[member.id] === 'half' && (
                    <span className="text-[8px] font-black text-orange-400 uppercase bg-orange-500/20 px-1.5 py-0.5 rounded ml-auto">Half</span>
                  )}
                </div>
                )
              })}
            </div>

            {/* Live Timesheet Dashboard */}
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-3xl p-6 shadow-sm space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest">Active Operations</p>
                  <h3 className="text-base font-black text-surface-50 uppercase tracking-tight">Daily Timesheet Summary</h3>
                </div>
                <div className="px-3 py-1 bg-surface-950 border border-surface-800 text-surface-400 rounded-full text-[10px] font-bold">
                  {filteredCheckIns.length} recorded segments
                </div>
              </div>

              {filteredCheckIns.length > 0 ? (
                <div className="divide-y divide-surface-800/30">
                  {Object.values(
                    filteredCheckIns.reduce((acc, log) => {
                      const memberId = log.member_id
                      const mName = log.member?.displayname || 'Unknown Member'
                      if (!acc[memberId]) {
                        acc[memberId] = {
                          name: mName,
                          sessions: [],
                          totalHrs: 0,
                          isCurrentlyCheckedIn: false,
                          activeTroupe: null
                        }
                      }

                      const start = new Date(log.check_in_at)
                      const end = log.check_out_at ? new Date(log.check_out_at) : new Date()
                      const diffHrs = (end - start) / 3600000
                      
                      acc[memberId].sessions.push({
                        id: log.id,
                        team: log.troupe?.name || 'Assigned Team',
                        checkIn: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        checkOut: log.check_out_at ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Present',
                        hrs: diffHrs,
                        isLive: !log.check_out_at
                      })

                      acc[memberId].totalHrs += diffHrs
                      if (!log.check_out_at) {
                        acc[memberId].isCurrentlyCheckedIn = true
                        acc[memberId].activeTroupe = log.troupe?.name
                      }

                      return acc
                    }, {})
                  ).map((mRecord, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-surface-100">{mRecord.name}</p>
                          {mRecord.isCurrentlyCheckedIn && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[8px] font-black uppercase rounded-full tracking-widest animate-pulse">
                              🟢 Live on {mRecord.activeTroupe}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {mRecord.sessions.map((sess, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1">
                              <div className="px-2 py-1 bg-surface-950 border border-surface-800 rounded-lg text-[9px] font-bold text-surface-400">
                                <span className="text-surface-400">{sess.team}:</span> {sess.checkIn} - {sess.checkOut} ({sess.hrs.toFixed(1)}h)
                              </div>
                              {isAdmin && !readOnly && (
                                <button 
                                  onClick={() => setEditingCheckIn(filteredCheckIns.find(c => c.id === sess.id))}
                                  className="p-1 text-surface-400 hover:text-brand-400 hover:bg-surface-800 rounded-md transition-all"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Total Worked</p>
                        <p className="text-lg font-black text-brand-400 tracking-tighter mt-0.5">
                          {mRecord.totalHrs.toFixed(1)} hrs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-surface-950/20 rounded-2xl border border-dashed border-surface-800 text-xs font-bold text-surface-400 uppercase tracking-widest">
                  No check-ins registered for today.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <TeamSelectionModal 
        isOpen={isTeamModalOpen} 
        onClose={() => setIsTeamModalOpen(false)} 
        selectedMemberIds={attendance} 
        currentAttendanceDetails={attendanceDetails}
        onSave={async (ids, details) => {
          let targetItinId = itinerary?.id
          if (!targetItinId && activeTroupeId) {
            const troupe = troupes.find(t => t.id === activeTroupeId)
            targetItinId = await createItinerary({ troupename: troupe?.name || 'Unknown' })
          }
          await updateAttendance(ids, details, targetItinId)
        }} 
        busyMemberIds={busyMemberIds} 
      />
      <ActivateTeamModal isOpen={isActivateModalOpen} onClose={() => setIsActivateModalOpen(false)} troupes={troupes} activeTroupes={activeTroupesOnDate} onActivate={handleActivateTroupe} />
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteDeployment}
        title="Delete Deployment"
        message={`This will remove the deployment for ${getTroupeName(activeTroupeId)}, including all stops and assignments for today.`}
      />
      <CheckInEditModal 
        isOpen={!!editingCheckIn} 
        onClose={() => setEditingCheckIn(null)} 
        checkInRecord={editingCheckIn}
        onSave={updateCheckIn}
        onDelete={deleteCheckIn}
      />
    </div>
  )
}
