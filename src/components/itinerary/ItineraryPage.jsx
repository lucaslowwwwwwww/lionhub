import { useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useItinerary, useAllPerformanceDates } from '../../hooks/useItinerary'
import { CNY_DAYS, getActualCnyDate, getDayInfo } from '../../utils/constants'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import StopCard from './StopCard'
import StopListItem from './StopListItem'
import MapView from './MapView'
import DaySelector from './DaySelector'
import AddStopModal from './AddStopModal'
import ScheduleListModal from './ScheduleListModal'
import TeamSelectionModal from '../dashboard/TeamSelectionModal'
import { useSettings } from '../../hooks/useSettings'
import { useTroupes } from '../../hooks/useTroupes'
import { useMembers } from '../../hooks/useMembers'
import { useOrg } from '../../hooks/useOrg'
import { supabase } from '../../supabase'
import { exportDayReportPDF, exportDayReportExcel } from '../../utils/exportUtils'



export default function ItineraryPage() {
  const { userProfile } = useAuth()
  const { settings } = useSettings()
  const { troupes } = useTroupes()
  const { members } = useMembers()
  const { orgId } = useOrg()
  
  const overrides = settings?.cnyoverrides || {}

  const [prevDateKey, setPrevDateKey] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => getDayInfo(new Date(), overrides).id)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [activeTroupeId, setActiveTroupeId] = useState(null)
  const [viewMode, setViewMode] = useState('detailed') 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [isScheduleListOpen, setIsScheduleListOpen] = useState(false)
  const [editingStop, setEditingStop] = useState(null)
  const [isExportOpen, setIsExportOpen] = useState(false)

  const dateKey = selectedDay.startsWith('day')
    ? `${selectedDay}_${selectedYear}`
    : selectedDay

  const { dates: performanceDates = [], unfinishedDates = [], dateTroupes = {}, dateStopCounts = {}, allItineraries = [] } = useAllPerformanceDates()
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

  const isAdmin = ['admin', 'master'].includes(userProfile?.role)
  const troupeIdToUse = activeTroupeId || (isAdmin ? null : userProfile?.troupeid)

  // Adjust activeTroupeId in render phase
  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey)
    if (activeTroupesOnDate.length > 0) {
      setActiveTroupeId(activeTroupesOnDate[0])
    } else if (troupes.length > 0) {
      const teamA = troupes.find(t => t.name.toLowerCase().includes('team a')) || troupes[0]
      setActiveTroupeId(teamA ? teamA.id : null)
    } else {
      setActiveTroupeId(null)
    }
  } else if (activeTroupeId && troupes.length > 0 && !troupes.some(t => t.id === activeTroupeId)) {
    if (activeTroupesOnDate.length > 0) {
      setActiveTroupeId(activeTroupesOnDate[0])
    } else {
      const teamA = troupes.find(t => t.name.toLowerCase().includes('team a')) || troupes[0]
      setActiveTroupeId(teamA ? teamA.id : null)
    }
  }

  const { itinerary, stops = [], attendance = [], attendanceDetails = {}, loading, timeoutError, updateStopStatus, updateStop, addStop, createItinerary, deleteStop, reorderStops, updateAttendance, transferStop } = useItinerary(troupeIdToUse, dateKey)

  const { activeStops, finishedStops } = useMemo(() => {
    const active = stops.filter(s => s.status !== 'completed' && s.status !== 'skipped')
    const finished = stops.filter(s => s.status === 'completed' || s.status === 'skipped')
    return { activeStops: active, finishedStops: finished }
  }, [stops])

  const currentActualDate = selectedDay.startsWith('day') 
    ? getActualCnyDate(selectedDay, selectedYear, overrides) 
    : new Date(selectedDay)

  const handleSaveStop = async (formData) => {
    if (editingStop) {
      await updateStop(editingStop.id, formData)
      setEditingStop(null)
    } else {
      let currentItinId = itinerary?.id
      
      // Auto-create itinerary if it doesn't exist
      if (!currentItinId && activeTroupeId) {
        const troupe = troupes.find(t => t.id === activeTroupeId)
        currentItinId = await createItinerary({
          troupeName: troupe?.name || 'Unknown'
        })
      }

      await addStop({
        ...formData,
        scheduleddate: currentActualDate.toISOString().split('T')[0]
      }, userProfile?.uid, currentItinId)
    }
  }

  const handleDeleteStop = async (stopId) => {
    if (window.confirm("Are you sure you want to delete this stop?")) {
      await deleteStop(stopId)
    }
  }

  const handleEditStop = (stop) => {
    setEditingStop(stop)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStop(null)
  }

  const handleDateChange = (e) => {
    const info = getDayInfo(new Date(e.target.value), overrides)
    setSelectedDay(info.id)
    if (!info.isCny) setSelectedYear(new Date(e.target.value).getFullYear())
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    const sourceIndex = result.source.index
    const destIndex = result.destination.index
    if (sourceIndex === destIndex) return

    const reorderedStops = Array.from(activeStops)
    const [movedStop] = reorderedStops.splice(sourceIndex, 1)
    reorderedStops.splice(destIndex, 0, movedStop)
    
    // Combine back with finished stops for full list persistence if needed
    // But reorderStops only needs the new order of active stops
    await reorderStops(reorderedStops)
  }

  const currentDayInfo = getDayInfo(currentActualDate, overrides)
  const displayTitle = `${currentDayInfo.label} ${currentDayInfo.subLabel ? `(${currentDayInfo.subLabel})` : ''}`

  const isMaster = userProfile?.role === 'master'
  const troupeName = troupes.find(t => t.id === activeTroupeId)?.name || itinerary?.troupename || 'All Teams'

  const participatingMembers = members.filter(m => attendance.includes(m.id)).map(m => ({
    ...m,
    troupeName: troupes.find(t => t.id === m.troupeid)?.name || 'Unassigned'
  }))

  const exportMeta = {
    dateKey,
    dayLabel: displayTitle,
    troupeName
  }

  const handleExportPDF = async () => {
    setIsExportOpen(false)
    let checkInsList = []
    try {
      if (orgId && dateKey) {
        const { data } = await supabase
          .from('check_ins')
          .select('*')
          .eq('org_id', orgId)
          .eq('date', dateKey)
        checkInsList = data || []
      }
    } catch (e) {
      console.error('Error fetching check-ins for PDF export:', e)
    }
    await exportDayReportPDF(stops, participatingMembers, attendanceDetails, settings, exportMeta, checkInsList)
  }

  const handleExportExcel = async () => {
    setIsExportOpen(false)
    let checkInsList = []
    try {
      if (orgId && dateKey) {
        const { data } = await supabase
          .from('check_ins')
          .select('*')
          .eq('org_id', orgId)
          .eq('date', dateKey)
        checkInsList = data || []
      }
    } catch (e) {
      console.error('Error fetching check-ins for Excel export:', e)
    }
    exportDayReportExcel(stops, participatingMembers, attendanceDetails, exportMeta, checkInsList)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {timeoutError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-bold">Slow connection detected</p>
            <p className="text-amber-500/70 text-xs font-medium">The itinerary took longer than expected to load. Try refreshing.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Refresh
          </button>
        </div>
      )}

      <DaySelector 
        selectedDay={selectedDay} 
        selectedYear={selectedYear}
        onSelectDay={setSelectedDay} 
        performanceDates={performanceDates}
        unfinishedDates={unfinishedDates}
        openScheduleList={() => setIsScheduleListOpen(true)}
        cnyOverrides={overrides}
      />

      {/* Compact Troupe Switcher */}
      {troupes.length > 1 && (
        <div className="flex gap-2 p-1 bg-surface-950/50 rounded-2xl border border-surface-800/50 overflow-x-auto no-scrollbar">
          {troupes.map(t => {
            return (
              <button
                key={t.id}
                onClick={() => setActiveTroupeId(t.id)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTroupeId === t.id ? 'bg-surface-800 text-brand-400 border border-brand-500/20 shadow-lg' : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}


      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-surface-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-extrabold text-surface-100 tracking-tight">Route</h2>
            <input type="date" id="route-date" name="route_date" value={currentActualDate.toISOString().split('T')[0]} onChange={handleDateChange} className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-1.5 text-sm font-bold text-crimson-400" />
          </div>
          <p className="text-surface-400 font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {displayTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-surface-950 p-1 rounded-xl border border-surface-800">
            <button 
              onClick={() => setViewMode('detailed')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'detailed' ? 'bg-surface-800 text-gold-400 shadow-lg' : 'text-surface-500'}`}
              title="Detailed View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface-800 text-gold-400 shadow-lg' : 'text-surface-500'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          <div className="w-px h-8 bg-surface-800 mx-1"></div>

          {isAdmin && activeTroupeId && (
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-crimson-600 text-white font-bold hover:bg-crimson-500 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Stop
            </button>
          )}

          {isMaster && activeTroupeId && (
            <div className="relative">
              <button 
                onClick={() => setIsExportOpen(!isExportOpen)} 
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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

      {loading ? (
        <div className="flex justify-center py-20 animate-pulse text-crimson-500 font-black">SYNCING...</div>
      ) : stops.length === 0 ? (
        <div className="py-20 text-center bg-surface-900/40 border border-surface-800 border-dashed rounded-3xl">
           <p className="text-surface-500 font-bold uppercase tracking-widest">No routes found for this team.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active / Pending Section */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stops">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className={viewMode === 'list' ? 'space-y-2' : 'space-y-4'}>
                  {activeStops.map((stop, index) => {
                    const isAnyActive = activeStops.some(s => s.status === 'in-progress' || s.status === 'performing')
                    const canStart = index === 0 && !isAnyActive
                    
                    return (
                      <Draggable key={stop.id} draggableId={stop.id} index={index} isDragDisabled={!isAdmin}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            {viewMode === 'list' ? (
                              <StopListItem 
                                stop={stop} 
                                index={index} 
                                onUpdateStatus={updateStopStatus} 
                                onEdit={handleEditStop} 
                                onDelete={handleDeleteStop}
                                dragHandleProps={provided.dragHandleProps}
                                isAdmin={isAdmin}
                                canStart={canStart}
                                troupes={troupes}
                                currentTroupeId={activeTroupeId}
                                onTransfer={transferStop}
                              />
                            ) : (
                              <StopCard 
                                stop={stop} 
                                index={index} 
                                onUpdateStatus={updateStopStatus} 
                                onEdit={handleEditStop} 
                                onDelete={handleDeleteStop} 
                                dragHandleProps={provided.dragHandleProps}
                                canStart={canStart}
                                troupes={troupes}
                                currentTroupeId={activeTroupeId}
                                onTransfer={transferStop}
                              />
                            )}
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Finished Section */}
          {finishedStops.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-surface-800/50">
               <div className="flex items-center gap-3 px-2">
                 <h3 className="text-[10px] font-black text-surface-500 uppercase tracking-[0.3em]">Completed & Skipped</h3>
                 <div className="flex-1 h-px bg-surface-800/50"></div>
                 <span className="text-[10px] font-black text-surface-600 bg-surface-800/40 px-2 py-0.5 rounded-md">{finishedStops.length}</span>
               </div>
               <div className={viewMode === 'list' ? 'space-y-1' : 'space-y-4'}>
                 {finishedStops.map((stop, idx) => (
                    viewMode === 'list' ? (
                      <StopListItem 
                        key={stop.id} 
                        stop={stop} 
                        index={idx} 
                        onUpdateStatus={updateStopStatus} 
                        onEdit={handleEditStop} 
                        onDelete={handleDeleteStop}
                        isAdmin={isAdmin}
                        troupes={troupes}
                        currentTroupeId={activeTroupeId}
                        onTransfer={transferStop}
                      />
                    ) : (
                      <StopCard 
                        key={stop.id} 
                        stop={stop} 
                        index={idx} 
                        onUpdateStatus={updateStopStatus} 
                        onEdit={handleEditStop} 
                        onDelete={handleDeleteStop}
                        isAdmin={isAdmin}
                        troupes={troupes}
                        currentTroupeId={activeTroupeId}
                        onTransfer={transferStop}
                      />
                    )
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

      <AddStopModal isOpen={isModalOpen} onClose={handleCloseModal} onAdd={handleSaveStop} stops={stops} stop={editingStop} />
      <TeamSelectionModal 
        isOpen={isTeamModalOpen} 
        onClose={() => setIsTeamModalOpen(false)} 
        selectedMemberIds={attendance} 
        currentAttendanceDetails={attendanceDetails}
        onSave={async (ids, details) => {
          await updateAttendance(ids, details)
        }} 
        busyMemberIds={busyMemberIds} 
      />
      <ScheduleListModal 
        isOpen={isScheduleListOpen} 
        onClose={() => setIsScheduleListOpen(false)} 
        performanceDates={performanceDates}
        unfinishedDates={unfinishedDates}
        dateStopCounts={dateStopCounts}
        onSelectDate={(date) => {
          const info = getDayInfo(new Date(date), overrides)
          setSelectedDay(info.id)
          if (!info.isCny) setSelectedYear(new Date(date).getFullYear())
        }}
      />
    </div>
  )
}
