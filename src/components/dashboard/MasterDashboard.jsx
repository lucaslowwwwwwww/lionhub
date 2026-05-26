import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, PieChart, Pie } from 'recharts'
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
    key: 'totalExpenses', 
    label: 'Expenses (RM)', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
    color: 'crimson' 
  },
  { 
    key: 'netProfit', 
    label: 'Net Profit (RM)', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, 
    color: 'green' 
  },

]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 shadow-2xl">
      <p className="text-sm font-bold text-surface-100 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const isFinancial = ['revenue', 'expenses', 'profit'].includes(entry.name)
          const colorClass = 
            entry.name === 'revenue' ? 'text-gold-400' : 
            entry.name === 'expenses' ? 'text-crimson-400' :
            entry.name === 'profit' ? 'text-green-400' : 'text-surface-300'
          
          const labelText = 
            entry.name === 'revenue' ? 'Revenue' : 
            entry.name === 'expenses' ? 'Expenses' :
            entry.name === 'profit' ? 'Net Profit' : 
            entry.name === 'stops' ? 'Total Stops' : 'Completed'

          return (
            <p key={i} className="text-[10px] uppercase font-black tracking-widest flex justify-between gap-4">
              <span className="text-surface-400">{labelText}:</span>
              <span className={colorClass}>
                {isFinancial ? `RM ${entry.value.toLocaleString()}` : entry.value}
              </span>
            </p>
          )
        })}
      </div>
    </div>
  )
}

function EmptyChartState({ label }) {
  return (
    <div className="flex items-center justify-center h-full text-center bg-surface-950/20 rounded-[2rem] border-2 border-dashed border-surface-800/50 p-8">
      <div className="flex flex-col items-center space-y-3">
         <svg className="w-12 h-12 text-surface-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
         <p className="text-sm text-surface-400 font-bold leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest">
           {label}
         </p>
      </div>
    </div>
  )
}

const CarouselIndicators = ({ count, activeIndex, color = 'gold' }) => (
  <div className="flex justify-center gap-2 mt-4 sm:hidden">
    {[...Array(count)].map((_, i) => (
      <div 
        key={i} 
        className={`h-1.5 rounded-full transition-all duration-300 ${
          activeIndex === i 
            ? `w-6 bg-${color}-500 shadow-[0_0_8px_rgba(var(--color-${color}-500-rgb),0.5)]` 
            : 'w-1.5 bg-surface-800'
        }`}
      />
    ))}
  </div>
)

const getAmountTextSize = (text, isMobile) => {
  const len = text.length
  if (isMobile) {
    if (len > 15) return 'text-xs'
    if (len > 12) return 'text-[13px]'
    if (len > 10) return 'text-sm'
    return 'text-base'
  } else {
    if (len > 15) return 'text-sm'
    if (len > 12) return 'text-base'
    if (len > 10) return 'text-lg'
    return 'text-xl'
  }
}

const getLabelTextSize = (text, isMobile) => {
  const len = text.length
  if (isMobile) {
    if (len > 12) return 'text-[8px]'
    return 'text-[10px]'
  } else {
    if (len > 12) return 'text-[9px]'
    return 'text-[11px]'
  }
}

