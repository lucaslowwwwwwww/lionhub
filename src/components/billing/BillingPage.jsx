import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../supabase'
import CreateDocModal from './CreateDocModal'
import { generateBillingPDF, formatPerformanceDescription } from '../../utils/billingUtils'
import { TABLES } from '../../utils/fetchHelper'
import { useOrg } from '../../hooks/useOrg'


export default function BillingPage() {
  const { userProfile } = useAuth()
  const { settings } = useSettings()
  const { orgId } = useOrg()
  
  // Itinerary Sync
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [itineraryStops, setItineraryStops] = useState([])
  const [loadingStops, setLoadingStops] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)


  // 2. Fetch Itinerary Stops for selected date (flat table)
  useEffect(() => {
    async function fetchStops() {
      if (!orgId) return
      setLoadingStops(true)
      try {
        const { data, error } = await supabase
          .from('stops')
          .select(TABLES.STOPS)
          .eq('org_id', orgId)
          .eq('scheduleddate', selectedDate)
          .order('order', { ascending: true })

        if (error) throw error
        setItineraryStops(data || [])
      } catch (err) {
        console.error("Operation failed:", err?.message || "unknown")
      } finally {
        setLoadingStops(false)
      }
    }
    fetchStops()
  }, [selectedDate, orgId])


  const handleQuickGenerate = async (stop, type) => {
    const data = {
      customerName: stop.householdname,
      customerAddress: stop.address || '',
      customerPhone: stop.phone || '',
      performanceDate: selectedDate,
      description: formatPerformanceDescription(stop),
      amount: stop.actualamount || stop.amount || 0,
      quantity: stop.lionquantity || 1,
      id: stop.id
    }
    
    try {
      await generateBillingPDF(data, settings, userProfile, type)
    } catch {
      alert("Failed to generate " + type)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-24 px-4 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-surface-800 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-surface-50 tracking-tight">Billing & Docs</h1>
          <p className="text-surface-500 text-sm font-medium">Generate Invoices and Quotations.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-surface-800 text-surface-200 border border-surface-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-surface-700 hover:text-white transition-all shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Custom Entry
        </button>
      </div>

      {/* ITINERARY SYNC SECTION */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
             </div>
             <div>
                <h2 className="text-xl font-black text-surface-100 uppercase tracking-tight leading-none">Schedule</h2>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mt-1">Pick date to sync data</p>
             </div>
          </div>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-surface-950 border border-surface-800 rounded-2xl px-5 py-3 text-sm text-surface-100 focus:outline-none focus:border-blue-500 transition-all font-black shadow-inner"
          />
        </div>

        {/* Desktop Schedule Table */}
        <div className="hidden md:block bg-surface-900 border border-surface-800 rounded-3xl overflow-hidden shadow-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-950/30">
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-widest text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {loadingStops ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" /></div>
                  </td>
                </tr>
              ) : itineraryStops.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center text-surface-500">
                    <p className="text-sm font-bold uppercase tracking-widest opacity-50">No schedule found</p>
                  </td>
                </tr>
              ) : (
                itineraryStops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-surface-800/30 transition-colors group">
                    <td className="px-6 py-6 text-sm font-black text-surface-400">{stop.scheduledtime || 'N/A'}</td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-surface-100">{stop.householdname}</span>
                        <span className="text-[10px] text-surface-500 font-bold truncate max-w-[250px] uppercase tracking-tighter mt-0.5">{stop.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right text-sm font-black text-surface-100 font-numeric">
                      RM {Number(stop.actualamount || stop.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-center gap-3">
                         <button onClick={() => handleQuickGenerate(stop, 'QUOTATION')} className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10">QUOTATION</button>
                         <button onClick={() => handleQuickGenerate(stop, 'INVOICE')} className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-500/10">INVOICE</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Schedule Cards */}
        <div className="md:hidden space-y-4">
           {loadingStops ? (
             <div className="py-12 flex justify-center"><div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" /></div>
           ) : itineraryStops.length === 0 ? (
             <div className="py-20 text-center bg-surface-900/50 rounded-3xl border border-surface-800">
                <p className="text-xs font-black text-surface-600 uppercase tracking-widest">No schedule found</p>
             </div>
           ) : (
             itineraryStops.map(stop => (
               <div key={stop.id} className="bg-surface-900 border border-surface-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{stop.scheduledtime || 'N/A'}</p>
                        <h3 className="text-lg font-black text-surface-50 mt-1">{stop.householdname}</h3>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-tighter line-clamp-1 mt-0.5">{stop.address}</p>
                     </div>
                     <p className="text-lg font-black text-surface-100 font-numeric">RM{Number(stop.actualamount || stop.amount || 0).toFixed(0)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <button onClick={() => handleQuickGenerate(stop, 'QUOTATION')} className="py-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Quotation</button>
                     <button onClick={() => handleQuickGenerate(stop, 'INVOICE')} className="py-3.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Invoice</button>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {isModalOpen && (
        <CreateDocModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
