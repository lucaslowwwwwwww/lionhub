import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function CheckInEditModal({ isOpen, onClose, checkInRecord, onSave, onDelete }) {
  const [prevRecordId, setPrevRecordId] = useState(null)
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')

  if (checkInRecord && checkInRecord.id !== prevRecordId) {
    setPrevRecordId(checkInRecord.id)
    const formatToLocal = (iso) => {
      if (!iso) return ''
      const date = new Date(iso)
      const tzOffset = date.getTimezoneOffset() * 60000
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
      return localISOTime
    }
    setCheckInTime(formatToLocal(checkInRecord.check_in_at))
    setCheckOutTime(formatToLocal(checkInRecord.check_out_at))
  }

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

  if (!isOpen || !checkInRecord) return null

  const handleSave = () => {
    onSave(checkInRecord.id, {
      check_in_at: new Date(checkInTime).toISOString(),
      check_out_at: checkOutTime ? new Date(checkOutTime).toISOString() : null
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center shrink-0 bg-surface-950/50">
          <h3 className="text-lg font-black text-surface-100 uppercase tracking-tight">Edit Timesheet</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 p-2 hover:bg-surface-800 rounded-full transition-all">✕</button>
        </div>

        <div className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1 min-h-0 touch-pan-y">
            <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest px-1">Check In Time</label>
              <input 
                type="datetime-local" 
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full box-border block min-w-0 bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-xs font-bold text-surface-200 focus:border-brand-500 focus:outline-none transition-all appearance-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest px-1">Check Out Time</label>
              <input 
                type="datetime-local" 
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full box-border block min-w-0 bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-xs font-bold text-surface-200 focus:border-brand-500 focus:outline-none transition-all appearance-none"
              />
              {!checkOutTime && (
                <p className="text-[9px] text-brand-500/80 font-bold uppercase tracking-widest mt-1 px-1">Leave blank if still present</p>
              )}
            </div>
            </div>
          </div>

          <div className="p-6 border-t border-surface-800 flex flex-col gap-2 shrink-0">
            <button 
              onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition-all"
            >
              Update Record
            </button>
            <button 
              onClick={() => { if(confirm('Delete this timesheet segment?')) { onDelete(checkInRecord.id); onClose(); } }}
              className="w-full py-3 rounded-xl bg-surface-800 text-[10px] font-black text-crimson-500 uppercase tracking-[0.2em] hover:bg-surface-700 transition-all"
            >
              Delete Segment
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
