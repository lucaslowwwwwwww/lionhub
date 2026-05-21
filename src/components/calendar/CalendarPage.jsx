import { useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { useCalendarData } from '../../hooks/useCalendarData'
import { CNY_DAYS, CNY_START_DATES } from '../../utils/constants'
import { AddEventModal, EventDetailModal } from './CalendarModals'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Color mapping for event dots and chips
const COLOR_MAP = {
  crimson: { dot: 'bg-crimson-500', chip: 'bg-crimson-500/10 text-crimson-400 border-crimson-500/20', badge: 'bg-crimson-500' },
  gold: { dot: 'bg-gold-500', chip: 'bg-gold-500/10 text-gold-400 border-gold-500/20', badge: 'bg-gold-500' },
  blue: { dot: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-400 border-blue-500/20', badge: 'bg-blue-500' },
  green: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', badge: 'bg-emerald-500' },
  purple: { dot: 'bg-purple-500', chip: 'bg-purple-500/10 text-purple-400 border-purple-500/20', badge: 'bg-purple-500' },
  orange: { dot: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-400 border-orange-500/20', badge: 'bg-orange-500' },
  pink: { dot: 'bg-pink-500', chip: 'bg-pink-500/10 text-pink-400 border-pink-500/20', badge: 'bg-pink-500' },
  teal: { dot: 'bg-teal-500', chip: 'bg-teal-500/10 text-teal-400 border-teal-500/20', badge: 'bg-teal-500' },
}

function getColorClasses(color) {
  return COLOR_MAP[color] || COLOR_MAP.blue
}

export default function CalendarPage() {
  const { userProfile } = useAuth()
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)

  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())

  const { events, loading, timeoutError, addEvent, updateEvent, deleteEvent } = useCalendarData(currentYear, currentMonth)
  const { settings } = useSettings()

  // ─── Compute CNY day labels for the current view ───
  const cnyDateMap = useMemo(() => {
    const map = {}
    const overrides = { ...CNY_START_DATES, ...(settings?.cnyoverrides || {}) }
    // Check all years that might overlap into this month view
    const yearsToCheck = [currentYear - 1, currentYear, currentYear + 1]
    yearsToCheck.forEach(yr => {
      const startStr = overrides[yr]
      if (!startStr) return
      const startDate = new Date(startStr + 'T00:00:00')
      if (isNaN(startDate.getTime())) return
      CNY_DAYS.forEach((day, i) => {
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        map[key] = { label: day.label, subLabel: day.subLabel, dayNum: i + 1 }
      })
    })
    return map
  }, [settings, currentYear])

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [addDate, setAddDate] = useState(null)

  // ─── Navigation ───
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  // ─── Build the calendar grid ───
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDow = firstDay.getDay() // 0=Sun

    const cells = []

    // Previous month fill
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const m = currentMonth === 0 ? 11 : currentMonth - 1
      const y = currentMonth === 0 ? currentYear - 1 : currentYear
      cells.push({
        day,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      })
    }

    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      cells.push({
        day,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateKey: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      })
    }

    // Next month fill
    const remaining = 42 - cells.length // 6 rows × 7 columns
    for (let day = 1; day <= remaining; day++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1
      const y = currentMonth === 11 ? currentYear + 1 : currentYear
      cells.push({
        day,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      })
    }

    return cells
  }, [currentYear, currentMonth])

  // ─── Map events to dateKeys ───
  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(evt => {
      if (!evt.dateKey) return
      if (!map[evt.dateKey]) map[evt.dateKey] = []
      map[evt.dateKey].push(evt)
    })
    return map
  }, [events])

  // Today's dateKey
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // ─── Handlers ───
  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth) return
    if (!isAdmin) return
    setAddDate(cell.dateKey)
    setEditingEvent(null)
    setIsAddModalOpen(true)
  }

  const handleEventClick = (e, evt) => {
    e.stopPropagation()
    setSelectedEvent(evt)
    setIsDetailModalOpen(true)
  }

  const handleEdit = (evt) => {
    setEditingEvent(evt.source)
    setAddDate(null)
    setIsAddModalOpen(true)
  }

  const handleSave = async (data) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data)
    } else {
      await addEvent(data)
    }
  }

  // ─── Upcoming events list ───
  const upcomingEvents = useMemo(() => {
    const todayStr = todayKey
    return events
      .filter(evt => evt.dateKey >= todayStr)
      .slice(0, 5)
  }, [events, todayKey])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">Calendar</h1>
          <p className="text-sm text-surface-400 mt-0.5">Performances & events at a glance</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingEvent(null)
              setAddDate(todayKey)
              setIsAddModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-5 bg-surface-900 border border-surface-800 rounded-2xl px-4 py-3">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all active:scale-90"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black text-surface-100 tracking-tight">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-[10px] font-black text-surface-400 hover:text-surface-100 uppercase tracking-widest hover:bg-surface-800 rounded-lg transition-all"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all active:scale-90"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-surface-800 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">Loading Calendar...</p>
          </div>
        </div>
      )}

      {/* Timeout Error */}
      {timeoutError && (
        <div className="text-center py-12 bg-surface-900 border border-surface-800 rounded-2xl mb-6">
          <p className="text-surface-400 text-sm mb-3">Unable to load calendar data. Please try again.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
            Reload
          </button>
        </div>
      )}

      {!loading && !timeoutError && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-surface-800">
                {DAY_NAMES.map(day => (
                  <div key={day} className="py-3 text-center text-[11px] font-black text-surface-500 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              {/* Date cells */}
              <div className="grid grid-cols-7">
                {calendarGrid.map((cell, idx) => {
                  const cellEvents = eventsByDate[cell.dateKey] || []
                  const isToday = cell.dateKey === todayKey
                  const hasEvents = cellEvents.length > 0
                  const cnyInfo = cnyDateMap[cell.dateKey]

                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(cell)}
                      className={`min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-surface-800/50 transition-colors ${
                        cell.isCurrentMonth
                          ? isAdmin ? 'hover:bg-surface-800/40 cursor-pointer' : ''
                          : 'opacity-30'
                      } ${isToday ? 'bg-blue-500/5' : ''} ${cnyInfo && cell.isCurrentMonth ? 'bg-crimson-500/[0.03]' : ''}`}
                    >
                      {/* Day number + CNY label */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            isToday
                              ? 'bg-blue-500 text-white'
                              : cell.isCurrentMonth
                                ? 'text-surface-300'
                                : 'text-surface-600'
                          }`}>
                            {cell.day}
                          </span>
                          {cnyInfo && cell.isCurrentMonth && (
                            <span className="text-[9px] font-bold text-crimson-400 tracking-wide">
                              {cnyInfo.subLabel}
                            </span>
                          )}
                        </div>
                        {/* Mobile dot indicators */}
                        {hasEvents && (
                          <div className="flex gap-0.5 md:hidden">
                            {cellEvents.slice(0, 3).map((evt, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${getColorClasses(evt.color).dot}`} />
                            ))}
                            {cellEvents.length > 3 && (
                              <span className="text-[9px] text-surface-500 font-bold">+{cellEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Event chips (desktop) */}
                      <div className="hidden md:flex flex-col gap-0.5">
                        {cellEvents.slice(0, 3).map((evt) => {
                          const colors = getColorClasses(evt.color)
                          return (
                            <button
                              key={evt.id}
                              onClick={(e) => handleEventClick(e, evt)}
                              className={`w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate border transition-all hover:scale-[1.02] active:scale-95 ${colors.chip}`}
                              title={evt.title}
                            >
                              {evt.type === 'performance' ? '🦁 ' : ''}{evt.title}
                            </button>
                          )
                        })}
                        {cellEvents.length > 3 && (
                          <span className="text-[9px] text-surface-500 font-bold pl-1.5">+{cellEvents.length - 3} more</span>
                        )}
                      </div>

                      {/* Event list (mobile — click on cell to view) */}
                      <div className="md:hidden flex flex-col gap-0.5">
                        {cellEvents.slice(0, 2).map((evt) => {
                          const colors = getColorClasses(evt.color)
                          return (
                            <button
                              key={evt.id}
                              onClick={(e) => handleEventClick(e, evt)}
                              className={`w-full text-left px-1 py-px rounded text-[8px] font-semibold truncate border ${colors.chip}`}
                            >
                              {evt.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-crimson-500" />
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Performance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Custom Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">{now.getDate()}</span>
                </div>
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Today</span>
              </div>
            </div>
          </div>

          {/* Sidebar — Upcoming Events */}
          <div className="lg:col-span-1">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 sticky top-6">
              <h3 className="text-sm font-black text-surface-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Upcoming
              </h3>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-surface-500 font-medium">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(evt => {
                    const colors = getColorClasses(evt.color)
                    return (
                      <button
                        key={evt.id}
                        onClick={() => {
                          setSelectedEvent(evt)
                          setIsDetailModalOpen(true)
                        }}
                        className="w-full text-left p-3 bg-surface-800/50 hover:bg-surface-800 rounded-xl transition-all group"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-1 h-full min-h-[32px] rounded-full shrink-0 ${colors.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-surface-200 truncate group-hover:text-surface-100 transition-colors">
                              {evt.type === 'performance' ? '🦁 ' : ''}{evt.title}
                            </p>
                            <p className="text-[11px] text-surface-500 mt-0.5">
                              {new Date(evt.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {evt.type === 'event' && (
                                <> · {new Date(evt.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingEvent(null)
          setAddDate(null)
        }}
        onSave={handleSave}
        initialData={editingEvent}
        initialDate={addDate}
      />

      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        onEdit={handleEdit}
        onDelete={deleteEvent}
        isAdmin={isAdmin}
      />
    </div>
  )
}
