import { useState } from 'react'
import StatusBadge from './StatusBadge'

export default function StopListItem({ stop, index, onEdit, onDelete, isAdmin, dragHandleProps, troupes = [], currentTroupeId = null, onTransfer = () => {} }) {
  const isCompleted = stop.status === 'completed'
  const isSkipped = stop.status === 'skipped'
  const isPerforming = stop.status === 'performing'
  const isEnRoute = stop.status === 'in-progress'
  const [isTransferring, setIsTransferring] = useState(false)

  const renderTransferModal = () => {
    if (!isTransferring) return null
    const otherTroupes = (troupes || []).filter(t => t.id !== currentTroupeId)

    return (
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={(e) => { e.stopPropagation(); setIsTransferring(false); }}
      >
        <div 
          className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mt-auto sm:mt-0 transition-transform animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300" 
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 backdrop-blur-md">
            <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">Transfer Stop</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsTransferring(false); }} 
              className="text-surface-400 hover:text-surface-100 transition-colors p-2 hover:bg-surface-800 rounded-full"
            >
              ✕
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-surface-400 font-medium">
              Transfer <strong className="text-gold-400">{stop.householdname}</strong> to another team:
            </p>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
              {otherTroupes.length === 0 ? (
                <p className="text-xs text-surface-500 font-bold uppercase tracking-widest text-center py-4">No other teams found.</p>
              ) : (
                otherTroupes.map(t => (
                  <button
                    key={t.id}
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await onTransfer(stop.id, t.id, t.name)
                        setIsTransferring(false)
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                    className="w-full px-5 py-4 rounded-2xl bg-surface-950 border border-surface-800 hover:border-brand-500/50 hover:bg-brand-500/5 text-left transition-all flex items-center justify-between group animate-fade-in"
                  >
                    <div>
                      <p className="font-black text-sm text-surface-100 uppercase tracking-wider">{t.name}</p>
                      <p className="text-[10px] text-surface-500 font-bold mt-0.5">Transfer to this team</p>
                    </div>
                    <svg className="w-5 h-5 text-surface-600 group-hover:text-brand-400 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 bg-surface-900 border rounded-xl px-4 py-3 shadow-sm transition-all hover:bg-surface-800/50 ${
      isCompleted ? 'border-green-900/30 opacity-75' :
      isSkipped ? 'border-crimson-900/30 opacity-60' :
      isPerforming ? 'border-brand-500/40 bg-brand-900/5' :
      isEnRoute ? 'border-gold-500/40' :
      'border-surface-800'
    }`}>
      {/* Sequence */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-numeric text-xs shrink-0 ${
        isCompleted ? 'bg-green-500/10 text-green-400' :
        isSkipped ? 'bg-crimson-500/10 text-crimson-400' :
        isPerforming ? 'bg-brand-500 text-white shadow-brand-500/50 animate-pulse' :
        isEnRoute ? 'bg-gold-500 text-black' :
        'bg-surface-800 text-surface-400'
      }`}>
        {index + 1}
      </div>

      {/* Time & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          {stop.scheduledtime && (
            <span className="text-[11px] font-black text-crimson-500 font-numeric shrink-0 bg-crimson-500/5 px-1.5 py-0.5 rounded border border-crimson-500/10">
              {stop.scheduledtime}
            </span>
          )}
          <h4 className="text-sm font-bold text-surface-100 truncate">{stop.householdname}</h4>
        </div>
        <p className="text-[10px] text-surface-500 truncate uppercase tracking-widest font-medium mt-1 pl-0.5 opacity-80">
          {stop.address}
        </p>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={stop.status} />
        
        {isAdmin && (
          <div className="flex items-center gap-1 border-l border-surface-800 pl-3">
            <button 
              onClick={() => onEdit(stop)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
              title="Edit Stop"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={() => setIsTransferring(true)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
              title="Transfer Stop"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button 
              onClick={() => onDelete(stop.id)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all"
              title="Delete Stop"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Drag Handle Icon for List Mode */}
        <div {...dragHandleProps} className="text-surface-600 cursor-grab active:cursor-grabbing p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
             <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      </div>
      {renderTransferModal()}
    </div>
  )
}
