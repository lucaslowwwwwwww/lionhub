import { useState, useEffect, useMemo } from 'react'
import { useTroupes } from '../../hooks/useTroupes'
import { useMembers } from '../../hooks/useMembers'
import { useAudit } from '../../hooks/useAudit'
import { useAuth } from '../../hooks/useAuth'

// ─── Add Troupe Modal ───
function AddTroupeModal({ isOpen, onClose, onSave, editData }) {
  const [prevEditData, setPrevEditData] = useState(undefined)
  const [prevIsOpen, setPrevIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')

  if (editData !== prevEditData || isOpen !== prevIsOpen) {
    setPrevEditData(editData)
    setPrevIsOpen(isOpen)
    setName(editData?.name || '')
    setVehiclePlate(editData?.vehicleplate || '')
  }

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ name, vehicleplate: vehiclePlate }, editData?.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-surface-100">{editData ? 'Edit Troupe' : 'New Troupe'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Troupe Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all font-bold"
              placeholder="e.g. Troupe Alpha" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Vehicle Plate (Optional)</label>
            <input type="text" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all font-bold"
              placeholder="e.g. ABC 1234" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-3 rounded-lg bg-crimson-600 text-white font-bold hover:bg-crimson-500 transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Member Modal ───
function AddMemberModal({ isOpen, onClose, onAdd }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [recruitedUser, setRecruitedUser] = useState(null)

  if (!isOpen) return null

  const handleClose = () => {
    setDisplayName('')
    setEmail('')
    setPhone('')
    setRole('member')
    setError('')
    setRecruitedUser(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required for account login.')
      return
    }

    if (!displayName || !phone) {
      setError('Full name and phone number are required.')
      return
    }

    setSaving(true)
    try {
      await onAdd({
        uid: null,
        displayname: displayName,
        email: email,
        phone,
        role
      })

      setRecruitedUser({ displayName, email, role })
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      setError('Failed to create account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center sticky top-0 bg-surface-900 z-10">
          <h3 className="text-xl font-bold text-surface-100">
            {recruitedUser ? 'Recruit Successful' : 'Add Member'}
          </h3>
          <button onClick={handleClose} className="text-surface-400 hover:text-surface-100 transition-colors">✕</button>
        </div>

        {recruitedUser ? (
          <div className="p-6 space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-black text-white uppercase tracking-tight">Personnel Recruited Successfully</h4>
              <p className="text-sm text-surface-400 mt-2 px-4 leading-relaxed">
                {recruitedUser.role === 'admin' ? 'Admin' : 'Member'} <span className="text-crimson-500 font-black">{recruitedUser.displayName}</span> is now registered.
              </p>
            </div>

            <div className="bg-surface-950 border border-surface-800 rounded-2xl p-6 space-y-4">
              <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest text-center">Next Steps for User</p>
              <div className="p-4 bg-surface-900 border border-surface-800 rounded-xl text-center">
                <p className="text-xs font-bold text-surface-200 mb-1">Tell them to Sign Up using:</p>
                <p className="text-sm font-black text-crimson-400 tracking-wide">{recruitedUser.email}</p>
              </div>
              <p className="text-[9px] text-surface-600 text-center font-medium leading-relaxed">
                Their account will be automatically recognized as a {recruitedUser.role} upon registration. They can set their own password on the login screen.
              </p>
            </div>

            <button 
              onClick={handleClose}
              className="w-full py-4 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              Close & Refresh List
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-crimson-500/10 border border-crimson-500/20 rounded-lg px-4 py-3 text-crimson-400 text-sm font-medium">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="add-member-name" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Full Name</label>
              <input id="add-member-name" name="displayname" required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                placeholder="e.g. Ah Huat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="add-member-phone" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Phone *</label>
                <input id="add-member-phone" name="phone" required type="text" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="+60 12-345 6789" />
              </div>
              <div>
                <label htmlFor="add-member-role" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Role</label>
                <select id="add-member-role" name="role" value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all appearance-none">
                  <option value="member">Member (Personnel)</option>
                  <option value="logistics">Logistics (Inventory Ops)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="add-member-email" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Email Address *</label>
              <input id="add-member-email" name="email" required type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                placeholder="member@example.com" />
            </div>
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider leading-relaxed pt-1">
              The user will set their password when they first register on the login page.
            </p>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={handleClose} className="flex-1 py-3 rounded-lg bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-lg bg-crimson-600 text-white font-bold hover:bg-crimson-500 transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Edit Member Modal ───
function EditMemberModal({ isOpen, onClose, member, onSave, isMaster }) {
  const { logAction } = useAudit()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync form with member data when modal opens
  useEffect(() => {
    if (member) {
      setDisplayName(member.displayname || '')
      setEmail(member.email || '')
      setPhone(member.phone || '')
      setRole(member.role || 'member')
      setError('')
    }
  }, [member])

  if (!isOpen || !member) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const isPromotingToAdmin = role === 'admin' && !member.uid

    if (isPromotingToAdmin && !email && !member.email) {
      setError('Email is required to promote to admin.')
      return
    }

    setSaving(true)
    try {
      let uid = member.uid
      let currentEmail = email || member.email

      const oldRole = member.role || 'member'
      await onSave(member.id, { 
        displayname: displayName, 
        phone, 
        role, 
        uid, 
        email: currentEmail 
      })
      
      if (oldRole !== role) {
        logAction('CHANGE_ROLE', { userId: member.id, oldRole, newRole: role })
      }
      
      onClose()
    } catch (err) {
      console.error("Operation failed:", err?.message || "unknown")
      setError(err.message || 'Failed to update member. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-surface-100">Edit Member</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-crimson-500/10 border border-crimson-500/20 rounded-lg px-4 py-3 text-crimson-400 text-sm font-medium">
              {error}
            </div>
          )}
          
          {(member.email || role === 'admin') && (
            <div className="bg-surface-950/50 border border-surface-800 rounded-lg px-4 py-3">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Login Email</p>
              {member.email ? (
                <p className="text-sm text-surface-300 mt-0.5">{member.email}</p>
              ) : (
                <p className="text-xs text-surface-500 italic mt-0.5">Not set (required for admin)</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="edit-member-name" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Full Name</label>
            <input id="edit-member-name" name="displayname" required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              placeholder="e.g. Ah Huat" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-member-phone" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Phone *</label>
              <input id="edit-member-phone" name="phone" required type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                placeholder="+60 12-345 6789" />
            </div>
            {isMaster && (
              <div>
                <label htmlFor="edit-member-role" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Role</label>
                <select id="edit-member-role" name="role" value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all appearance-none font-bold">
                  <option value="member">Member</option>
                  <option value="logistics">Logistics</option>
                  <option value="admin">Admin</option>
                  {isMaster && <option value="master">Master</option>}
                </select>
              </div>
            )}
          </div>

          {(role === 'admin' || role === 'master') && !member.uid && (
            <div className="animate-fade-in border-t border-surface-800 pt-4 space-y-1">
              <div>
                <label htmlFor="edit-member-email" className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Email Address *</label>
                <input id="edit-member-email" name="email" required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="admin@example.com" />
              </div>
              <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider leading-relaxed pt-1">
                The user will set their password when they first register on the login page.
              </p>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-lg bg-crimson-600 text-white font-bold hover:bg-crimson-500 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('personnel')
  const [showTroupeModal, setShowTroupeModal] = useState(false)
  const [editingTroupe, setEditingTroupe] = useState(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  
  const { userProfile } = useAuth()
  const isMaster = userProfile?.role === 'master'



  const { troupes, loading: loadingT, timeoutError: timeoutT, addTroupe, updateTroupe, deleteTroupe } = useTroupes()
  const { 
    members: rawMembers, 
    loading: loadingM, 
    timeoutError: timeoutM, 
    addMember, 
    updateMember, 
    deleteMember
  } = useMembers()

  const [nowMs] = useState(() => Date.now())



  const { admins, regularMembers } = useMemo(() => {
    // Filter out Super Admins from the association-level view
    const activeMembers = rawMembers.filter(m => m.status !== 'deleted' && !m.is_super_admin)
    
    const adminsList = activeMembers
      .filter(m => m.role === 'admin' || m.role === 'master')
      .sort((a, b) => {
        if (a.role === 'master' && b.role !== 'master') return -1
        if (a.role !== 'master' && b.role === 'master') return 1
        return (a.displayname || '').localeCompare(b.displayname || '')
      })
    
    const membersList = activeMembers
      .filter(m => m.role !== 'admin' && m.role !== 'master')
      
    return { admins: adminsList, regularMembers: membersList }
  }, [rawMembers])

  const loading = loadingT || loadingM

  const confirmDeleteMember = (m) => {
    if (window.confirm(`Are you sure you want to remove ${m.displayname || 'this member'} from the system?`)) {
      deleteMember(m.id)
    }
  }

  const isOnline = (lastActive) => {
    if (!lastActive) return false
    try {
      const ms = lastActive.toMillis ? lastActive.toMillis() : new Date(lastActive).getTime()
      return (nowMs - ms) < 300000 // 5 minutes
    } catch { return false }
  }

  const formatLastActive = (lastActive) => {
    if (!lastActive) return 'Never'
    try {
      const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive)
      const diffMs = nowMs - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } catch { return 'Unknown' }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {(timeoutT || timeoutM) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-bold">Slow connection detected</p>
            <p className="text-amber-500/70 text-xs font-medium">The team records took longer than expected to load. Try refreshing.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-crimson-500/10 text-crimson-500 rounded-2xl border border-crimson-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-surface-100 tracking-tight uppercase">Team Center</h2>
          </div>
          <p className="text-surface-500 text-sm font-bold uppercase tracking-[0.2em] ml-1">Strategic Fleet & Personnel Management</p>
        </div>
        
        <div className="flex gap-2">
            <button
              onClick={() => activeTab === 'fleet' ? setShowTroupeModal(true) : setShowMemberModal(true)}
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-crimson-600 text-white font-black uppercase tracking-widest text-[11px] hover:bg-crimson-500 shadow-xl shadow-crimson-500/20 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {activeTab === 'fleet' ? 'Deploy Troupe' : 'Recruit Member'}
            </button>
          </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex items-center gap-1 p-1 bg-surface-900/50 border border-surface-800 rounded-2xl mb-8 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'personnel', label: 'Personnel', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          )},
          { id: 'fleet', label: 'Fleet Ops', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          )}
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface-800 text-gold-400 shadow-lg border border-surface-700/50'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-crimson-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : activeTab === 'fleet' ? (
        /* ─── Fleet Ops Tab ─── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {troupes.length === 0 ? (
              <div className="col-span-full bg-surface-900 border border-surface-800 border-dashed rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-surface-100 mb-2 uppercase tracking-tight">No Fleet Units</h3>
                <p className="text-surface-400 mb-6 text-sm">Deploy your first troupe to begin assigning itineraries.</p>
                <button onClick={() => setShowTroupeModal(true)}
                  className="px-6 py-3.5 rounded-xl bg-surface-800 text-surface-100 font-black uppercase tracking-widest text-[10px] hover:bg-surface-700 transition-all">
                  + Deploy Troupe
                </button>
              </div>
            ) : (
              troupes.map((troupe) => (
                <div key={troupe.id} className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm hover:border-surface-700 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-crimson-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-surface-800 rounded-2xl text-surface-100">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => setEditingTroupe(troupe)}
                        className="p-2.5 rounded-xl bg-surface-800 text-surface-400 hover:text-brand-400 hover:bg-surface-700 transition-all border border-surface-700/50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => deleteTroupe(troupe.id)}
                        className="p-2.5 rounded-xl bg-surface-800 text-surface-400 hover:text-crimson-500 hover:bg-surface-700 transition-all border border-surface-700/50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-surface-100 uppercase tracking-tight mb-2">{troupe.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {troupe.vehicleplate && (
                        <span className="text-[10px] font-black text-surface-400 bg-surface-950 border border-surface-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 uppercase tracking-widest">
                           <svg className="w-3 h-3 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1-1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                           {troupe.vehicleplate}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-crimson-400 bg-crimson-500/5 border border-crimson-500/10 px-2.5 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Active Unit
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ─── Personnel Tab ─── */
        admins.length === 0 && regularMembers.length === 0 ? (
          <div className="bg-surface-900 border border-surface-800 border-dashed rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-surface-100 mb-2 uppercase tracking-tight">No Personnel Found</h3>
            <p className="text-surface-400 mb-6 text-sm">Add your team members to manage their roles and assignments.</p>
            <button onClick={() => setShowMemberModal(true)}
              className="px-6 py-3.5 rounded-xl bg-surface-800 text-surface-100 font-black uppercase tracking-widest text-[10px] hover:bg-surface-700 transition-all">
              + Recruit Personnel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden sm:block bg-surface-900 border border-surface-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-surface-800 text-left">
                    <th className="px-5 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Member Name</th>
                    <th className="px-5 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Administrators Section */}
                  {admins.length > 0 && (
                    <>
                      <tr className="bg-surface-950/40">
                        <td colSpan="3" className="px-5 py-2.5 text-[10px] font-black text-gold-500 uppercase tracking-[0.2em] border-y border-surface-800">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse"></div>
                             Administrators ({admins.length})
                          </div>
                        </td>
                      </tr>
                      {admins.map(m => (
                        <tr key={m.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${m.role === 'master' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gold-500/10 text-gold-400 border-gold-500/20'}`}>
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <p className="text-[10px] text-surface-500 uppercase tracking-tight">
                                  {m.email || (m.phone ? m.phone : 'No Contact Info')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className={`flex flex-col ${isOnline(m.lastactive) ? 'text-green-400' : 'text-surface-500'}`}>
                              <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest w-fit border ${
                                !m.uid 
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                  : m.role === 'master' 
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                    : 'bg-gold-500/10 text-gold-400 border-gold-500/20'
                              }`}>
                                {m.role || 'admin'} {!m.uid && '(Pending Setup)'}
                              </span>
                              {!isOnline(m.lastactive) && m.lastactive && (
                                <span className="text-[10px] mt-1 font-medium opacity-80">Seen {formatLastActive(m.lastactive)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-3 justify-end">
                              {(isMaster || m.id === userProfile?.id) && (
                                <button onClick={() => setEditingMember(m)}
                                  className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-brand-500/10">
                                  Edit
                                </button>
                              )}
                              {isMaster && (
                                <button onClick={() => confirmDeleteMember(m)}
                                  className="text-surface-500 hover:text-crimson-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-crimson-500/10">
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Regular Members Section */}
                  {regularMembers.length > 0 && (
                    <>
                      <tr className="bg-surface-950/20">
                        <td colSpan="3" className="px-5 py-2.5 text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] border-y border-surface-800">
                          Team Members ({regularMembers.length})
                        </td>
                      </tr>
                      {regularMembers.map(m => (
                        <tr key={m.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className="w-8 h-8 rounded-full bg-crimson-500/10 text-crimson-400 flex items-center justify-center text-xs font-bold shrink-0 border border-crimson-500/20">
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <p className="text-[10px] text-surface-500 uppercase tracking-tight">
                                  {m.email || (m.phone ? m.phone : 'No Contact Info')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className={`flex flex-col ${isOnline(m.lastactive) ? 'text-green-400' : 'text-surface-500'}`}>
                              <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest w-fit border ${m.role === 'logistics' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-surface-800 border-surface-700/50'}`}>
                                {m.role || 'member'}
                              </span>
                              {!isOnline(m.lastactive) && m.lastactive && (
                                <span className="text-[10px] mt-1 font-medium opacity-80">Seen {formatLastActive(m.lastactive)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-3 justify-end">
                              {(isMaster || m.id === userProfile?.id) && (
                                <button onClick={() => setEditingMember(m)}
                                  className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-brand-500/10">
                                  Edit
                                </button>
                              )}
                              {isMaster && (
                                <button onClick={() => confirmDeleteMember(m)}
                                  className="text-surface-500 hover:text-crimson-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-crimson-500/10">
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>



            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-8">
              {admins.length > 0 && (
                <div className="space-y-4">
                  <p className="px-2 text-[10px] font-black text-gold-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                    Administrators ({admins.length})
                  </p>
                  <div className="grid gap-4">
                    {admins.map(m => (
                      <div key={m.id} className="bg-surface-900 border border-gold-500/20 rounded-2xl p-5 shadow-card hover:border-gold-500/40 transition-all flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${m.role === 'master' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gold-500/10 text-gold-400 border-gold-500/20'}`}>
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border ${m.role === 'master' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gold-500/10 text-gold-400 border-gold-500/20'}`}>
                                  {m.role || 'admin'}
                                </span>
                              </div>
                           </div>
                           <div className="text-right">
                             <p className={`text-[10px] font-black tracking-widest ${isOnline(m.lastactive) ? 'text-green-400' : 'text-surface-600'}`}>
                               {isOnline(m.lastactive) ? '● ONLINE' : 'OFFLINE'}
                             </p>
                             {!isOnline(m.lastactive) && m.lastactive && (
                               <p className="text-[9px] text-surface-500 mt-0.5 font-bold uppercase">{formatLastActive(m.lastactive)}</p>
                             )}
                           </div>
                         </div>
      
                         <div className="flex gap-2 pt-3 border-t border-surface-800/50">
                             {(isMaster || m.id === userProfile?.id) && (
                               <button onClick={() => setEditingMember(m)}
                                  className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 transition-all border border-surface-700">
                                 Edit
                               </button>
                             )}
                            {isMaster && (
                              <button onClick={() => confirmDeleteMember(m)}
                                 className="px-4 py-2.5 rounded-xl bg-surface-800 text-crimson-500 hover:bg-crimson-500/10 transition-all border border-surface-700">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                              </button>
                            )}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {regularMembers.length > 0 && (
                <div className="space-y-4">
                  <p className="px-2 text-[10px] font-black text-surface-500 uppercase tracking-[0.2em]">
                    Team Members ({regularMembers.length})
                  </p>
                  <div className="grid gap-4">
                    {regularMembers.map(m => (
                      <div key={m.id} className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-card hover:border-surface-700 transition-all flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className="w-10 h-10 rounded-full bg-crimson-500/10 text-crimson-400 flex items-center justify-center text-sm font-bold shrink-0 border border-crimson-500/20">
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-surface-800 text-surface-400 border border-surface-700/50">
                                    {m.phone || 'No Phone'}
                                  </span>
                                  {m.role === 'logistics' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      Logistics
                                    </span>
                                  )}
                                </div>
                              </div>
                           </div>
                           <div className="text-right">
                             <p className={`text-[10px] font-black tracking-widest ${isOnline(m.lastactive) ? 'text-green-400' : 'text-surface-600'}`}>
                               {isOnline(m.lastactive) ? '● ONLINE' : 'OFFLINE'}
                             </p>
                             {!isOnline(m.lastactive) && m.lastactive && (
                               <p className="text-[9px] text-surface-500 mt-0.5 font-bold uppercase">{formatLastActive(m.lastactive)}</p>
                             )}
                           </div>
                         </div>
      
                         <div className="flex gap-2 pt-3 border-t border-surface-800/50">
                             {(isMaster || m.id === userProfile?.id) && (
                               <button onClick={() => setEditingMember(m)}
                                  className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 transition-all border border-surface-700">
                                 Edit
                               </button>
                             )}
                            {isMaster && (
                              <button onClick={() => confirmDeleteMember(m)}
                                 className="px-4 py-2.5 rounded-xl bg-surface-800 text-crimson-500 hover:bg-crimson-500/10 transition-all border border-surface-700">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                              </button>
                            )}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
      
      {/* Modals */}
      <AddTroupeModal 
        isOpen={showTroupeModal || !!editingTroupe} 
        onClose={() => { setShowTroupeModal(false); setEditingTroupe(null); }} 
        onSave={(data, id) => id ? updateTroupe(id, data) : addTroupe(data)} 
        editData={editingTroupe}
      />
      <AddMemberModal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} onAdd={addMember} />
      <EditMemberModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} member={editingMember} onSave={updateMember} isMaster={isMaster} />
    </div>
  )
}
