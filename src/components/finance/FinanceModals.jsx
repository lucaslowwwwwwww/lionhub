import { useState, useEffect } from 'react'

const CATEGORIES = [
  'Performances',
  'Equipment',
  'Uniforms',
  'Transportation',
  'Food & Beverages',
  'Membership Fees',
  'Competition Fees',
  'Repairs',
  'Miscellaneous'
]

const SPONSOR_CATEGORIES = [
  'Main Sponsor',
  'Equipment Sponsor',
  'Uniform Sponsor',
  'Event Sponsor',
  'Individual Donor',
  'Corporate Sponsor',
  'Other'
]

export function AddTransactionModal({ isOpen, onClose, onSave, initialData = null, troupes = [], dateTroupes = {} }) {
  const now = new Date()
  const localDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        type: initialData.type || 'expense',
        amount: initialData.amount || '',
        category: initialData.category || CATEGORIES[0],
        date: initialData.date || localDateStr,
        paymentmethod: initialData.paymentmethod || initialData.paymentMethod || 'Cash',
        description: initialData.description || '',
        troupeid: initialData.troupeid || initialData.troupeId || ''
      }
    }
    return {
      type: 'expense',
      amount: '',
      category: CATEGORIES[0],
      date: localDateStr,
      paymentmethod: 'Cash',
      description: '',
      troupeid: ''
    }
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'expense',
        amount: initialData.amount || '',
        category: initialData.category || CATEGORIES[0],
        date: initialData.date || localDateStr,
        paymentmethod: initialData.paymentmethod || initialData.paymentMethod || 'Cash',
        description: initialData.description || '',
        troupeid: initialData.troupeid || initialData.troupeId || ''
      })
    } else {
      setFormData({
        type: 'expense',
        amount: '',
        category: CATEGORIES[0],
        date: localDateStr,
        paymentmethod: 'Cash',
        description: '',
        troupeid: ''
      })
    }
  }, [initialData, isOpen, localDateStr])

  const showTroupeSelector = true
  const availableTroupes = troupes

  if (!isOpen) return null

  const activeCategories = formData.type === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES

  const handleTypeChange = (newType) => {
    const newCategories = newType === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES
    setFormData({ 
      ...formData, 
      type: newType,
      category: newCategories[0], // Reset to default for the new type
      troupeid: newType === 'sponsorship' ? '' : formData.troupeid
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await onSave({
        ...formData,
        amount: Number(formData.amount)
      })
      onClose()
    } catch (err) {
      console.error('Failed to save transaction:', err)
      alert('Error: ' + (err.message || 'Failed to save transaction'))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-surface-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-surface-50 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-crimson-600/10 text-crimson-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            {initialData ? 'Edit Record' : 'New Finance Record'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-800 text-surface-400 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="flex bg-surface-950/50 p-1 rounded-2xl border border-surface-800 shadow-inner">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                formData.type === 'income' 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-[0.98]' 
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('sponsorship')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                formData.type === 'sponsorship' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[0.98]' 
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Sponsorship
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                formData.type === 'expense' 
                  ? 'bg-crimson-600 text-white shadow-lg shadow-crimson-500/20 scale-[0.98]' 
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Expense
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Amount (RM)</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="block w-full max-w-full h-[46px] bg-surface-950 px-4 text-sm font-bold text-surface-100 placeholder:text-surface-700 focus:outline-none focus:border-crimson-600 transition-all shadow-inner leading-[46px] box-border border-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Date</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="block w-full max-w-full h-[46px] bg-surface-950 px-4 text-sm font-bold text-surface-100 focus:outline-none focus:border-crimson-600 transition-all shadow-inner leading-[46px] box-border border-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Category</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <input
                  type="text"
                  list="finance-categories"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full max-w-full h-[46px] bg-surface-950 px-4 text-sm font-bold text-surface-100 focus:outline-none focus:border-crimson-600 transition-all shadow-inner border-none leading-[46px]"
                  placeholder="Select or type..."
                />
                <datalist id="finance-categories">
                  {activeCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Method</label>
              <div className="flex bg-surface-950/50 p-1 rounded-xl border border-surface-800 h-[46px] box-border">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentmethod: 'Cash' })}
                  className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    formData.paymentmethod === 'Cash' 
                      ? 'bg-surface-800 text-gold-400 shadow-md' 
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentmethod: 'Bank In' })}
                  className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    formData.paymentmethod === 'Bank In' 
                      ? 'bg-surface-800 text-gold-400 shadow-md' 
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Bank In
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-sm font-bold text-surface-100 placeholder:text-surface-700 focus:outline-none focus:border-crimson-600 transition-all shadow-inner min-h-[80px]"
              placeholder="Enter details..."
            />
          </div>

          {/* Conditional Troupe Selector */}
          {showTroupeSelector && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Attribute to Team</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <select
                  value={formData.troupeid}
                  onChange={(e) => setFormData({ ...formData, troupeid: e.target.value })}
                  className="block w-full h-[46px] bg-surface-950 px-4 text-sm font-bold text-surface-100 focus:outline-none focus:border-crimson-600 appearance-none transition-all shadow-inner border-none"
                >
                  <option value="">General / All Teams</option>
                  {availableTroupes.map(troupe => (
                    <option key={troupe.id} value={troupe.id}>{troupe.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-2xl bg-surface-800 text-surface-300 font-bold hover:bg-surface-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3.5 rounded-2xl bg-crimson-600 text-white font-black uppercase tracking-widest text-xs hover:bg-crimson-500 shadow-lg shadow-crimson-500/20 transition-all"
            >
              {initialData ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
