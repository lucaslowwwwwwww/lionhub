import { getDayInfo } from '../../utils/constants'
import { useRef, useEffect, useMemo } from 'react'

export default function DaySelector({ selectedDay, onSelectDay, performanceDates = [], unfinishedDates = [], openScheduleList, cnyOverrides = {} }) {
  const scrollContainerRef = useRef(null)
  const activeItemRef = useRef(null)

  const dateRange = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + (i - 2)) // Show 2 days ago + 18 days ahead for better context
      const info = getDayInfo(d, cnyOverrides)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const dayVal = String(d.getDate()).padStart(2, '0')
      const iso = `${year}-${month}-${dayVal}`
      const dateKey = info.isCny ? `${info.id}_${year}` : info.id
      return {
        ...info,
        iso,
        dateKey
      }
    })
  }, [cnyOverrides])

  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const item = activeItemRef.current
      
      const containerWidth = container.offsetWidth
      const itemOffset = item.offsetLeft
      const itemWidth = item.offsetWidth
      
      const scrollPos = itemOffset - (containerWidth / 2) + (itemWidth / 2)
      
      container.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      })
    }
  }, [selectedDay])

  return (
    <div className="w-full relative group">
      <div 
        ref={scrollContainerRef}
        className="w-full overflow-x-auto pb-4 snap-x hide-scrollbar scroll-smooth"
      >
        <div className="flex gap-3 px-1 min-w-max items-center">
          {/* Master Schedule Quick Filter */}
          <button 
            onClick={openScheduleList}
            className="shrink-0 scale-95 opacity-80 hover:opacity-100 hover:scale-100 transition-all focus:outline-none"
          >
            <div className="w-12 h-20 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col items-center justify-center text-surface-400 hover:border-gold-500/50 hover:bg-surface-800 transition-all">
              <svg className="w-5 h-5 mb-1 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[7px] font-bold uppercase tracking-tighter text-gold-500/70">ALL</span>
            </div>
          </button>
 
          {/* Render 15-Day Sliding Window */}
          {dateRange.map((day) => {
            const isSelected = selectedDay === day.id
            const isBooked = performanceDates.includes(day.dateKey)
            
            return (
              <button
                key={day.id}
                ref={isSelected ? activeItemRef : null}
                onClick={() => onSelectDay(day.id)}
                className={`relative snap-center shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 ${
                  isSelected
                    ? 'bg-crimson-600 border-crimson-500 text-white shadow-lg shadow-crimson-500/30 scale-105'
                    : 'bg-surface-950/50 border-surface-800 text-surface-400 hover:bg-surface-800 hover:text-surface-200 hover:border-surface-700'
                }`}
              >
                {Array.isArray(unfinishedDates) && (
                  unfinishedDates.includes(day.dateKey) ||
                  unfinishedDates.includes(day.iso)
                ) && (
                  <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-crimson-500 animate-pulse'}`}></div>
                )}
                <span className={`text-xl font-bold ${day.isCny ? 'mb-0' : 'mb-0.5'}`}>
                  {day.isCny ? '🧧' : day.label.split(' ')[0]}
                </span>
                <span className={`text-[9px] uppercase tracking-widest font-black mb-0.5 ${isSelected ? 'text-white' : 'text-surface-100'}`}>
                  {day.isCny ? day.label : day.label.split(' ')[1]}
                </span>
                <span className={`text-[7px] uppercase tracking-widest font-bold ${isSelected ? 'text-white/70' : 'text-surface-500'}`}>
                  {day.subLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
