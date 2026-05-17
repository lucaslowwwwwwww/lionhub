import React, { useState } from 'react'
import { useInventory } from '../../hooks/useInventory'
import InventoryList from './InventoryList'
import InventoryItemModal from './InventoryItemModal'

/**
 * InventoryPage
 * The top-level component that manages inventory counting and states.
 */
export default function InventoryPage() {
  const { groupedItems, loading, error, timeoutError, updateQuantity, updateItem, addItem, deleteItem } = useInventory()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const categories = ['All', ...Object.keys(groupedItems).sort()]

  const handleOpenAdd = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSaveItem = async (formData) => {
    if (editingItem) {
      await updateItem(editingItem.id, formData)
    } else {
      await addItem(formData)
    }
  }

  // Filter Logic
  const filteredGroups = Object.entries(groupedItems).reduce((acc, [category, items]) => {
    if (selectedCategory !== 'All' && category !== selectedCategory) return acc

    const filteredItems = items.filter(item => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLowStock = showLowStockOnly ? (item.currentquantity <= item.lowstockthreshold) : true
      return matchesSearch && matchesLowStock
    })

    if (filteredItems.length > 0) {
      acc[category] = filteredItems
    }
    return acc
  }, {})

  if (loading) {
// ... (loading state)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-surface-800 border-t-gold-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">
          Loading Inventory...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-crimson-500/10 border border-crimson-500/20 rounded-2xl text-center">
        <p className="text-crimson-400 font-bold mb-2">Error Loading Inventory</p>
        <p className="text-xs text-surface-400">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {timeoutError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-bold">Slow connection detected</p>
            <p className="text-amber-500/70 text-xs font-medium">The inventory list took longer than expected to load. Try refreshing.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Refresh
          </button>
        </div>
      )}
      <header className="mb-12 pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500 shadow-glow-gold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h1 className="text-4xl font-black text-surface-50 tracking-tighter uppercase">Logistics Hub</h1>
          </div>
          <p className="text-surface-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Stockpile monitoring & resource deployment</p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-3 bg-gold-600 hover:bg-gold-500 text-black px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-gold-500/20 active:scale-95 group shrink-0"
        >
          <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Enroll New Asset
        </button>
      </header>

      {/* Control Bar */}
      <section className="bg-surface-900/60 border border-surface-800 p-4 rounded-3xl backdrop-blur-md mb-8 flex flex-col lg:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600 group-focus-within:text-gold-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search assets by name or batch ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-950 border border-surface-800 rounded-2xl h-14 pl-12 pr-6 text-sm text-surface-100 font-bold focus:outline-none focus:border-gold-500/50 transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 lg:w-48 bg-surface-950 border border-surface-800 rounded-2xl h-14 px-6 pr-12 text-[10px] font-black uppercase text-surface-400 focus:outline-none focus:border-gold-500/50 transition-all shadow-inner cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%223%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1.25rem_center] bg-no-repeat"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat} Group</option>)}
          </select>

          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`h-14 px-6 rounded-2xl border flex items-center gap-3 transition-all ${
              showLowStockOnly 
                ? 'bg-crimson-500/10 border-crimson-500/50 text-crimson-400' 
                : 'bg-surface-950 border-surface-800 text-surface-600 hover:text-surface-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${showLowStockOnly ? 'bg-crimson-500 animate-pulse shadow-glow-crimson' : 'bg-surface-700'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Low Stock Only</span>
          </button>
        </div>
      </section>

      {Object.keys(filteredGroups).length === 0 ? (
        <div className="py-20 text-center bg-surface-900/40 border border-surface-800 border-dashed rounded-[3rem]">
          <svg className="w-16 h-16 text-surface-800 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <h3 className="text-surface-300 font-black uppercase text-sm tracking-widest">No matching records found</h3>
          <p className="text-surface-600 text-xs mt-2 font-medium">Clear your filters or search terms to see all assets.</p>
        </div>
      ) : (
        <InventoryList 
          groupedItems={filteredGroups} 
          onUpdate={updateQuantity} 
          onEdit={handleOpenEdit}
          onDelete={deleteItem}
        />
      )}

      <InventoryItemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        categories={Object.keys(groupedItems)}
      />
    </div>
  )
}
