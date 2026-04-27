import React from 'react'
import InventoryItemCard from './InventoryItemCard'

/**
 * InventoryList
 * Component to display items grouped by category.
 */
export default function InventoryList({ groupedItems, onUpdate, onEdit, onDelete }) {
  const categories = Object.keys(groupedItems).sort()

  if (categories.length === 0) {
// ... (empty state)
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
        <svg className="w-16 h-16 mb-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-bold uppercase tracking-widest">Inventory is empty</p>
        <p className="text-xs mt-1">Add items to begin tracking.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-32">
      {categories.map((category) => (
        <section key={category} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Category Header */}
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-surface-400 whitespace-nowrap pl-1">
              {category} Range
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-surface-800 to-transparent"></div>
          </div>

          {/* Items in this category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedItems[category].map((item) => (
              <InventoryItemCard 
                key={item.id} 
                item={item} 
                onUpdate={onUpdate} 
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
