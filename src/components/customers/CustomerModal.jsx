import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function CustomerModal({ isOpen, onClose, onSave, editingCustomer = null }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    addresses: [{ type: 'Home', value: '' }],
    phones: [''],
    email: '',
    notes: ''
  })

  // Synchronize form values whenever modal opens or switching edit targets
  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        // Handle migration from single string to array if necessary
        let addresses = editingCustomer.addresses || [editingCustomer.address || '']
        if (!Array.isArray(addresses)) addresses = [addresses]
        
        // Convert strings to objects if they aren't already
        addresses = addresses.map(addr => {
          if (typeof addr === 'string') return { type: 'Home', value: addr }
          return addr
        })
        
        const phones = Array.isArray(editingCustomer.phones)
          ? editingCustomer.phones
          : [editingCustomer.phone || '']

        setFormData({
          name: editingCustomer.name || '',
          addresses: addresses.length > 0 ? addresses : [{ type: 'Home', value: '' }],
          phones: phones.length > 0 ? phones : [''],
          email: editingCustomer.email || '',
          notes: editingCustomer.notes || ''
        })
      } else {
        setFormData({
          name: '',
          addresses: [{ type: 'Home', value: '' }],
          phones: [''],
          email: '',
          notes: ''
        })
      }
      setError('')
      setSaving(false)
    }
  }, [isOpen, editingCustomer])

  if (!isOpen) return null

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleAddField = (field) => {
    if (field === 'addresses') {
      setFormData({
        ...formData,
        addresses: [...formData.addresses, { type: 'Home', value: '', mapLink: '' }]
      })
    } else {
      setFormData({
        ...formData,
        phones: [...formData.phones, '']
      })
    }
  }

  const handleRemoveField = (field, index) => {
    const newArr = [...formData[field]]
    newArr.splice(index, 1)
    
    let defaultValue = ''
    if (field === 'addresses') defaultValue = { type: 'Home', value: '', mapLink: '' }
    else defaultValue = ''

    setFormData({
      ...formData,
      [field]: newArr.length > 0 ? newArr : [defaultValue]
    })
  }

  const handleFieldChange = (field, index, value) => {
    const newArr = [...formData[field]]
    newArr[index] = value
    setFormData({
      ...formData,
      [field]: newArr
    })
  }

  const handleAddressTypeChange = (index, type) => {
    const newAddresses = [...formData.addresses]
    newAddresses[index].type = type
    setFormData({ ...formData, addresses: newAddresses })
  }

  const handleAddressValueChange = (index, value) => {
    const newAddresses = [...formData.addresses]
    newAddresses[index].value = value
    setFormData({ ...formData, addresses: newAddresses })
  }

  const handleAddressMapLinkChange = (index, link) => {
    const newAddresses = [...formData.addresses]
    newAddresses[index].mapLink = link
    setFormData({ ...formData, addresses: newAddresses })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    
    // Clean up empty entries
    const cleanedData = {
      ...formData,
      addresses: formData.addresses.filter(a => a.value.trim() !== ''),
      phones: formData.phones.filter(p => p.trim() !== '')
    }

    if (cleanedData.addresses.length === 0) cleanedData.addresses = [{ type: 'Home', value: '' }]
    if (cleanedData.phones.length === 0) cleanedData.phones = ['']

    try {
      await onSave(cleanedData)
      onClose()
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      setError('Failed to save to database. Missing permissions or Troupe isn\'t assigned.')
    } finally {
      setSaving(false)
    }
  }

  return (
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85dvh]">
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-950/50 shrink-0">
          <h3 className="text-xl font-bold text-surface-100">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-5 overflow-y-auto overscroll-contain flex-1 min-h-0 touch-pan-y">
          {error && (
            <div className="bg-crimson-500/10 border border-crimson-500/20 rounded-lg px-4 py-3 text-crimson-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="customer-name" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Customer / Company Name</label>
            <input 
              id="customer-name"
              name="name"
              required
              type="text" 
              autoComplete="organization"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              placeholder="e.g. Tan Family Estate"
            />
          </div>

          {/* Addresses */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="block text-xs font-semibold text-surface-400 uppercase tracking-wide">Addresses</span>
              <button 
                type="button"
                onClick={() => handleAddField('addresses')}
                className="text-[10px] font-bold text-crimson-500 hover:text-crimson-400 uppercase tracking-widest"
              >
                + Add Address
              </button>
            </div>
            {formData.addresses.map((addr, idx) => (
              <div key={idx} className="space-y-2 p-3 bg-surface-950/50 rounded-xl border border-surface-800/50">
                <div className="flex justify-between items-center">
                  <div className="flex bg-surface-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleAddressTypeChange(idx, 'Home')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        addr.type === 'Home' 
                          ? 'bg-surface-600 text-white shadow-sm' 
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      住家 (Home)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddressTypeChange(idx, 'Company')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        addr.type === 'Company' 
                          ? 'bg-surface-600 text-white shadow-sm' 
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      公司 (Company)
                    </button>
                  </div>
                  {formData.addresses.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => handleRemoveField('addresses', idx)}
                      className="text-surface-600 hover:text-crimson-500 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                <textarea 
                  id={`customer-address-${idx}`}
                  name={`address_${idx}`}
                  aria-label={`Full Address for ${addr.type}`}
                  required
                  rows={2}
                  autoComplete="street-address"
                  value={addr.value}
                  onChange={(e) => handleAddressValueChange(idx, e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all resize-none"
                  placeholder={`Full Address for ${addr.type === 'Home' ? 'Home' : 'Company'}`}
                />
                <div className="relative">
                  <input 
                    id={`customer-maplink-${idx}`}
                    name={`maplink_${idx}`}
                    aria-label="Google Maps or Waze link"
                    type="text"
                    value={addr.mapLink || ''}
                    onChange={(e) => handleAddressMapLinkChange(idx, e.target.value)}
                    className="w-full bg-surface-950 border border-surface-800 rounded-lg pl-9 pr-4 py-2 text-xs text-surface-400 focus:outline-none focus:border-blue-500 focus:text-surface-100 transition-all"
                    placeholder="Paste Google Maps / Waze link (Optional)"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phones */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="block text-xs font-semibold text-surface-400 uppercase tracking-wide">Phone Numbers</span>
              <button 
                type="button"
                onClick={() => handleAddField('phones')}
                className="text-[10px] font-bold text-crimson-500 hover:text-crimson-400 uppercase tracking-widest"
              >
                + Add Phone
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {formData.phones.map((p, idx) => (
                <div key={idx} className="relative">
                  <input 
                    id={`customer-phone-${idx}`}
                    name={`phone_${idx}`}
                    aria-label={`Phone ${idx + 1}`}
                    required
                    type="text" 
                    autoComplete="tel"
                    value={p}
                    onChange={(e) => handleFieldChange('phones', idx, e.target.value)}
                    className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all pr-10"
                    placeholder={`Phone ${idx + 1}`}
                  />
                  {formData.phones.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => handleRemoveField('phones', idx)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-600 hover:text-crimson-500 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="customer-email" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Email (Optional)</label>
            <input 
              id="customer-email"
              name="email"
              type="text" 
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              placeholder="client@email.com"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="customer-notes" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Notes / Preferences (Optional)</label>
            <textarea 
              id="customer-notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all resize-none"
              placeholder="e.g. Prefers morning performances"
            />
            </div>
          </div>

          <div className="p-6 border-t border-surface-800 flex gap-3 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-400 font-black text-[10px] uppercase tracking-widest hover:bg-surface-700 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 py-4 rounded-2xl bg-crimson-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-crimson-500 shadow-xl shadow-crimson-900/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingCustomer ? 'Update CRM' : 'Save to CRM'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
