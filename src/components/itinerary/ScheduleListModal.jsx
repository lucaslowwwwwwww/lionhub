import { useMemo, useState } from 'react'
import { getDayInfo } from '../../utils/constants'

export default function ScheduleListModal({ isOpen, onClose, performanceDates = [], unfinishedDates = [], dateStopCounts = {}, onSelectDate }) {
  const [search, setSearch] = useState('')

  const sortedDates = useMemo(() => {
    return [...new Set(performanceDates)].sort((a, b) => b.localeCompare(a)) // Newest first
  }, [performanceDates])

  const filteredDates = useMemo(() => {
    if (!search) return sortedDates
    return sortedDates.filter(d => {
      const info = getDayInfo(new Date(d))
      const combined = `${d} ${info.label} ${info.subLabel}`.toLowerCase()
      return combined.includes(search.toLowerCase())
    })
  }, [sortedDates, search])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-950/50">
          <div>
            <h3 className="text-xl font-bold text-surface-100">Performance Schedule</h3>
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mt-1">Jump to any performance date</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-xl text-surface-400 hover:text-surface-100 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-surface-900/50 border-b border-surface-800">
           <div className="relative">
             <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             <input 
               id="schedule-search"
               name="schedule_search"
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search by date, month or day..."
               className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all shadow-inner"
             />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {filteredDates.length === 0 ? (
            <div className="py-20 text-center text-surface-600 font-bold uppercase tracking-widest text-[10px]">No dates found</div>
          ) : (
            filteredDates.map(date => {
              const info = getDayInfo(new Date(date))
              const isUnfinished = unfinishedDates.includes(date)
              const count = dateStopCounts[date] || 0

              return (
                <button 
                  key={date}
                  onClick={() => {
                    onSelectDate(date)
                    onClose()
                  }}
                  className="w-full group flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-800 transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                    isUnfinished ? 'bg-crimson-500/10 border-crimson-500/30 text-crimson-400' : 'bg-surface-950 border-surface-800 text-surface-400 group-hover:border-surface-700'
                  }`}>
                    <span className="text-xs font-black leading-none">{date.split('-')[2]}</span>
                    <span className="text-[7px] font-black uppercase mt-0.5 opacity-70">{date.split('-')[1]}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <h4 className="text-sm font-bold text-surface-200 group-hover:text-surface-100 transition-colors truncate">
                         {info.label}
                       </h4>
                       {isUnfinished && (
                         <div className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse shrink-0" />
                       )}
                    </div>
                    <p className="text-[10px] font-medium text-surface-500 uppercase tracking-widest mt-0.5">
                      {info.subLabel}
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-black text-surface-300 font-numeric">{count}</span>
                    <span className="text-[8px] font-bold text-surface-600 uppercase tracking-tighter">Stops</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
