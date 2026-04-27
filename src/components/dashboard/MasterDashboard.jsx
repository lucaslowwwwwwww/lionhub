import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts'
import CountUp from '../common/CountUp'


const KPI_CONFIG = [
  { 
    key: 'totalStops', 
    label: 'Total Stops', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
    color: 'crimson' 
  },
  { 
    key: 'totalRevenue', 
    label: 'Revenue (RM)', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
    color: 'gold' 
  },
  { 
    key: 'activeTroupes', 
    label: 'Troupes', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
    color: 'brand' 
  },
  { 
    key: 'completedStops', 
    label: 'Completed', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
    color: 'green' 
  },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 shadow-2xl">
      <p className="text-sm font-bold text-surface-100 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-surface-300">
          {entry.name === 'revenue' ? 'Revenue' : 'Stops'}:{' '}
          <span className="font-bold text-surface-100">
            {entry.name === 'revenue' ? `RM ${entry.value.toLocaleString()}` : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function EmptyChartState({ label }) {
  return (
    <div className="flex items-center justify-center h-full text-center bg-surface-950/20 rounded-[2rem] border-2 border-dashed border-surface-800/50 p-8">
      <div className="space-y-3">
         <svg className="w-12 h-12 text-surface-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
         <p className="text-sm text-surface-500 font-bold leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest">
           {label}
         </p>
      </div>
    </div>
  )
}

export default function MasterDashboard({ stats, loading, selectedYear, setSelectedYear, availableYears }) {
  const [viewMode, setViewMode] = useState('monthly')
  const [isMobile, setIsMobile] = useState(null)
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Stabilize layout before rendering charts
    const timer = setTimeout(() => setCanRender(true), 200)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timer)
    }
  }, [])
  
  const currentData = viewMode === 'monthly' 
    ? (stats.monthlyData[selectedYear] || []) 
    : stats.yearlyData

  const completionRate = stats.totalStops > 0
    ? Math.round((stats.completedStops / stats.totalStops) * 100)
    : 0

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* KPI Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 h-24 sm:h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {KPI_CONFIG.map((kpi) => (
            <div
              key={kpi.key}
              className="group relative bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-surface-900/50 hover:border-surface-700/80 transition-all duration-500 backdrop-blur-md overflow-hidden"
            >
               {/* Background Glow */}
               <div className={`absolute -bottom-12 -right-12 w-32 h-32 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-crimson-500`} />
               
               <div className="relative z-10 space-y-3 sm:space-y-4">
                 <div className="flex items-center justify-between">
                   <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-surface-950/50 border border-surface-800/50 text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-500`}>
                     {kpi.icon}
                   </div>
                 </div>
                 <div className="space-y-0.5 sm:space-y-1">
                   <p className="text-[10px] sm:text-xs font-black text-surface-500 uppercase tracking-widest">{kpi.label}</p>
                   <p className="text-xl sm:text-3xl font-black text-surface-100 font-numeric tracking-tight">
                     {kpi.key === 'totalRevenue' ? (
                       <CountUp end={stats[kpi.key]} prefix="RM " />
                     ) : (
                       <CountUp end={stats[kpi.key]} />
                     )}
                   </p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics & Insights Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Overall Completion Card */}
        <div className="xl:col-span-12 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-5 sm:p-8 shadow-sm backdrop-blur-md">
           <div className="flex items-center justify-between gap-4 mb-4 sm:mb-8">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-xl font-black text-surface-100 uppercase tracking-tight">Mission Progress</h3>
                <p className="hidden sm:block text-sm text-surface-500 font-bold">Consolidated completion rate across all troupes</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                 <div className="text-right">
                    <p className="text-2xl sm:text-4xl font-black text-surface-100 font-numeric tracking-tighter">
                      <CountUp end={completionRate} suffix="%" />
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-surface-500 font-black uppercase tracking-widest">Efficiency</p>
                 </div>
                 <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-surface-800 flex items-center justify-center p-0.5 sm:p-1">
                    <div 
                      className="w-full h-full rounded-full bg-gradient-to-tr from-crimson-600 to-gold-500 animate-pulse-slow"
                      style={{ opacity: completionRate / 100 }}
                    />
                 </div>
              </div>
           </div>

           <div className="relative h-2.5 sm:h-4 w-full bg-surface-950 rounded-full overflow-hidden p-0.5 sm:p-1 shadow-inner ring-1 ring-surface-800">
              <div
                className="h-full bg-gradient-to-r from-crimson-600 via-brand-500 to-gold-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ width: `${completionRate}%` }}
              />
           </div>

           <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-8">
              <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-950/30 border border-surface-800/50 text-center">
                 <p className="text-[8px] sm:text-[10px] text-surface-500 font-black uppercase tracking-widest mb-0.5">DONE</p>
                 <p className="text-sm sm:text-xl font-black text-green-400"><CountUp end={stats.completedStops} /></p>
              </div>
              <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-950/30 border border-surface-800/50 text-center">
                 <p className="text-[8px] sm:text-[10px] text-surface-500 font-black uppercase tracking-widest mb-0.5">ACTIVE</p>
                 <p className="text-sm sm:text-xl font-black text-gold-400"><CountUp end={stats.pendingStops} /></p>
              </div>
              <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-950/30 border border-surface-800/50 text-center">
                 <p className="text-[8px] sm:text-[10px] text-surface-500 font-black uppercase tracking-widest mb-0.5">SKIPPED</p>
                 <p className="text-sm sm:text-xl font-black text-crimson-400"><CountUp end={stats.skippedStops} /></p>
              </div>
           </div>
        </div>

        {/* Analysis & Chart Controls */}
        <div className="xl:col-span-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-6 backdrop-blur-sm">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl border border-brand-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-surface-100 uppercase tracking-tight">Time-Series Analysis</h3>
                  <p className="text-[10px] text-surface-500 font-black uppercase tracking-[0.2em]">Select Period for Strategic Review</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-surface-950/50 rounded-2xl border border-surface-800 shadow-inner">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    viewMode === 'monthly' 
                      ? 'bg-surface-800 text-gold-400 shadow-lg' 
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    viewMode === 'yearly' 
                      ? 'bg-surface-800 text-gold-400 shadow-lg' 
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Yearly
                </button>
              </div>
           </div>

           {/* Year Selector Dropdown */}
           {viewMode === 'monthly' && (
             <div className="relative group min-w-[180px]">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full appearance-none bg-surface-950/50 border border-surface-800 text-surface-100 text-xs font-black uppercase tracking-[0.2em] pl-6 pr-10 py-3.5 rounded-2xl cursor-pointer hover:border-crimson-600/50 focus:outline-none focus:ring-2 focus:ring-crimson-600/20 transition-all duration-300 shadow-inner"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year} className="bg-surface-900 text-surface-100 py-4">
                      {year} Strategic Period
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-500 group-hover:text-gold-400 transition-colors text-[10px]">
                   ▼
                </div>
             </div>
           )}
        </div>

        {/* Top Charts Row */}
        <div className="xl:col-span-6 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-5 sm:p-8 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4 sm:mb-8">
            <div className="p-3 bg-gold-500/10 text-gold-400 rounded-2xl border border-gold-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
               <h3 className="text-lg font-black text-surface-100 uppercase tracking-tight">Financial Performance</h3>
               <p className="text-xs text-surface-500 font-bold uppercase tracking-widest">
                 {viewMode === 'monthly' ? `Monthly Revenue Stream (${selectedYear})` : 'Yearly Revenue Stream'}
               </p>
            </div>
          </div>
          
          <div className="h-64 sm:h-[400px] w-full">
            {loading ? (
              <div className="w-full h-full bg-surface-950/20 rounded-[2rem] border border-surface-800/50 animate-pulse flex items-center justify-center">
                 <div className="w-full max-w-[80%] space-y-4">
                    <div className="h-4 bg-surface-800/50 rounded-full w-3/4 mx-auto" />
                    <div className="h-32 bg-surface-800/30 rounded-2xl w-full" />
                 </div>
              </div>
            ) : (currentData.length > 0 && isMobile !== null && canRender) ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={1} minHeight={256}>
                <BarChart data={currentData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                    interval={isMobile ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `RM${v}`}
                    label={{ value: 'Revenue (RM)', angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 9, fontWeight: 900 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} maxBarSize={30}>
                    {currentData.map((entry, i) => (
                      <Cell key={i} fill={entry.revenue > 0 ? '#f59e0b' : '#18181b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Record performances to see financial analytics" />
            )}
          </div>
        </div>

        <div className="xl:col-span-6 bg-surface-900/40 border border-surface-800/50 rounded-3xl p-5 sm:p-8 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4 sm:mb-8">
            <div className="p-3 bg-crimson-500/10 text-crimson-400 rounded-2xl border border-crimson-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
               <h3 className="text-lg font-black text-surface-100 uppercase tracking-tight">Engagement Metrics</h3>
               <p className="text-xs text-surface-500 font-bold uppercase tracking-widest">
                 {viewMode === 'monthly' ? `Monthly Stops & Completion (${selectedYear})` : 'Yearly Stops & Completion'}
               </p>
            </div>
          </div>

          <div className="h-64 sm:h-[400px] w-full">
            {loading ? (
              <div className="w-full h-full bg-surface-950/20 rounded-[2rem] border border-surface-800/50 animate-pulse flex items-center justify-center">
                 <div className="w-full max-w-[80%] space-y-4">
                    <div className="h-4 bg-surface-800/50 rounded-full w-1/2 mx-auto" />
                    <div className="h-32 bg-surface-800/30 rounded-2xl w-full" />
                 </div>
              </div>
            ) : (currentData.length > 0 && isMobile !== null && canRender) ? (
                            <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={1} minHeight={256}>
                <BarChart data={currentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    content={({ payload }) => (
                      <div className="flex gap-4 justify-end mb-4">
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shadow-lg" 
                              style={{ backgroundColor: entry.value === 'stops' ? '#3f3f46' : '#e11d48' }} 
                            />
                            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest whitespace-nowrap">
                              {entry.value === 'stops' ? 'Total Stops' : 'Completed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                    interval={isMobile ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 9, fontWeight: 900 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="stops" radius={[8, 8, 0, 0]} maxBarSize={20}>
                    {currentData.map((entry, i) => (
                      <Cell key={i} fill="#3f3f46" />
                    ))}
                  </Bar>
                  <Bar dataKey="completed" radius={[8, 8, 0, 0]} maxBarSize={20}>
                    {currentData.map((entry, i) => (
                      <Cell key={i} fill="#e11d48" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Add stops to generate engagement reports" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
