import { useState, useEffect, useMemo, useRef } from 'react'

const CATEGORIES = [
  'Performances',
  'Equipment',
  'Uniforms',
  'Transportation',
  'Food',
  'Beverages',
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

export function AddTransactionModal({ isOpen, onClose, onSave, initialData = null, troupes = [], transactions = [] }) {
  const now = new Date()
  const localDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]

  const [prevInitialData, setPrevInitialData] = useState(undefined)
  const [prevIsOpen, setPrevIsOpen] = useState(false)

  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const [customCategoryText, setCustomCategoryText] = useState('')

  const [deletedCategories, setDeletedCategories] = useState(() => {
    try {
      const stored = localStorage.getItem('deleted_finance_categories')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: CATEGORIES[0],
    date: localDateStr,
    paymentmethod: 'Cash',
    description: '',
    troupeid: ''
  })

  if (initialData !== prevInitialData || isOpen !== prevIsOpen) {
    setPrevInitialData(initialData)
    setPrevIsOpen(isOpen)

    const targetType = initialData?.type || 'expense'
    const activeCats = targetType === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES

    if (initialData) {
      const initialCategory = initialData.category || ''
      const isCustom = initialCategory !== '' && !activeCats.includes(initialCategory)

      setIsCustomCategory(isCustom)
      setCustomCategoryText(isCustom ? initialCategory : '')

      setFormData({
        type: targetType,
        amount: initialData.amount || '',
        category: isCustom ? 'CUSTOM' : (initialCategory || activeCats[0]),
        date: initialData.date || localDateStr,
        paymentmethod: initialData.paymentmethod || initialData.paymentMethod || 'Cash',
        description: initialData.description || '',
        troupeid: initialData.troupeid || initialData.troupeId || ''
      })
    } else {
      setIsCustomCategory(false)
      setCustomCategoryText('')
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
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showTroupeSelector = true
  const availableTroupes = troupes

  const activeCategories = useMemo(() => {
    const baseCategories = formData.type === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES
    
    // Gather categories used in historical transactions matching the current type
    const historicalCats = (transactions || [])
      .filter(t => t.type === formData.type && t.category && t.category !== 'CUSTOM')
      .map(t => t.category)
      
    // Extract unique custom categories (that aren't already in base presets)
    const uniqueCustomHistorical = Array.from(new Set(historicalCats))
      .filter(cat => !baseCategories.includes(cat))
      // Filter out items explicitly deleted by the user
      .filter(cat => !deletedCategories.includes(cat))
      .sort((a, b) => a.localeCompare(b))

    return [...baseCategories, ...uniqueCustomHistorical]
  }, [transactions, formData.type, deletedCategories])

  const handleTypeChange = (newType) => {
    const newCategories = newType === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES
    setIsCustomCategory(false)
    setCustomCategoryText('')
    setFormData({ 
      ...formData, 
      type: newType,
      category: newCategories[0], 
      troupeid: newType === 'sponsorship' ? '' : formData.troupeid
    })
  }

  const handleCategorySelection = (selected) => {
    if (selected === 'CUSTOM') {
      setIsCustomCategory(true)
      setFormData({ ...formData, category: 'CUSTOM' })
    } else {
      setIsCustomCategory(false)
      setCustomCategoryText('')
      setFormData({ ...formData, category: selected })
    }
  }

  const handleDeleteCategory = (e, categoryToDelete) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Remove "${categoryToDelete}" from your selectable category list?`)) {
      const updated = [...deletedCategories, categoryToDelete]
      setDeletedCategories(updated)
      localStorage.setItem('deleted_finance_categories', JSON.stringify(updated))
      
      // Fallback selection if current category is deleted
      if (formData.category === categoryToDelete) {
        const baseCategories = formData.type === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES
        setFormData(prev => ({ ...prev, category: baseCategories[0] }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const finalCategory = isCustomCategory ? customCategoryText.trim() : formData.category
    
    if (!finalCategory || finalCategory === 'CUSTOM') {
      alert('Please enter or select a category.')
      return
    }

    try {
      await onSave({
        ...formData,
        category: finalCategory,
        amount: Number(formData.amount)
      })
      onClose()
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      alert('Error: ' + (err.message || 'Failed to save transaction'))
    }
  }

  if (!isOpen) return null

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
              <label htmlFor="finance-amount" className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Amount (RM)</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <input
                  id="finance-amount"
                  name="amount"
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
              <label htmlFor="finance-date" className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Date</label>
              <div className="overflow-hidden rounded-xl border border-surface-800">
                <input
                  id="finance-date"
                  name="date"
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
            <div className="space-y-1.5 min-w-0 relative" ref={dropdownRef}>
              <label htmlFor="finance-category-btn" className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Category</label>
              
              {/* Dropdown Trigger Button */}
              <button
                id="finance-category-btn"
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex justify-between items-center w-full h-[46px] bg-surface-950 px-4 rounded-xl border border-surface-800 text-sm font-bold text-surface-100 hover:border-surface-700 transition-all shadow-inner cursor-pointer"
              >
                <span className="truncate">
                  {formData.category === 'CUSTOM' ? '+ Custom Category...' : formData.category}
                </span>
                <svg className={`w-4 h-4 text-surface-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 z-[110] mt-1 overflow-hidden rounded-xl border border-surface-800 bg-surface-900 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col max-h-60">
                  <div className="overflow-y-auto flex-1 py-1 scrollbar-thin scrollbar-thumb-surface-800">
                    {activeCategories.map(cat => {
                      const isBase = (formData.type === 'sponsorship' ? SPONSOR_CATEGORIES : CATEGORIES).includes(cat)
                      return (
                        <div
                          key={cat}
                          onClick={() => {
                            handleCategorySelection(cat)
                            setIsDropdownOpen(false)
                          }}
                          className={`group flex justify-between items-center px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                            formData.category === cat 
                              ? 'bg-crimson-600/20 text-crimson-400' 
                              : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          
                          {/* Delete Cross Button (only for custom items) */}
                          {!isBase && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCategory(e, cat)}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded hover:bg-crimson-950 hover:text-crimson-500 transition-all text-surface-500 ml-2 flex-shrink-0"
                              title="Delete from category list"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Anchored '+ Custom Category...' Option */}
                    <div
                      onClick={() => {
                        handleCategorySelection('CUSTOM')
                        setIsDropdownOpen(false)
                      }}
                      className={`flex items-center px-4 py-3 text-xs font-black tracking-wider border-t border-surface-800/60 transition-colors cursor-pointer ${
                        formData.category === 'CUSTOM'
                          ? 'bg-crimson-600/20 text-crimson-400'
                          : 'text-crimson-500 hover:bg-crimson-950/30 hover:text-crimson-400'
                      }`}
                    >
                      + Custom Category...
                    </div>
                  </div>
                </div>
              )}

              {isCustomCategory && (
                <div className="animate-in slide-in-from-top-1 fade-in duration-200 overflow-hidden rounded-xl border border-surface-800 bg-surface-950 mt-1.5">
                  <input
                    id="finance-custom-category"
                    name="custom_category"
                    type="text"
                    required
                    placeholder="Enter custom category name..."
                    value={customCategoryText}
                    onChange={(e) => setCustomCategoryText(e.target.value)}
                    className="block w-full max-w-full h-[40px] bg-surface-950 px-4 text-xs font-bold text-surface-100 placeholder:text-surface-700 focus:outline-none focus:border-crimson-600 transition-all shadow-inner border-none"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1 mb-1.5 block">Method</span>
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
            <label htmlFor="finance-description" className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Description (Optional)</label>
            <textarea
              id="finance-description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-sm font-bold text-surface-100 placeholder:text-surface-700 focus:outline-none focus:border-crimson-600 transition-all shadow-inner min-h-[80px]"
              placeholder="Enter details..."
            />
          </div>

          {/* Conditional Troupe Selector */}
          {showTroupeSelector && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="finance-troupe" className="text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Attribute to Team</label>
              <div className="relative overflow-hidden rounded-xl border border-surface-800 bg-surface-950">
                <select
                  id="finance-troupe"
                  name="troupeid"
                  value={formData.troupeid}
                  onChange={(e) => setFormData({ ...formData, troupeid: e.target.value })}
                  className="block w-full h-[46px] bg-surface-950 pl-4 pr-10 text-sm font-bold text-surface-100 focus:outline-none focus:border-crimson-600 appearance-none transition-all shadow-inner border-none cursor-pointer"
                >
                  <option value="" className="bg-surface-900 text-surface-100">General / All Teams</option>
                  {availableTroupes.map(troupe => (
                    <option key={troupe.id} value={troupe.id} className="bg-surface-900 text-surface-100">
                      {troupe.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                  <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
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
