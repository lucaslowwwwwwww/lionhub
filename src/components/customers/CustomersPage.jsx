import { useState, useEffect } from 'react'
import { useCustomers } from '../../hooks/useCustomers'
import { useAuth } from '../../hooks/useAuth'
import CustomerModal from './CustomerModal'
import { formatWhatsAppLink, formatPhoneForCall } from '../../utils/constants'

export default function CustomersPage() {
  const { 
    customers, 
    loading, 
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    timeoutError 
  } = useCustomers()
  
  const { userProfile } = useAuth()
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [localSearch, setLocalSearch] = useState(searchQuery)

  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer(id)
    }
  }

  const handleSave = async (customerData) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, customerData)
    } else {
      await addCustomer(customerData)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
      setPage(0) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery, setPage])

  const totalPages = Math.ceil(totalCount / pageSize)

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
            <p className="text-amber-500/70 text-xs font-medium">The customer list took longer than expected to load. Try refreshing.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Refresh
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-surface-800 pb-6 mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-100 tracking-tight">Customer Directory</h2>
          <p className="text-surface-400 mt-1 font-medium">Manage your repeating clients, sponsors, and households.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-600 text-white font-bold hover:bg-crimson-500 shadow-lg shadow-crimson-500/20 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg className="w-5 h-5 absolute left-3.5 top-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          id="search-customers"
          name="search_customers"
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search customers by name..."
          className="w-full pl-11 pr-4 py-3 bg-surface-900 border border-surface-800 rounded-xl text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-crimson-500/50 shadow-sm"
        />
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-crimson-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 border-dashed rounded-[2.5rem] p-16 text-center shadow-card bg-gradient-to-b from-surface-900 to-surface-950">
          <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6 text-surface-600">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-surface-100 mb-2">No Customers Found</h3>
          <p className="text-surface-400 max-w-md mx-auto">
            {searchQuery ? "No matches for your search." : "Build your customer CRM by adding your first client."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(customer => {
              const addresses = Array.isArray(customer.addresses) ? customer.addresses : [customer.address || '']
              const phones = Array.isArray(customer.phones) ? customer.phones : [customer.phone || '']
              
              return (
                <div key={customer.id} className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-card hover:border-surface-700 transition-colors flex flex-col h-full">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-surface-100 mb-1">{customer.name}</h3>
                    <div className="space-y-4 mt-4 text-sm text-surface-300">
                      {/* Addresses */}
                      <div className="space-y-3">
                        {addresses.map((addr, i) => {
                          const type = typeof addr === 'object' ? addr.type : 'Home'
                          const val = typeof addr === 'object' ? addr.value : addr
                          
                          return (
                            <div key={i} className="flex items-start gap-2.5">
                              <svg className="w-3.5 h-3.5 text-surface-500 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit ${
                                    type === 'Home' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {type === 'Home' ? '住家 (Home)' : '公司 (Company)'}
                                  </span>
                                  {addr.mapLink && (
                                    <a 
                                      href={addr.mapLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[8px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-0.5 uppercase tracking-tighter"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                      MAP
                                    </a>
                                  )}
                                </div>
                                <span className="leading-snug">{val}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {customer.email && (
                        <p className="flex items-center gap-2.5 mb-3">
                          <svg className="w-3.5 h-3.5 text-surface-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">{customer.email}</span>
                        </p>
                      )}

                      {/* Phones & Communication */}
                      <div className="space-y-3">
                        {phones.map((p, i) => (
                          <div key={i} className="space-y-2">
                            <p className="flex items-center gap-2.5">
                              <svg className="w-3.5 h-3.5 text-surface-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="font-medium">{p}</span>
                            </p>
                            <div className="flex items-center gap-2">
                              <a 
                                href={formatWhatsAppLink(p)} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 rounded-lg bg-green-600/10 text-green-500 font-black text-[9px] hover:bg-green-600/20 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest border border-green-600/20"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                              </a>
                              <a 
                                href={formatPhoneForCall(p)}
                                className="flex-1 py-1.5 rounded-lg bg-surface-800 text-surface-300 font-black text-[9px] hover:bg-surface-700 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest border border-surface-700"
                              >
                                <svg className="w-3 h-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                      

                      {customer.notes && (
                        <div className="mt-3 pt-3 border-t border-surface-800/50">
                          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider mb-1">Notes</p>
                          <p className="text-xs text-surface-400 italic line-clamp-2">{customer.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="mt-5 flex gap-2 pt-4 border-t border-surface-800/50">
                      <button 
                        onClick={() => handleOpenEdit(customer)}
                        className="flex-1 py-1.5 rounded-lg bg-surface-800 text-surface-300 font-semibold text-xs hover:bg-surface-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-800 text-surface-500 hover:text-crimson-400 hover:bg-crimson-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-surface-800">
            <div className="flex items-center gap-4 order-2 sm:order-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-crimson-500 hover:border-crimson-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>

              <div className="flex items-center gap-2 px-6 py-3 bg-surface-950 border border-surface-800 rounded-2xl shadow-inner">
                <span className="text-xs font-black text-surface-100 uppercase tracking-widest">{page + 1}</span>
                <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">/</span>
                <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{totalPages || 1}</span>
              </div>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-crimson-500 hover:border-crimson-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-6 order-1 sm:order-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1 pr-1">Show Results</span>
                <select 
                  id="customer-page-size"
                  name="customer_page_size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-xs font-black text-surface-200 focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner"
                >
                  {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz} per page</option>)}
                </select>
              </div>
              <div className="h-10 w-px bg-surface-800 hidden sm:block" />
              <div className="text-right">
                <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1.5">Total Records</p>
                <p className="text-xl font-black text-crimson-500 tracking-tighter leading-none">{totalCount}</p>
              </div>
            </div>
          </div>
        </>
      )
    }  {/* Modal */}
      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingCustomer={editingCustomer}
      />
    </div>
  )
}
