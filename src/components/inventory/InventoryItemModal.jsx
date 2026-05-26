import React, { useState } from 'react'

/**
 * InventoryItemModal
 * Professional modal for creating and editing inventory items with metadata.
 */
export default function InventoryItemModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories = [], 
  editingItem = null 
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    currentquantity: 0,
    lowstockthreshold: 5,
    unit: 'pcs',
    notes: ''
  })

  const [prevEditingItemId, setPrevEditingItemId] = useState(null)
  const [prevIsOpen, setPrevIsOpen] = useState(false)

  // Pre-populate data if editing
  if (isOpen !== prevIsOpen || editingItem?.id !== prevEditingItemId) {
    setPrevIsOpen(isOpen)
    setPrevEditingItemId(editingItem?.id)
    if (editingItem) {
      setFormData({
        name: editingItem.name || editingItem.itemName || '',
        category: editingItem.category || '',
        currentquantity: editingItem.currentquantity || editingItem.currentQuantity || 0,
        lowstockthreshold: editingItem.lowstockthreshold || editingItem.lowStockThreshold || 5,
        unit: editingItem.unit || 'pcs',
        notes: editingItem.notes || ''
      })
    } else {
      setFormData({
        name: '',
        category: '',
        currentquantity: 0,
        lowstockthreshold: 5,
        unit: 'pcs',
        notes: ''
      })
    }
  }

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-[2rem] w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-950/30">
          <div>
            <h3 className="text-lg font-black text-surface-100 tracking-tight uppercase">
              {editingItem ? 'Update Asset' : 'New Inventory Asset'}
            </h3>
            <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mt-0.5">
              {editingItem ? 'Modify existing stockpile record' : 'Register a new consumable or equipment'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-800 text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Asset Name</label>
              <input 
                id="asset-name"
                name="asset_name"
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 h-11 text-xs text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                placeholder="e.g. Lion Head (New)"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Category & Group</label>
              <input 
                id="asset-category"
                name="asset_category"
                required
                type="text" 
                list="inventory-categories"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 h-11 text-xs text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                placeholder="e.g. Equipment"
              />
              <datalist id="inventory-categories">
                {categories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1 truncate">Current Qty</label>
                <input 
                  id="asset-quantity"
                  name="asset_quantity"
                  required
                  type="number"
                  min="0"
                  value={formData.currentquantity}
                  onChange={(e) => setFormData({...formData, currentquantity: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 h-11 text-xs text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-black tabular-nums shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1 truncate">Low Limit</label>
                <input 
                  id="asset-low-threshold"
                  name="asset_low_threshold"
                  required
                  type="number"
                  min="0"
                  value={formData.lowstockthreshold}
                  onChange={(e) => setFormData({...formData, lowstockthreshold: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 h-11 text-xs text-crimson-500 focus:outline-none focus:border-crimson-500/50 transition-all font-black tabular-nums shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1 truncate">Unit</label>
                <input 
                  id="asset-unit"
                  name="asset_unit"
                  required
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 h-11 text-xs text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                  placeholder="e.g. pcs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Technical Notes</label>
              <textarea 
                id="asset-notes"
                name="asset_notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 py-2.5 text-xs text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-medium shadow-inner resize-none h-20"
                placeholder="Add specific storage details or vendor info..."
              />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-800/60 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-surface-800 text-surface-300 text-[9px] font-black uppercase tracking-wider hover:bg-surface-700 transition-all"
            >
              Discard
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gold-600 text-black text-[9px] font-black uppercase tracking-wider hover:bg-gold-500 transition-all shadow-xl shadow-gold-600/20 active:scale-[0.98]"
            >
              {editingItem ? 'Save Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
