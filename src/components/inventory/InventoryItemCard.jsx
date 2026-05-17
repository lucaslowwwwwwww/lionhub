import React from 'react'

/**
 * InventoryItemCard
 * Individual item card with controls for quantity adjustment.
 */
export default function InventoryItemCard({ item, onUpdate, onEdit, onDelete }) {
  const { id, name, currentquantity, lowstockthreshold, unit, lastupdated, notes } = item
  const itemName = name || item.itemName || 'Unnamed'
  const currentQuantity = currentquantity || item.currentQuantity || 0
  const lowStockThreshold = lowstockthreshold || item.lowStockThreshold || 0
  const lastUpdated = lastupdated || item.lastUpdated
  
  const isOutOfStock = currentQuantity <= 0
  const isLowStock = !isOutOfStock && currentQuantity <= lowStockThreshold

  const formatTime = (isoString) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    return date.toLocaleString('en-MY', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`group bg-surface-900/40 border p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] transition-all hover:bg-surface-800/40 hover:shadow-2xl hover:shadow-black/20 flex flex-col gap-3 sm:gap-4 ${
      isOutOfStock ? 'border-crimson-500/30' : isLowStock ? 'border-amber-500/30' : 'border-surface-800'
    }`}>
      {/* Header Area */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <div className="mb-1">
            <h3 className="text-surface-50 font-black text-sm uppercase tracking-tight truncate">{itemName}</h3>
            {notes && (
              <p className="text-[11px] sm:text-xs text-surface-400 font-medium mt-1 mb-2 leading-relaxed break-words border-l-2 border-surface-800 pl-2 text-left">
                {notes}
              </p>
            )}
          </div>
          <p className="text-[9px] sm:text-[10px] font-black text-surface-600 uppercase tracking-widest italic">Updated: {formatTime(lastUpdated)}</p>
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(item)}
            className="p-1.5 sm:p-2 text-surface-500 hover:text-gold-500 hover:bg-gold-500/10 rounded-xl transition-all"
            title="Edit Asset"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button 
            onClick={() => {
              if (window.confirm(`Permanently de-list "${itemName}"?`)) {
                onDelete(id)
              }
            }}
            className="p-1.5 sm:p-2 text-surface-500 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-xl transition-all"
            title="De-list"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2">
        {isOutOfStock ? (
          <span className="px-2 py-0.5 rounded-md bg-crimson-500/10 text-crimson-500 text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-crimson-500/20 shadow-glow-crimson animate-pulse">Empty</span>
        ) : isLowStock ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-amber-500/20 shadow-glow-amber">Low Stock</span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">Secured</span>
        )}
      </div>

      {/* Quantity & Controls */}
      <div className="flex items-center justify-between mt-auto bg-surface-950/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
        <button 
          onClick={() => onUpdate(id, -1)}
          disabled={currentQuantity <= 0}
          className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl transition-all active:scale-95 ${
            currentQuantity > 0 
              ? 'text-surface-400 hover:text-white hover:bg-surface-800' 
              : 'text-surface-800 pointer-events-none'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
        </button>

        <div className="flex flex-col items-center">
          <span className={`text-lg sm:text-2xl font-black tabular-nums tracking-tighter leading-none ${
            isOutOfStock ? 'text-crimson-500' : isLowStock ? 'text-amber-500' : 'text-surface-50'
          }`}>
            {currentQuantity}
          </span>
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-surface-600 mt-0.5">{unit || 'pcs'}</span>
        </div>

        <button 
          onClick={() => onUpdate(id, 1)}
          className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 transition-all active:scale-95"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
        </button>
      </div>
    </div>
  )
}
