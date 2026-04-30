import React, { useEffect } from 'react'

/**
 * Premium Toast Notification Component
 * Matches the system's crimson/surface aesthetic.
 */
export default function Toast({ message, type = 'error', onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const icons = {
    error: (
      <svg className="w-5 h-5 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  const borderColors = {
    error: 'border-crimson-500/20',
    success: 'border-green-500/20',
    warning: 'border-gold-500/20'
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto">
      <div className={`bg-surface-900/90 backdrop-blur-xl border ${borderColors[type] || 'border-surface-800'} rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md animate-in slide-in-from-top-4 duration-300`}>
        <div className="p-2 bg-surface-950 rounded-xl shadow-inner">
          {icons[type] || icons.error}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-0.5">Notification</p>
          <p className="text-sm font-bold text-surface-100 leading-tight">{message}</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-surface-800 rounded-lg text-surface-500 hover:text-surface-200 transition-all active:scale-90"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
