import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useCustomers } from '../../hooks/useCustomers'

export default function AddStopModal({ isOpen, onClose, onAdd, stops = [], stop = null }) {
  const { settings } = useSettings()
  const { customers, setSearchQuery } = useCustomers({ initialPageSize: 1000 })
  
  // Helper: Convert "HH:MM AM/PM" to minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    
    let [ , hours, minutes, period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  const [formData, setFormData] = useState({
    householdname: '',
    address: '',
    phone: '',
    amount: '',
    scheduledtime: '',
    duration: 30,
    lioncolor: ['黄'],
    lionquantity: 2,
    extra_characters: [], // Replaces hasgodofwealth/hasbigheadbuddha
    pluckingtype: [],
    remarks: '',
    maplink: ''
  })


  const [addressOptions, setAddressOptions] = useState([])
  const [phoneOptions, setPhoneOptions] = useState([])

  const handleSelectCustomer = (inputValue) => {
    const matchedCustomer = customers.find(c => {
      const notesPart = c.notes ? ` (${c.notes})` : ''
      return inputValue === `${c.name}${notesPart}` || inputValue === c.name
    })

    // Only update search query if we haven't found a perfect match yet
    // This prevents the dropdown from "popping back up" after selection
    if (!matchedCustomer) {
      setSearchQuery(inputValue)
    }

    if (matchedCustomer) {
      const addresses = Array.isArray(matchedCustomer.addresses) ? matchedCustomer.addresses : [matchedCustomer.address || '']
      const phones = Array.isArray(matchedCustomer.phones) ? matchedCustomer.phones : [matchedCustomer.phone || '']
      
      const newFormData = { ...formData, householdname: inputValue }

      // Handle Addresses
      if (addresses.length > 1) {
        setAddressOptions(addresses)
        newFormData.address = '' // Force user to pick
      } else {
        const addr = addresses[0]
        newFormData.address = typeof addr === 'object' ? addr.value : addr
        newFormData.maplink = typeof addr === 'object' ? addr.mapLink || '' : ''
        setAddressOptions([])
      }

      // Handle Phones
      if (phones.length > 1) {
        setPhoneOptions(phones)
        newFormData.phone = '' // Force user to pick
      } else {
        newFormData.phone = phones[0] || ''
        setPhoneOptions([])
      }

      setFormData(newFormData)
    } else {
      setFormData({ ...formData, householdname: inputValue })
      setAddressOptions([])
      setPhoneOptions([])
    }
  }

  // Helper: Convert "HH:MM AM/PM" to "HH:mm" (24h) for input type="time"
  const convertTo24h = (time12h) => {
    if (!time12h) return ""
    const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return ""
    let [ , hours, minutes, period] = match
    hours = parseInt(hours)
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const handleTimeChange = (e) => {
    const time24 = e.target.value
    if (!time24) {
      setFormData({ ...formData, scheduledtime: "" })
      return
    }
    const [h, m] = time24.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    const time12 = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
    setFormData({ ...formData, scheduledtime: time12 })
  }

  const handleQuantityChange = (newQty) => {
    // If user deleted the input, allow it to be empty for typing
    if (newQty === '') {
      setFormData(prev => ({ ...prev, lionquantity: '' }))
      return
    }

    const qty = Math.max(1, Math.min(20, Number(newQty)))
    setFormData(prev => {
      const newColors = [...prev.lioncolor]
      if (newColors.length < qty) {
        while (newColors.length < qty) newColors.push(settings?.lioncolors?.[0] || '')
      } else if (newColors.length > qty) {
        newColors.length = qty
      }
      return { ...prev, lionquantity: qty, lioncolor: newColors }
    })
  }

  const [prevIsOpen, setPrevIsOpen] = useState(false)
  const [prevStopId, setPrevStopId] = useState(null)

  // Track if modal opened or target stop changed
  if (isOpen !== prevIsOpen || stop?.id !== prevStopId) {
    setPrevIsOpen(isOpen)
    setPrevStopId(stop?.id)
    
    if (isOpen) {
      const colors = settings?.lioncolors || []
      
      if (stop) {
        // Normalize lioncolor to array
        let initialColors = []
        if (Array.isArray(stop.lioncolor || stop.lionColor)) {
          initialColors = stop.lioncolor || stop.lionColor
        } else if (stop.lioncolor || stop.lionColor) {
          initialColors = [stop.lioncolor || stop.lionColor]
        } else {
          initialColors = [colors[0] || '']
        }

        setFormData({
          householdname: stop.householdname || '',
          address: stop.address || '',
          phone: stop.phone || '',
          amount: stop.amount || '',
          scheduledtime: stop.scheduledtime || '',
          duration: stop.duration || 30,
          lioncolor: initialColors,
          lionquantity: stop.lionquantity || initialColors.length || 1,
          extra_characters: Array.isArray(stop.extra_characters) ? stop.extra_characters : (
            [stop.hasgodofwealth && '财神爷', stop.hasbigheadbuddha && '大头佛'].filter(Boolean)
          ),
          pluckingtype: Array.isArray(stop.pluckingtype) ? stop.pluckingtype : (stop.pluckingtype ? [stop.pluckingtype] : []),
          remarks: stop.remarks || '',
          maplink: stop.maplink || ''
        })
      } else {
        setFormData({
          householdname: '',
          address: '',
          phone: '',
          amount: '',
          scheduledtime: '',
          duration: settings?.defaultduration || 30,
          lioncolor: [colors[0] || '', colors[0] || ''],
          lionquantity: 2,
          extra_characters: [],
          pluckingtype: [],
          remarks: '',
          maplink: ''
        })
        setAddressOptions([])
        setPhoneOptions([])
      }
    }
  }

  // Manage body scroll overflow
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Real-time Conflict Detection (Calculated synchronously during render)
  let conflict = null
  if (formData.scheduledtime && stops.length > 0) {
    const newMinutes = parseTimeToMinutes(formData.scheduledtime)
    if (newMinutes !== null) {
      const found = stops.find(s => {
        if (stop && s.id === stop.id) return false
        const existingMinutes = parseTimeToMinutes(s.scheduledtime)
        if (existingMinutes === null) return false
        const diff = Math.abs(newMinutes - existingMinutes)
        return diff < 45 // 45 min threshold
      })

      if (found) {
        const isExact = parseTimeToMinutes(found.scheduledtime) === newMinutes
        conflict = {
          type: isExact ? 'CRASH' : 'TIGHT',
          stop: found,
          message: isExact 
            ? `⚠️ TIME CRASH: Already at ${found.scheduledtime} (${found.householdname})`
            : `⚠️ TIGHT GAP: Near ${found.scheduledtime} (${found.householdname}). Min 45m recom.`
        }
      }
    }
  }

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.scheduledtime) {
      alert("Please choose a specific time for the performance.")
      return
    }

    if (conflict && !window.confirm(`${conflict.message}\n\nProceed anyway?`)) {
      return
    }

    onAdd({
      ...formData,
      lionquantity: Number(formData.lionquantity) || 1,
      amount: Number(formData.amount)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-950/50 shrink-0 rounded-t-2xl">
          <h3 className="text-xl font-bold text-surface-100">{stop ? 'Edit Stop' : 'Add New Stop'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Customer / Household Name</label>
            <input 
              required
              type="text" 
              list="customers-list"
              value={formData.householdname}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 h-12 !h-[50px] text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all box-border"
              placeholder="Type to search saved customers..."
            />
            <datalist id="customers-list">
              {customers.map(c => {
                const notesPart = c.notes ? ` (${c.notes})` : ''
                return <option key={c.id} value={`${c.name}${notesPart}`} />
              })}
            </datalist>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Full Address</label>
            {addressOptions.length > 1 ? (
              <select
                onChange={(e) => {
                  const selectedVal = e.target.value
                  const selectedAddr = addressOptions.find(a => (typeof a === 'object' ? a.value : a) === selectedVal)
                  setFormData({ 
                    ...formData, 
                    address: selectedVal,
                    maplink: typeof selectedAddr === 'object' ? selectedAddr.mapLink || '' : ''
                  })
                }}
                value={formData.address}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 h-12 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              >
                <option value="" disabled>Choose a location...</option>
                {addressOptions.map((addr, idx) => {
                  const type = typeof addr === 'object' ? addr.type : 'Home'
                  const val = typeof addr === 'object' ? addr.value : addr
                  const typeLabel = type === 'Home' ? '住家' : '公司'
                  return (
                    <option key={idx} value={val}>
                      {typeLabel}: {val}
                    </option>
                  )
                })}
              </select>
            ) : (
              <textarea 
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all resize-none"
                placeholder="12 Jalan Mutiara, 56000 KL"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Contact Phone</label>
              {phoneOptions.length > 1 ? (
                <select
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 h-11 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                >
                  <option value="" disabled>Pick phone...</option>
                  {phoneOptions.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input 
                  required
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 h-11 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="+60 12-345 6789"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Quote (RM)</label>
              <input 
                required
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 h-[50px] !h-[50px] text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all box-border"
                placeholder="888"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Scheduled Time</label>
              <div className="w-full bg-surface-950 border border-surface-800 rounded-lg h-12 !h-[50px] overflow-hidden flex items-center focus-within:border-crimson-500 focus-within:ring-1 focus-within:ring-crimson-500 transition-all box-border">
                <input 
                  required
                  type="time" 
                  value={convertTo24h(formData.scheduledtime)}
                  onChange={handleTimeChange}
                  className="w-full bg-transparent border-none px-4 h-full text-surface-100 focus:outline-none focus:ring-0 appearance-none"
                />
              </div>
            </div>
            <div>
               <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Est. Duration (Mins)</label>
               <div className="w-full bg-surface-950 border border-surface-800 rounded-lg h-12 !h-[50px] overflow-hidden flex items-center focus-within:border-crimson-500 focus-within:ring-1 focus-within:ring-crimson-500 transition-all box-border">
                 <input 
                   required
                   type="number" 
                   min="5"
                   step="5"
                   value={formData.duration}
                   onChange={(e) => setFormData({...formData, duration: e.target.value ? Number(e.target.value) : ''})}
                   className="w-full bg-transparent border-none px-4 h-full text-surface-100 focus:outline-none focus:ring-0 appearance-none"
                   placeholder="30"
                 />
               </div>
            </div>
          </div>

          {conflict && (
            <div className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-pulse ${conflict.type === 'CRASH' ? 'bg-crimson-500/10 border-crimson-500/50 text-crimson-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
              {conflict.message}
            </div>
          )}

          <div className="bg-surface-950/50 p-4 border border-surface-800 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-surface-200">Performance Details</h4>
            
            <div className="flex flex-col gap-4">
              {/* Quantity Stepper Row */}
              <div className="flex items-center justify-between bg-surface-900 border border-surface-800 p-3 rounded-2xl shadow-inner-dark">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">Total Quantity</span>
                  <span className="text-xs text-surface-300 font-bold italic opacity-70">Lions to perform</span>
                </div>
                <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-xl border border-surface-800">
                  <button 
                    type="button"
                    onClick={() => handleQuantityChange(Number(formData.lionquantity || 1) - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg transition-all active:scale-90"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </button>
                  <input 
                    type="number" 
                    min="1"
                    max="20"
                    value={formData.lionquantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-14 bg-transparent border-none text-surface-100 focus:outline-none text-base font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    type="button"
                    onClick={() => handleQuantityChange(Number(formData.lionquantity || 1) + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg transition-all active:scale-90"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>

              {/* Lion Colors Grid */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Assign Colors</label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar-thin">
                  {formData.lioncolor.map((color, idx) => (
                    <div key={idx} className="relative flex items-center animate-in fade-in slide-in-from-bottom-1" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="absolute left-2.5 z-10 pointer-events-none flex items-center h-full">
                         <span className="text-[8px] font-black text-surface-500 bg-surface-900 border border-surface-800 px-1 py-0.5 rounded">#{idx + 1}</span>
                      </div>
                      <select
                        value={color}
                        onChange={(e) => {
                          const newColors = [...formData.lioncolor]
                          newColors[idx] = e.target.value
                          setFormData({ ...formData, lioncolor: newColors })
                        }}
                        className="w-full bg-surface-900/50 border border-surface-800 rounded-xl pl-8 pr-8 h-[44px] text-surface-200 focus:outline-none focus:border-crimson-500/50 transition-all text-[11px] font-bold appearance-none cursor-pointer"
                      >
                        {(settings?.lioncolors || []).map(c => (
                          <option key={c} value={c}>
                            {typeof c === 'string' && c.includes('|') ? c.split('|')[0].trim() : c}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2.5 pointer-events-none text-surface-600">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Cai Qing (采青) - Click To Add</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(settings?.cai_qing_types || []).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, pluckingtype: [...formData.pluckingtype, type] })
                      }}
                      className="px-3 py-2.5 rounded-xl border border-surface-800 bg-surface-900 text-surface-400 text-xs font-bold hover:border-green-500/50 hover:bg-surface-800 hover:text-green-400 transition-all text-center"
                    >
                      + {type}
                    </button>
                  ))}
                  {(!settings?.cai_qing_types?.length) && (
                    <div className="col-span-2 text-center text-xs text-surface-500 py-4 border border-dashed border-surface-800 rounded-xl bg-surface-950/20">
                      No Cai Qing types configured under Settings.
                    </div>
                  )}
                </div>

                {formData.pluckingtype.length > 0 && (
                  <div className="bg-surface-950/40 border border-surface-800/50 rounded-2xl p-3 animate-in fade-in slide-in-from-top-1">
                    <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2 pl-1">Current Selection (Click to remove)</p>
                    <div className="flex flex-wrap gap-2">
                       {formData.pluckingtype.map((type, i) => (
                         <button
                           key={`${type}-${i}`}
                           type="button"
                           onClick={() => {
                             const newTypes = [...formData.pluckingtype]
                             newTypes.splice(i, 1)
                             setFormData({ ...formData, pluckingtype: newTypes })
                           }}
                           className="px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 hover:bg-crimson-500/10 hover:border-crimson-500/30 hover:text-crimson-400 transition-all group"
                         >
                           {type}
                           <span className="opacity-100">✕</span>
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              {(settings?.extra_characters || []).map(char => (
                <label key={char} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.extra_characters.includes(char)}
                    onChange={(e) => {
                      const newChars = e.target.checked 
                        ? [...formData.extra_characters, char]
                        : formData.extra_characters.filter(c => c !== char)
                      setFormData({...formData, extra_characters: newChars})
                    }}
                    className="w-5 h-5 rounded accent-crimson-600 bg-surface-900 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-surface-200 group-hover:text-surface-50 transition-colors">{char}</span>
                </label>
              ))}
              {(!settings?.extra_characters?.length) && (
                <div className="text-xs text-surface-500 py-2 italic">
                  No extra characters configured under Settings.
                </div>
              )}
            </div>
          </div>



          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Special Remarks / Requests</label>
            <textarea 
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all resize-none text-sm"
              placeholder="e.g. Needs extra long firecrackers, customer wants traditional picking style..."
            />
          </div>

          </div>

          <div className="p-6 pt-2 border-t border-surface-800 bg-surface-900 flex gap-3 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl bg-crimson-600 text-white font-bold hover:bg-crimson-500 transition-colors shadow-lg shadow-crimson-500/20"
            >
              {stop ? 'Update Stop' : 'Save Stop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
