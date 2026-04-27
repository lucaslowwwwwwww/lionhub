import { useSettings } from '../../hooks/useSettings'
import { useState } from 'react'

export default function MapView({ stops }) {
  const { settings } = useSettings()
  const baseAddress = settings.baseLocation || "23, Jalan Imj 2, Melaka"
  const [isNavigating, setIsNavigating] = useState(false)

  // Generate the native Google Maps deep link (Free, requires no API key, opens phone GPS)
  const getNativeMapsLink = () => {
    if (stops.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseAddress)}`
    }

    const origin = encodeURIComponent(baseAddress)
    const destination = encodeURIComponent(stops[stops.length - 1].address || stops[stops.length - 1].householdName)
    
    let waypoints = ''
    if (stops.length > 1) {
      const wpParams = stops.slice(0, -1).map(s => encodeURIComponent(s.address || s.householdName)).join('|')
      waypoints = `&waypoints=${wpParams}`
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`
  }

  const getWazeLink = () => {
    if (stops.length === 0) {
      return `https://waze.com/ul?q=${encodeURIComponent(baseAddress)}&navigate=yes`
    }
    // Waze routing typically only supports one destination via universal links 
    const finalDest = encodeURIComponent(stops[stops.length - 1].address || stops[stops.length - 1].householdName)
    return `https://waze.com/ul?q=${finalDest}&navigate=yes`
  }

  const renderNavModal = () => {
    if (!isNavigating) return null
  
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }}>
        <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mt-auto sm:mt-0 transition-transform animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
           <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 backdrop-blur-md">
             <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">Navigate Route</h3>
             <button onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="text-surface-400 hover:text-surface-100 transition-colors p-2 hover:bg-surface-800 rounded-full">✕</button>
           </div>
           <div className="p-4 flex flex-col gap-3">
             <a href={getNativeMapsLink()} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="flex items-center gap-4 p-5 rounded-2xl bg-surface-950 border border-surface-800 text-surface-100 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group">
               <div className="text-left">
                 <p className="font-bold text-base sm:text-lg">Google Maps</p>
                 <p className="text-[10px] text-surface-500 uppercase tracking-widest font-black mt-1 text-pretty">Full Route w/ Waypoints</p>
               </div>
             </a>
             <a href={getWazeLink()} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setIsNavigating(false); }} className="flex items-center gap-4 p-5 rounded-2xl bg-surface-950 border border-surface-800 text-surface-100 hover:border-[#33ccff]/50 hover:bg-[#33ccff]/5 transition-all group">
               <div className="text-left">
                 <p className="font-bold text-base sm:text-lg">Waze App</p>
                 <p className="text-[10px] text-surface-500 uppercase tracking-widest font-black mt-1 text-pretty">Skip to Final Destination</p>
               </div>
             </a>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-card mb-6">
      {/* Map Header */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-surface-100 font-bold flex items-center gap-2">
            <span>🗺️</span> Full Route Navigation
          </h3>
          <p className="text-xs text-surface-400 mt-1">
            Starts from base at <strong className="text-surface-200">{baseAddress}</strong>
          </p>
        </div>

        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNavigating(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-600/10 text-brand-400 border border-brand-500/20 rounded-lg text-sm font-semibold hover:bg-brand-600/20 transition-colors focus:outline-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open Entire Route in Maps
        </button>
      </div>
      {renderNavModal()}
    </div>
  )
}
