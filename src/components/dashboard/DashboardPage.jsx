import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import MasterDashboard from './MasterDashboard'
import DailyDashboard from './DailyDashboard'
import { getChineseZodiac } from '../../utils/constants'
import { useSettings } from '../../hooks/useSettings'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const { settings } = useSettings()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const { stats, availableYears, loading, timeoutError } = useDashboardStats()
  const { pathname } = useLocation()

  const troupeId = userProfile?.troupeid || 'DEMO_TROUPE'
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)
  
  const getActiveView = () => {
    if (pathname.includes('/dashboard/status')) return 'status'
    if (pathname.includes('/assignment')) return 'assignment'
    if (pathname.includes('/dashboard/main')) return 'main'
    return 'main'
  }
  const activeView = getActiveView()
  const zodiac = getChineseZodiac(new Date(), settings.cnyOverrides)

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in pb-12">
      {timeoutError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-5 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-base font-black uppercase tracking-tight">Performance Statistics Delayed</p>
            <p className="text-amber-500/70 text-sm font-bold">Metrics took longer than expected to load. Visual charts may be incomplete.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-amber-500 text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 active:scale-95"
          >
            Refresh
          </button>
        </div>
      )}
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface-900/40 border border-surface-800/50 rounded-[2.5rem] p-6 sm:p-8 shadow-sm backdrop-blur-md">
        <div className="space-y-1 text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl font-black text-surface-100 tracking-tight flex items-center justify-center lg:justify-start gap-3">
             {activeView === 'main' ? 'Main Dashboard' : 
              activeView === 'status' ? 'Daily Status' : 'Daily Assignment'}
          </h1>
          <p className="text-surface-400 font-bold flex items-center justify-center lg:justify-start gap-2 text-sm sm:text-lg uppercase tracking-widest pl-1 opacity-80">
            {activeView === 'main' ? 'Full Season Dashboard' : 
             activeView === 'status' ? 'Real-Time Operational Status' : 'Team Assignment & Deployment'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center lg:items-end gap-3 lg:gap-4">
          {/* Zodiac & Year Badge */}
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-950/30 rounded-2xl border border-surface-800/50 shadow-inner group/zodiac transition-all hover:border-gold-500/30">
            <span className="text-gold-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] leading-none mb-1">{zodiac.year}</span>
              <span className="text-xs font-bold text-surface-200 uppercase tracking-tight leading-none">Year of the {zodiac.name}</span>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-1">
            <span className="text-[10px] font-black text-surface-500 uppercase tracking-[0.3em]">Status</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-950/50 rounded-full border border-surface-800 shadow-inner">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
               <span className="text-[10px] font-bold text-surface-200 uppercase tracking-widest">Real-Time Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Dashboard Render */}
      <div className="transition-all duration-500 min-h-[60vh]">
        {activeView === 'main' ? (
          <MasterDashboard 
            stats={stats} 
            loading={loading} 
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            availableYears={availableYears}
          />
        ) : (
          <DailyDashboard troupeId={troupeId} isAdmin={isAdmin} readOnly={activeView === 'status'} />
        )}
      </div>

      {/* Global Data Status Footer */}
      <div className="flex items-center justify-center gap-3 py-6 opacity-60 translate-y-4">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
          <span className="text-[10px] font-black text-surface-400 uppercase tracking-[0.3em]">Encrypted Data Transmission Layer</span>
      </div>
    </div>
  )
}
