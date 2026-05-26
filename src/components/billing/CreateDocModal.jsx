import { useState } from 'react'
import { useCustomers } from '../../hooks/useCustomers'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import { generateBillingPDF } from '../../utils/billingUtils'

export default function CreateDocModal({ isOpen, onClose }) {
  const { customers } = useCustomers()
  const { settings } = useSettings()
  const { userProfile } = useAuth()
  
  const [formData, setFormData] = useState({
    type: 'QUOTATION',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    performanceDate: new Date().toISOString().split('T')[0],
    description: 'CNY Lion Dance Performance',
    amount: '',
    quantity: 1
  })

  const [saving, setSaving] = useState(false)

  const handleSelectCustomer = (name) => {
    const customer = customers.find(c => c.name === name)
    if (customer) {
      setFormData({
        ...formData,
        customerName: name,
        customerAddress: Array.isArray(customer.addresses) ? customer.addresses[0]?.value || '' : customer.address || '',
        customerPhone: Array.isArray(customer.phones) ? customer.phones[0] || '' : customer.phone || ''
      })
    } else {
      setFormData({ ...formData, customerName: name })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await generateBillingPDF(formData, settings, userProfile, formData.type)
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to generate document.")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-950/50">
          <h3 className="text-xl font-black text-surface-50 uppercase tracking-tight">Custom Document</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3 bg-surface-950 p-1.5 rounded-2xl border border-surface-800">
            {['QUOTATION', 'INVOICE'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, type: t })}
                className={`py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                  formData.type === t ? 'bg-crimson-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="doc-customer-name" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Customer Name</label>
              <input 
                id="doc-customer-name"
                name="doc_customer_name"
                required
                list="billing-customers"
                value={formData.customerName}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium"
                placeholder="Search or type name..."
              />
              <datalist id="billing-customers">
                {customers.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            <div>
              <label htmlFor="doc-customer-address" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Address</label>
              <textarea 
                id="doc-customer-address"
                name="doc_customer_address"
                required
                rows={2}
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium resize-none"
                placeholder="Customer full address..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-customer-phone" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                <input 
                  id="doc-customer-phone"
                  name="doc_customer_phone"
                  required
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium"
                  placeholder="+60..."
                />
              </div>
              <div>
                <label htmlFor="doc-performance-date" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Performance Date</label>
                <input 
                  id="doc-performance-date"
                  name="doc_performance_date"
                  required
                  type="date"
                  value={formData.performanceDate}
                  onChange={(e) => setFormData({ ...formData, performanceDate: e.target.value })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="doc-item-description" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Item Description</label>
              <textarea 
                id="doc-item-description"
                name="doc_item_description"
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium resize-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-item-quantity" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Quantity</label>
                <input 
                  id="doc-item-quantity"
                  name="doc_item_quantity"
                  required
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium"
                />
              </div>
              <div>
                <label htmlFor="doc-item-price" className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1.5 ml-1">Unit Price (RM)</label>
                <input 
                  id="doc-item-price"
                  name="doc_item_price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3.5 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all font-medium"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-400 font-black text-[10px] uppercase tracking-widest hover:bg-surface-700 transition-all"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              type="submit"
              className="flex-1 py-4 rounded-2xl bg-crimson-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-crimson-500 shadow-xl shadow-crimson-900/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Generating...' : `Generate ${formData.type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
