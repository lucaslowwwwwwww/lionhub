import StatusBadge from './StatusBadge'
import { useState } from 'react'
import { generateAndShareReceipt } from '../../utils/generateReceipt'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { formatWhatsAppLink, formatPhoneForCall } from '../../utils/constants'

export default function StopCard({ stop, onUpdateStatus, onEdit, onDelete, index, canStart = true, dragHandleProps, troupes = [], currentTroupeId = null, onTransfer = () => {} }) {
  const { userProfile } = useAuth()
  const { settings } = useSettings()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [receivedAmount, setReceivedAmount] = useState(stop.amount || 0)
  const [paymentMethod, setPaymentMethod] = useState('Cash') // 'Cash' or 'Bank In'
  
  const isCompleted = stop.status === 'completed'
  const isSkipped = stop.status === 'skipped'
  const isPending = stop.status === 'pending'
  const isEnRoute = stop.status === 'in-progress'
  const isPerforming = stop.status === 'performing'
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)

  // Calculate duration if completed
  let recordedMinutes = null
  if (isCompleted && stop.performancestartedat && stop.completedat) {
    try {
      const getMs = (ts) => {
        if (!ts) return 0
        if (typeof ts.toMillis === 'function') return ts.toMillis()
        if (typeof ts.toDate === 'function') return ts.toDate().getTime()
        if (ts.seconds) return ts.seconds * 1000
        return new Date(ts).getTime()
      }
      const startMs = getMs(stop.performancestartedat)
      const endMs = getMs(stop.completedat)
      if (startMs && endMs) {
        recordedMinutes = Math.max(1, Math.round((endMs - startMs) / 60000))
      }
    } catch {
      // Ignored
    }
  }

  const renderNavModal = () => {
    if (!isNavigating) return null
    const query = encodeURIComponent(stop.address || stop.householdname)
    const gmapsLink = `https://www.google.com/maps/search/?api=1&query=${query}`
    const wazeLink = `https://waze.com/ul?q=${query}&navigate=yes`
  
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }}>
        <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mt-auto sm:mt-0 transition-transform animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
           <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 backdrop-blur-md">
             <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">Navigate To</h3>
             <button onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="text-surface-400 hover:text-surface-100 transition-colors p-2 hover:bg-surface-800 rounded-full">✕</button>
           </div>
           <div className="p-4 flex flex-col gap-3">
             {stop.maplink && (
               <a href={stop.maplink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="flex items-center gap-4 p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all group">
                 <div className="text-left">
                   <p className="font-black text-base sm:text-lg">Saved Location Link</p>
                   <p className="text-[10px] text-blue-500/70 uppercase tracking-widest font-black mt-1">Direct to Pinned Spot</p>
                 </div>
               </a>
             )}
             <a href={gmapsLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="flex items-center gap-4 p-5 rounded-2xl bg-surface-950 border border-surface-800 text-surface-100 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group">
               <div className="text-left">
                 <p className="font-bold text-base sm:text-lg">Google Maps</p>
                 <p className="text-[10px] text-surface-500 uppercase tracking-widest font-black mt-1 text-pretty">Search by Address</p>
               </div>
             </a>
             <a href={wazeLink} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="flex items-center gap-4 p-5 rounded-2xl bg-surface-950 border border-surface-800 text-surface-100 hover:border-[#33ccff]/50 hover:bg-[#33ccff]/5 transition-all group">
               <div className="text-left">
                 <p className="font-bold text-base sm:text-lg">Waze App</p>
                 <p className="text-[10px] text-surface-500 uppercase tracking-widest font-black mt-1 text-pretty">Search by Address</p>
               </div>
             </a>
           </div>
        </div>
      </div>
    )
  }

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
    <div {...dragHandleProps} className={`relative overflow-hidden bg-surface-900 border rounded-3xl p-6 shadow-2xl transition-all duration-500 group ${
      isCompleted ? 'border-green-900/40 opacity-80 grayscale-[0.3]' :
      isSkipped ? 'border-crimson-900/40 opacity-70 grayscale' :
      isPerforming ? 'border-brand-500/50 shadow-brand-500/20 scale-[1.01] bg-brand-900/5' :
      isEnRoute ? 'border-gold-500/50 shadow-gold-500/20 scale-[1.01] bg-gold-900/5' :
      'border-surface-800 hover:border-surface-700 hover:shadow-surface-950/50'
    }`}>
      
      {/* Dynamic Status Glow */}
      {(isEnRoute || isPerforming) && (
        <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] z-0 pointer-events-none rounded-full ${isPerforming ? 'bg-brand-500/20 animate-pulse' : 'bg-gold-500/10'}`} />
      )}

      <div className="relative z-10 space-y-5">
        
        {/* TOP HEADER: Identity & Status */}
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center">
            {/* Sequence Circle */}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black font-numeric text-base shadow-lg transform transition-transform group-hover:scale-110 ${
              isCompleted ? 'bg-green-500/20 text-green-400' :
              isSkipped ? 'bg-crimson-500/20 text-crimson-400' :
              isPerforming ? 'bg-brand-500 text-white shadow-brand-500/50 animate-bounce-slow' :
              isEnRoute ? 'bg-gold-500 text-black shadow-gold-500/50' :
              'bg-surface-800 text-surface-400'
            }`}>
              {index + 1}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-surface-550 tracking-tight leading-none">{stop.householdname}</h3>
                {isAdmin && (
                  <div className="flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={() => onEdit(stop)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setIsTransferring(true)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
                      title="Transfer Stop"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => onDelete(stop.id)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <StatusBadge status={stop.status} />
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{stop.scheduledtime}</span>
              </div>
            </div>
          </div>

          {!isCompleted && !isSkipped && recordedMinutes === null && (
             <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-black text-surface-600 uppercase tracking-tighter">Budget Time</span>
                <span className="text-sm font-bold text-surface-400 font-numeric">{stop.duration || 30}m</span>
             </div>
          )}
          
          {recordedMinutes !== null && (
            <div className="text-right flex flex-col items-end bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 font-numeric">
               <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter animate-pulse">Live Perf</span>
               <span className="text-sm font-bold text-green-400 underline decoration-green-500/30 underline-offset-4">{recordedMinutes}m</span>
            </div>
          )}
        </div>

        {/* INFO GRID: Address & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Address Block */}
          <div className="bg-surface-800/40 rounded-2xl p-4 border border-surface-800/50 hover:border-surface-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3 h-3 text-gold-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Location
              </span>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNavigating(true); }}
                className="text-[9px] font-black px-2 py-0.5 rounded-md bg-surface-700 text-surface-300 hover:text-brand-400 transition-colors uppercase tracking-widest focus:outline-none"
              >
                Map
              </button>
            </div>
            <p className="text-sm text-surface-200 leading-snug font-medium line-clamp-2 min-h-[2.5rem]">{stop.address}</p>
          </div>

          {/* Contact & Payment Block */}
          <div className="bg-surface-800/40 rounded-2xl p-4 border border-surface-800/50 hover:border-surface-700 transition-colors flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3 h-3 text-brand-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Contact
              </span>
              <div className="flex items-center gap-1.5">
                <a href={formatPhoneForCall(stop.phone)} className="p-1 rounded bg-surface-700 text-surface-400 hover:text-white transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </a>
                <a href={formatWhatsAppLink(stop.phone)} target="_blank" className="p-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                </a>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm text-surface-200 font-bold font-numeric tracking-tight">{stop.phone}</span>
              <div className="flex flex-col items-end">
                <p className="text-lg font-black text-gold-400 font-numeric leading-none tracking-tighter">
                  {isCompleted && stop.actualamount !== undefined && stop.actualamount !== null && stop.actualamount !== '' && Number(stop.actualamount) !== Number(stop.amount) ? (
                    <span className="text-green-400">RM{stop.actualamount}</span>
                  ) : (
                    `RM${(isCompleted && stop.actualamount !== undefined && stop.actualamount !== null && stop.actualamount !== '') ? stop.actualamount : stop.amount}`
                  )}
                </p>
                {isCompleted && stop.paymentmethod && (
                   <span className="text-[8px] font-black text-surface-500 uppercase tracking-widest mt-0.5">{stop.paymentmethod}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE TAGS: Horizontal Scrollable List */}
        {(stop.lioncolor || stop.hasgodofwealth || stop.hasbigheadbuddha || stop.pluckingtype || stop.extra_characters) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {stop.lioncolor && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-800 text-surface-200 text-[10px] font-black border border-surface-700/50 shadow-sm uppercase tracking-tight gap-1.5">
                <svg className="w-3 h-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                {(Array.isArray(stop.lioncolor) ? stop.lioncolor : [stop.lioncolor || ''])
                  .map(c => typeof c === 'string' && c.includes('|') ? c.split('|')[0].trim() : c)
                  .join(' & ')} Lion
              </span>
            )}
            {/* Dynamic Characters */}
            {Array.isArray(stop.extra_characters) ? stop.extra_characters.map(char => (
              <span key={char} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20 text-[10px] font-black shadow-sm uppercase tracking-tight gap-1.5">
                {char}
              </span>
            )) : (
              <>
                {stop.hasgodofwealth && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20 text-[10px] font-black shadow-sm uppercase tracking-tight gap-1.5">
                    God of Wealth
                  </span>
                )}
                {stop.hasbigheadbuddha && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-black shadow-sm uppercase tracking-tight text-center">
                    Buddha
                  </span>
                )}
              </>
            )}
            {stop.pluckingtype && (Array.isArray(stop.pluckingtype) ? stop.pluckingtype : [stop.pluckingtype]).map((type, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black shadow-sm uppercase tracking-tight gap-1.5">
                <svg className="w-3 h-3 text-green-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                {type}
              </span>
            ))}
          </div>
        )}

        {/* REMARKS: Card-style memo */}
        {stop.remarks && (
          <div className="bg-amber-500/10 border-l-2 border-amber-500/50 p-3 rounded-r-xl">
             <div className="flex items-center gap-2 mb-1">
                <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Team Note</span>
             </div>
             <p className="text-xs text-amber-900 italic leading-relaxed font-medium">"{stop.remarks}"</p>
          </div>
        )}

        {/* ACTIONS FOOTER: Dynamic context-aware buttons */}
        <div className="pt-2">
            <div className="flex gap-2">
              {isPending && (
                <button 
                  onClick={() => canStart && onUpdateStatus(stop.id, 'in-progress')}
                  disabled={!canStart}
                  className={`flex-1 group/btn py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl ring-1 ring-inset ${
                    canStart 
                      ? 'bg-gold-500 text-surface-950 hover:bg-gold-400 shadow-gold-500/20 ring-gold-400/50' 
                      : 'bg-surface-800 text-surface-600 cursor-not-allowed opacity-50 ring-surface-700/50'
                  }`}
                >
                  {canStart ? (
                    <>
                      <span className="tracking-widest">START JOURNEY</span>
                      <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="tracking-widest capitalize">Locked (Follow Sequence)</span>
                    </>
                  )}
                </button>
              )}

              {isEnRoute && (
                <>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNavigating(true); }}
                    className="px-6 py-4 rounded-2xl bg-surface-800 text-surface-100 border border-surface-700 font-black text-[10px] hover:bg-surface-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest focus:outline-none"
                  >
                    <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    Nav
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(stop.id, 'performing')}
                    className="flex-1 py-4 rounded-2xl bg-brand-500 text-white font-black text-xs hover:bg-brand-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 ring-1 ring-inset ring-brand-400/50 tracking-widest"
                  >
                    ARRIVED (START)
                  </button>
                </>
              )}

              {(isPending || isEnRoute || isPerforming) && !isConfirming && (
                <button 
                  onClick={() => onUpdateStatus(stop.id, 'skipped')}
                  className="px-5 py-4 rounded-2xl bg-surface-800 text-surface-500 border border-surface-700 font-black text-[10px] hover:text-crimson-400 hover:border-crimson-500/50 transition-all uppercase tracking-widest"
                >
                  Skip
                </button>
              )}

              {isPerforming && (
                <div className="flex-1">
                  {isConfirming ? (
                     <div className="bg-surface-950/50 p-4 rounded-2xl border border-brand-500/30 space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest pl-1 mb-2">Final RM</p>
                              <input 
                                type="number"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-100 font-black focus:outline-none focus:border-brand-500 transition-all font-numeric"
                              />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest pl-1 mb-2">Type</p>
                              <div className="flex gap-1 h-12">
                                 <button onClick={() => setPaymentMethod('Cash')} className={`flex-1 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'Cash' ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-surface-800 border-surface-700 text-surface-500'}`}>
                                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                   CASH
                                 </button>
                                 <button onClick={() => setPaymentMethod('Bank In')} className={`flex-1 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'Bank In' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-surface-800 border-surface-700 text-surface-500'}`}>
                                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                   BANK IN
                                 </button>
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => { onUpdateStatus(stop.id, 'completed', { actualamount: receivedAmount, paymentmethod: paymentMethod }); setIsConfirming(false); }}
                             className="flex-1 py-4 rounded-xl bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20"
                           >
                              Confirm Performance Done
                           </button>
                           <button onClick={() => setIsConfirming(false)} className="px-4 py-4 rounded-xl bg-surface-800 text-surface-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                     </div>
                  ) : (
                     <button 
                       onClick={() => { setReceivedAmount(stop.amount); setIsConfirming(true); }}
                       className="w-full py-4 rounded-2xl bg-brand-500 text-white font-black text-xs hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20 ring-1 ring-inset ring-brand-400/50 uppercase tracking-widest"
                     >
                       Complete Performance
                     </button>
                  )}
                </div>
              )}

              {(isCompleted || isSkipped) && (
                <button 
                  onClick={() => onUpdateStatus(stop.id, 'pending')}
                  className="w-full py-3 rounded-xl bg-surface-800/80 text-surface-400 border border-surface-700/50 font-black text-[10px] hover:text-surface-100 hover:bg-surface-700 transition-all uppercase tracking-[0.2em]"
                >
                  Undo / Back to Pending
                </button>
              )}
            </div>

            {isCompleted && (
              <button 
                onClick={async () => {
                  setIsGenerating(true)
                  try { await generateAndShareReceipt(stop, settings, userProfile) }
                  catch { alert("Could not generate receipt.") }
                  finally { setIsGenerating(false) }
                }}
                disabled={isGenerating}
                className="w-full py-4 mt-3 rounded-2xl bg-blue-600 text-white font-black text-xs hover:bg-blue-500 transition-all flex justify-center items-center gap-2 shadow-xl shadow-blue-500/20 ring-1 ring-inset ring-blue-400/50 uppercase tracking-widest"
              >
                {isGenerating ? <span className="animate-pulse">Building PDF...</span> : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Send Receipt
                  </>
                )}
              </button>
            )}
        </div>
      </div>
      {renderNavModal()}
      {renderTransferModal()}
    </div>
  )
}
