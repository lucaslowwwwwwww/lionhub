import React, { useState, useEffect } from 'react'

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

  // Pre-populate data if editing
  useEffect(() => {
    setTimeout(() => {
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
    }, 0)
  }, [editingItem, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-surface-800 flex justify-between items-center bg-surface-950/30">
          <div>
            <h3 className="text-xl font-black text-surface-100 tracking-tight uppercase">
              {editingItem ? 'Update Asset' : 'New Inventory Asset'}
            </h3>
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mt-1">
              {editingItem ? 'Modify existing stockpile record' : 'Register a new consumable or equipment'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-800 text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Basics */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Asset Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                  placeholder="e.g. Lion Head (New)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Category & Group</label>
                <input 
                  required
                  type="text" 
                  list="inventory-categories"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                  placeholder="e.g. Equipment"
                />
                <datalist id="inventory-categories">
                  {categories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Current Qty</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    value={formData.currentquantity}
                    onChange={(e) => setFormData({...formData, currentquantity: e.target.value})}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-black text-xl tabular-nums shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Unit Weight</label>
                  <input 
                    required
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-bold shadow-inner"
                    placeholder="e.g. Boxes"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Metadata */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Low Stock Threshold</label>
                <input 
                  required
                  type="number"
                  min="0"
                  value={formData.lowstockthreshold}
                  onChange={(e) => setFormData({...formData, lowstockthreshold: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-crimson-500 focus:outline-none focus:border-crimson-500/50 transition-all font-black text-xl tabular-nums shadow-inner"
                />
                <p className="text-[9px] text-surface-600 font-bold mt-2 ml-1 italic">Alert triggers when count reaches this value.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 ml-1">Technical Notes</label>
                <textarea 
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 py-4 text-surface-100 focus:outline-none focus:border-gold-500/50 transition-all font-medium shadow-inner resize-none text-sm"
                  placeholder="Add specific storage details or vendor info..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-4 rounded-2xl bg-surface-800 text-surface-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-surface-700 transition-all"
            >
              Discard Changes
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 rounded-2xl bg-gold-600 text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gold-500 transition-all shadow-xl shadow-gold-600/20 active:scale-[0.98]"
            >
              {editingItem ? 'Synchronize Record' : 'Deploy To Stockpile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