export default function MasterDashboard({ stats, loading, selectedYear, setSelectedYear, availableYears }) {
  const [viewMode, setViewMode] = useState('monthly')
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [canRender, setCanRender] = useState(false)
  const [hoveredIncome, setHoveredIncome] = useState(null)
  const [hoveredExpense, setHoveredExpense] = useState(null)

  // Carousel indices
  const [timeSeriesIndex, setTimeSeriesIndex] = useState(0)
  const [categoryIndex, setCategoryIndex] = useState(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Stabilize layout before rendering charts (reduced delay for better LCP)
    const timer = setTimeout(() => {
      setCanRender(true)
    }, 300)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timer)
    }
  }, [])

  const handleScroll = (e, setter) => {
    if (!isMobile) return
    const target = e.target
    requestAnimationFrame(() => {
      const scrollLeft = target.scrollLeft
      const width = target.offsetWidth
      const index = Math.round(scrollLeft / width)
      setter(index)
    })
  }


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
                   <p className="text-[10px] sm:text-xs font-black text-surface-400 uppercase tracking-widest">{kpi.label}</p>
                   <p className="text-xl sm:text-3xl font-black text-surface-100 font-numeric tracking-tight">
                     {['totalRevenue', 'totalExpenses', 'netProfit'].includes(kpi.key) ? (
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
                <h2 className="text-sm sm:text-xl font-black text-surface-100 uppercase tracking-tight">Mission Progress</h2>
                <p className="hidden sm:block text-sm text-surface-400 font-bold">Consolidated completion rate across all troupes</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                 <div className="text-right">
                    <p className="text-2xl sm:text-4xl font-black text-surface-100 font-numeric tracking-tighter">
                      <CountUp end={completionRate} suffix="%" />
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-surface-400 font-black uppercase tracking-widest">Efficiency</p>
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
                 <p className="text-[8px] sm:text-[10px] text-surface-400 font-black uppercase tracking-widest mb-0.5">DONE</p>
                 <p className="text-sm sm:text-xl font-black text-green-400"><CountUp end={stats.completedStops} /></p>
              </div>
              <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-950/30 border border-surface-800/50 text-center">
                 <p className="text-[8px] sm:text-[10px] text-surface-400 font-black uppercase tracking-widest mb-0.5">ACTIVE</p>
                 <p className="text-sm sm:text-xl font-black text-gold-400"><CountUp end={stats.pendingStops} /></p>
              </div>
              <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-950/30 border border-surface-800/50 text-center">
                 <p className="text-[8px] sm:text-[10px] text-surface-400 font-black uppercase tracking-widest mb-0.5">SKIPPED</p>
                 <p className="text-sm sm:text-xl font-black text-crimson-400"><CountUp end={stats.skippedStops} /></p>
              </div>
           </div>
        </div>

        {/* Analysis & Chart Controls */}
        <div className="xl:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 bg-surface-900/40 border border-surface-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
           <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="p-2 sm:p-3 bg-brand-500/10 text-brand-400 rounded-xl sm:rounded-2xl border border-brand-500/20">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-black text-surface-100 uppercase tracking-tight">Time-Series Analysis</h2>
                  <label htmlFor="strategic-period-selector" className="text-[8px] sm:text-[10px] text-surface-400 font-black uppercase tracking-[0.2em] cursor-pointer">Select Period</label>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-surface-950/50 rounded-xl sm:rounded-2xl border border-surface-800 shadow-inner w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    viewMode === 'monthly' 
                      ? 'bg-surface-800 text-gold-400 shadow-lg' 
                      : 'text-surface-400 hover:text-surface-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    viewMode === 'yearly' 
                      ? 'bg-surface-800 text-gold-400 shadow-lg' 
                      : 'text-surface-400 hover:text-surface-300'
                  }`}
                >
                  Yearly
                </button>
              </div>
           </div>

           {/* Year Selector Dropdown */}
           {viewMode === 'monthly' && (
             <div className="relative group w-full md:w-auto min-w-[150px] sm:min-w-[180px]">
                <select 
                  id="strategic-period-selector"
                  name="selected_year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full appearance-none bg-surface-950/50 border border-surface-800 text-surface-100 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] pl-4 sm:pl-6 pr-8 sm:pr-10 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer hover:border-crimson-600/50 focus:outline-none focus:ring-2 focus:ring-crimson-600/20 transition-all duration-300 shadow-inner"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year} className="bg-surface-900 text-surface-100 py-4">
                      {year} Strategic Period
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 group-hover:text-gold-400 transition-colors text-[8px] sm:text-[10px]">
                   ▼
                </div>
             </div>
           )}
        </div>

        {/* Top Charts Row - Carousel on Mobile */}
        <div className="xl:col-span-12">
          <div 
            className={`flex xl:grid xl:grid-cols-2 gap-6 sm:gap-8 overflow-x-auto xl:overflow-x-visible snap-x snap-mandatory no-scrollbar pb-2 xl:pb-0`}
            onScroll={(e) => handleScroll(e, setTimeSeriesIndex)}
          >
            {/* Financial Performance Chart */}
            <div className="min-w-full xl:min-w-0 snap-center">
              <div className="bg-surface-900/40 border border-surface-800/50 rounded-3xl p-5 sm:p-8 shadow-sm backdrop-blur-md h-full">
                <div className="flex items-center gap-4 mb-4 sm:mb-8">
                  <div className="p-3 bg-gold-500/10 text-gold-400 rounded-2xl border border-gold-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-surface-100 uppercase tracking-tight">Financial Performance</h2>
                    <p className="text-xs text-surface-400 font-bold uppercase tracking-widest">
                      {viewMode === 'monthly' ? `Monthly Revenue Stream (${selectedYear})` : 'Yearly Revenue Stream'}
                    </p>
                  </div>
                </div>
                
                <div className="h-64 sm:h-[400px] w-full relative overflow-hidden">
                  {loading ? (
                    <div className="w-full h-full bg-surface-950/20 rounded-[2rem] border border-surface-800/50 animate-pulse flex items-center justify-center">
                      <div className="w-full max-w-[80%] space-y-4">
                          <div className="h-4 bg-surface-800/50 rounded-full w-3/4 mx-auto" />
                          <div className="h-32 bg-surface-800/30 rounded-2xl w-full" />
                      </div>
                    </div>
                  ) : (currentData.length > 0 && canRender) ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256} debounce={50}>
                      <BarChart data={currentData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
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
                                    style={{ backgroundColor: entry.value === 'revenue' ? '#f59e0b' : '#e11d48' }} 
                                  />
                                  <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest whitespace-nowrap">
                                    {entry.value === 'revenue' ? 'Income' : 'Expenses'}
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
                          tickFormatter={v => `RM${v}`}
                          label={{ value: 'Amount (RM)', angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 9, fontWeight: 900 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={20} fill="#f59e0b" />
                        <Bar dataKey="expenses" radius={[6, 6, 0, 0]} maxBarSize={20} fill="#e11d48" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartState label="Record performances to see financial analytics" />
                  )}
                </div>
              </div>
            </div>

            {/* Engagement Metrics Chart */}
            <div className="min-w-full xl:min-w-0 snap-center">
              <div className="bg-surface-900/40 border border-surface-800/50 rounded-3xl p-5 sm:p-8 shadow-sm backdrop-blur-md h-full">
                <div className="flex items-center gap-4 mb-4 sm:mb-8">
                  <div className="p-3 bg-crimson-500/10 text-crimson-400 rounded-2xl border border-crimson-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-surface-100 uppercase tracking-tight">Engagement Metrics</h2>
                    <p className="text-xs text-surface-400 font-bold uppercase tracking-widest">
                      {viewMode === 'monthly' ? `Monthly Stops & Completion (${selectedYear})` : 'Yearly Stops & Completion'}
                    </p>
                  </div>
                </div>

                <div className="h-64 sm:h-[400px] w-full relative overflow-hidden">
                  {loading ? (
                    <div className="w-full h-full bg-surface-950/20 rounded-[2rem] border border-surface-800/50 animate-pulse flex items-center justify-center">
                      <div className="w-full max-w-[80%] space-y-4">
                          <div className="h-4 bg-surface-800/50 rounded-full w-1/2 mx-auto" />
                          <div className="h-32 bg-surface-800/30 rounded-2xl w-full" />
                      </div>
                    </div>
                  ) : (currentData.length > 0 && canRender) ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256} debounce={50}>
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
          <CarouselIndicators count={2} activeIndex={timeSeriesIndex} color="gold" />
        </div>

        {/* Category Analysis Row - Carousel on Mobile */}
        <div className="xl:col-span-12">
           <div 
             className="flex md:grid md:grid-cols-2 gap-6 sm:gap-8 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar pb-2 md:pb-0"
             onScroll={(e) => handleScroll(e, setCategoryIndex)}
           >
              {/* Income Categories */}
              <div className="min-w-full md:min-w-0 snap-center">
                <div className="bg-surface-900/40 border border-surface-800/50 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-md h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gold-500/10 text-gold-400 rounded-2xl border border-gold-500/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-surface-100 uppercase tracking-tight">Income Streams</h2>
                      <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest">Revenue by Source Category</p>
                    </div>
                  </div>
                  <div className="h-64 sm:h-[350px] w-full relative">
                    {(stats.categoryData.income.length > 0 && canRender) ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={50}>
                          <PieChart>
                            <Pie
                              data={stats.categoryData.income}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 72 : 92}
                              outerRadius={isMobile ? 87 : 117}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                              onMouseEnter={(_, index) => setHoveredIncome(stats.categoryData.income[index])}
                              onMouseLeave={() => setHoveredIncome(null)}
                            >
                              {stats.categoryData.income.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={[
                                  '#f59e0b', // gold-500
                                  '#fbbf24', // gold-400
                                  '#d97706', // gold-600
                                  '#b45309', // gold-700
                                  '#fbcf33', // custom yellow
                                ][index % 5]} />
                              ))}
                            </Pie>
                            <Legend 
                              verticalAlign="bottom" 
                              align="center"
                              content={({ payload }) => (
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-6">
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest">{entry.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Centered Dynamic Info */}
                        {(() => {
                          const name = hoveredIncome ? hoveredIncome.name : 'Total'
                          const amount = `RM ${(hoveredIncome ? hoveredIncome.value : stats.totalRevenue).toLocaleString()}`
                          const nameSize = getLabelTextSize(name, isMobile)
                          const amountSize = getAmountTextSize(amount, isMobile)
                          const amountColor = hoveredIncome ? 'text-surface-100' : 'text-gold-500'
                          
                          return (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4 transition-all duration-300 flex flex-col justify-center items-center max-w-[80%]">
                              <p className={`font-black text-surface-400 uppercase tracking-[0.2em] mb-1 transition-all ${nameSize} truncate max-w-full`}>
                                {name}
                              </p>
                              <p className={`font-black tabular-nums transition-all ${amountSize} ${amountColor} leading-none whitespace-nowrap`}>
                                {amount}
                              </p>
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <EmptyChartState label="No income data categorized yet" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expense Categories */}
              <div className="min-w-full md:min-w-0 snap-center">
                <div className="bg-surface-900/40 border border-surface-800/50 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-md h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-crimson-500/10 text-crimson-400 rounded-2xl border border-crimson-500/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-surface-100 uppercase tracking-tight">Cost Distribution</h2>
                      <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest">Expenses by Operational Group</p>
                    </div>
                  </div>
                  <div className="h-64 sm:h-[350px] w-full relative">
                    {(stats.categoryData.expense.length > 0 && canRender) ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={50}>
                          <PieChart>
                            <Pie
                              data={stats.categoryData.expense}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 72 : 92}
                              outerRadius={isMobile ? 87 : 117}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                              onMouseEnter={(_, index) => setHoveredExpense(stats.categoryData.expense[index])}
                              onMouseLeave={() => setHoveredExpense(null)}
                            >
                              {stats.categoryData.expense.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={[
                                  '#e11d48', // crimson-600
                                  '#fb7185', // rose-400
                                  '#be123c', // crimson-700
                                  '#f43f5e', // rose-500
                                  '#9f1239', // crimson-800
                                ][index % 5]} />
                              ))}
                            </Pie>
                            <Legend 
                              verticalAlign="bottom" 
                              align="center"
                              content={({ payload }) => (
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-6">
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest">{entry.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Centered Dynamic Info */}
                        {(() => {
                          const name = hoveredExpense ? hoveredExpense.name : 'Spent'
                          const amount = `RM ${(hoveredExpense ? hoveredExpense.value : stats.totalExpenses).toLocaleString()}`
                          const nameSize = getLabelTextSize(name, isMobile)
                          const amountSize = getAmountTextSize(amount, isMobile)
                          const amountColor = hoveredExpense ? 'text-surface-100' : 'text-crimson-500'
                          
                          return (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4 transition-all duration-300 flex flex-col justify-center items-center max-w-[80%]">
                              <p className={`font-black text-surface-400 uppercase tracking-[0.2em] mb-1 transition-all ${nameSize} truncate max-w-full`}>
                                {name}
                              </p>
                              <p className={`font-black tabular-nums transition-all ${amountSize} ${amountColor} leading-none whitespace-nowrap`}>
                                {amount}
                              </p>
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <EmptyChartState label="No expense data categorized yet" />
                    )}
                  </div>
                </div>
              </div>
           </div>
           <CarouselIndicators count={2} activeIndex={categoryIndex} color="crimson" />
        </div>
      </div>
    </div>
  )
}
