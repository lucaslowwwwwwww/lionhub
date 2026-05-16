import { useState, useEffect } from 'react'
import { useMembers } from '../../hooks/useMembers'
import { useTroupes } from '../../hooks/useTroupes'

export default function TeamSelectionModal({ 
  isOpen, 
  onClose, 
  selectedMemberIds = [], 
  onSave, 
  busyMemberIds = [], 
  currentTroupeId = null, 
  currentAttendanceDetails = {}
}) {
  const { members = [], loading: loadingM, addMember } = useMembers()
  const { troupes = [], loading: loadingT } = useTroupes()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [tempSelected, setTempSelected] = useState({})
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const initial = {}
      ;(selectedMemberIds || []).forEach(id => {
        initial[id] = currentAttendanceDetails[id] || 'full'
      })
      setTempSelected(initial)
    }
  }, [isOpen, selectedMemberIds, currentAttendanceDetails])

  if (!isOpen) return null

  // Flat calculation in render to be bulletproof
  const memList = Array.isArray(members) ? members.filter(m => m.status !== 'deleted') : []
  const trpList = Array.isArray(troupes) ? troupes : []
  const searchLower = (searchTerm || '').toLowerCase()

  const filtered = memList.filter(m => {
    const name = (m.displayname || m.displayName || '').toLowerCase()
    const troupe = trpList.find(t => t.id === m.troupeid)
    const tName = (troupe?.name || 'Unassigned').toLowerCase()
    return name.includes(searchLower) || tName.includes(searchLower)
  })

  // Separate and sort
  const admins = filtered
    .filter(m => m.role === 'admin' || m.role === 'master')
    .sort((a, b) => {
      if (a.role === 'master' && b.role !== 'master') return -1
      if (a.role !== 'master' && b.role === 'master') return 1
      return (a.displayname || a.displayName || '').localeCompare(b.displayname || b.displayName || '')
    })
  const regular = filtered.filter(m => m.role !== 'admin' && m.role !== 'master').sort((a,b) => (a.displayname || a.displayName || '').localeCompare(b.displayname || b.displayName || ''))


  const handleToggle = (id) => {
    if ((busyMemberIds || []).includes(id)) return

    setTempSelected(prev => {
      const next = { ...prev }
      if (!next[id]) {
        next[id] = 'full'
      } else {
        delete next[id]
      }
      return next
    })
  }

  const handleAdd = async () => {
    if (!searchTerm.trim()) return
    setIsAdding(true)
    try {
      const nid = await addMember({
        displayname: searchTerm.trim(),
        role: 'member',
        troupeid: currentTroupeId || 'unassigned',
        requiresauth: false
      })
      if (nid) setTempSelected(p => ({ ...p, [nid]: 'full' }))
      setSearchTerm('')
    } catch (e) {
      console.error(e)
    } finally { setIsAdding(false) }
  }

  const handleConfirm = () => {
    const memberIds = Object.keys(tempSelected)
    const details = { ...tempSelected }
    onSave(memberIds, details)
    onClose()
  }

  const isLoading = loadingM || loadingT

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-center bg-surface-950/50">
          <div>
            <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight">Assemble Roster</h3>
            <p className="text-[10px] text-surface-500 font-black uppercase tracking-widest mt-0.5">{Object.keys(tempSelected).length} members ready</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-white">✕</button>
        </div>

        {/* Search */}
        <div className="p-4 bg-surface-900 border-b border-surface-800 flex gap-2">
          <input 
            type="text"
            placeholder="Search name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-sm text-surface-100 font-bold"
          />
          {searchTerm.trim() && filtered.length === 0 && (
            <button onClick={handleAdd} disabled={isAdding} className="bg-crimson-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white">
              {isAdding ? 'Loading...' : '+ Add'}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 bg-surface-950/10">
          {isLoading ? (
            <div className="text-center py-10 text-surface-500">Loading...</div>
          ) : (
            <div className="space-y-1">
              {/* Admins */}
              {admins.length > 0 && (
                <>
                  <p className="px-3 pt-4 pb-2 text-[9px] font-black text-gold-500 uppercase tracking-widest">Command & Admin ({admins.length})</p>
                  {admins.map(m => {
                    const isSelected = Object.keys(tempSelected).includes(m.id)

                    return (
                    <button key={m.id} onClick={() => handleToggle(m.id)} disabled={(busyMemberIds || []).includes(m.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${(busyMemberIds || []).includes(m.id) ? 'opacity-40' : isSelected ? 'bg-crimson-500/10 border border-crimson-500/30' : 'hover:bg-surface-800'}`}>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${(busyMemberIds || []).includes(m.id) ? 'bg-surface-900' : isSelected ? (m.role === 'master' ? 'bg-purple-500 border-purple-500' : 'bg-gold-500 border-gold-500') : 'bg-surface-950 border-surface-700'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex justify-between items-center">
                          <p className={`font-black text-sm ${isSelected ? (m.role === 'master' ? 'text-purple-400' : 'text-gold-400') : 'text-surface-100'}`}>{m.displayname || m.displayName}</p>
                          {(busyMemberIds || []).includes(m.id) && <span className="text-[8px] font-black text-surface-500 uppercase bg-surface-800 px-1.5 py-0.5 rounded">Busy</span>}
                        </div>
                        <p className="text-[9px] text-surface-500 font-bold uppercase">{trpList.find(t => t.id === m.troupeid)?.name || 'Unassigned'} • {m.role === 'master' ? 'Master' : 'Admin'}</p>
                      </div>
                    </button>
                    )
                  })}
                </>
              )}

              {/* Personnel */}
              {regular.length > 0 && (
                <>
                  <p className="px-3 pt-6 pb-2 text-[9px] font-black text-surface-500 uppercase tracking-widest">Personnel ({regular.length})</p>
                  {regular.map(m => {
                    const isSelected = Object.keys(tempSelected).includes(m.id)

                    return (
                    <button key={m.id} onClick={() => handleToggle(m.id)} disabled={(busyMemberIds || []).includes(m.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${(busyMemberIds || []).includes(m.id) ? 'opacity-40' : isSelected ? 'bg-crimson-500/10 border border-crimson-500/30' : 'hover:bg-surface-800'}`}>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${(busyMemberIds || []).includes(m.id) ? 'bg-surface-900' : isSelected ? 'bg-crimson-600 border-crimson-600' : 'bg-surface-950 border-surface-700'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex justify-between items-center">
                          <p className={`font-black text-sm ${isSelected ? 'text-crimson-400' : 'text-surface-100'}`}>{m.displayname || m.displayName}</p>
                          {(busyMemberIds || []).includes(m.id) && <span className="text-[8px] font-black text-surface-500 uppercase bg-surface-800 px-1.5 py-0.5 rounded">Busy</span>}
                        </div>
                        <p className="text-[9px] text-surface-500 font-bold uppercase">{trpList.find(t => t.id === m.troupeid)?.name || 'Unassigned'} • {m.role === 'logistics' ? 'Logistics' : 'Member'}</p>
                      </div>
                    </button>
                    )
                  })}
                </>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-20 text-surface-600 text-xs font-bold uppercase tracking-widest">No results found</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pb-12 sm:pb-4 border-t border-surface-800 bg-surface-950/50 flex gap-3 shadow-top">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-300 font-black text-[10px] uppercase tracking-widest">Abort</button>
          <button onClick={handleConfirm} className="flex-[2] py-4 rounded-2xl bg-crimson-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-crimson-600/30">Confirm Roster</button>
        </div>

      </div>
    </div>
  )
}
