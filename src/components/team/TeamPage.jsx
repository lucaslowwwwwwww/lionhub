import { useState, useEffect, useMemo } from 'react'
import { useTroupes } from '../../hooks/useTroupes'
import { useMembers } from '../../hooks/useMembers'
import { useAudit } from '../../hooks/useAudit'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase'
// Helper to create a one-time non-persistent client for admin creation
const createAuthClient = () => createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `auth-temp-${Math.random().toString(36).substring(7)}`
    }
  }
)

// ─── Add Troupe Modal ───
function AddTroupeModal({ isOpen, onClose, onSave, editData }) {
  const [name, setName] = useState('')

  // Sync with editData when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(editData?.name || '')
      setVehiclePlate(editData?.vehicleplate || '')
    }
  }, [isOpen, editData])

  const [vehiclePlate, setVehiclePlate] = useState('')

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
function AddMemberModal({ isOpen, onClose, onAdd, troupes }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const isAdmin = role === 'admin'

    if (isAdmin) {
      if (!email || !password) {
        setError('Email and password are required for admin accounts.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }

    if (!displayName || !phone) {
      setError('Full name and phone number are required.')
      return
    }

    setSaving(true)
    try {
      let uid = null
      
      if (isAdmin) {
        console.log('Creating Admin Auth account...')
        const tempClient = createAuthClient()
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email,
          password,
          options: { data: { displayName, role } }
        })
        console.log('Auth signUp result:', { authData, authError })
        if (authError) throw authError
        uid = authData.user?.id || null
      }

      // Save the user profile to Supabase
      console.log('Saving profile to database...', { uid, displayName, role })
      await onAdd({
        uid: uid,
        displayname: displayName,
        email: isAdmin ? email : '',
        phone,
        role
      })
      console.log('Profile saved successfully.')

      // Reset form and close
      setDisplayName('')
      setEmail('')
      setPassword('')
      setPhone('')
      setRole('member')
      onClose()
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setError('This email is already registered.')
      } else if (err.code === 'auth/invalid-email' || err.message?.includes('invalid-email')) {
        setError('Invalid email address.')
      } else {
        setError(err.message || 'Failed to create account. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center sticky top-0 bg-surface-900 z-10">
          <h3 className="text-xl font-bold text-surface-100">Add Member</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-crimson-500/10 border border-crimson-500/20 rounded-lg px-4 py-3 text-crimson-400 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Full Name</label>
            <input required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              placeholder="e.g. Ah Huat" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Phone *</label>
              <input required type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                placeholder="+60 12-345 6789" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all appearance-none">
                <option value="member">Member (Personnel)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
          </div>

          {role === 'admin' && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Email *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="ah@huat.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Password *</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="Min 6 chars" />
              </div>
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-lg bg-crimson-600 text-white font-bold hover:bg-crimson-500 transition-colors disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Member Modal ───
function EditMemberModal({ isOpen, onClose, member, onSave, troupes, isMaster }) {
  const { logAction } = useAudit()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      setPassword('')
      setError('')
    }
  }, [member])

  if (!isOpen || !member) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const isPromotingToAdmin = role === 'admin' && !member.uid
    const isAdmin = role === 'admin'

    if (isPromotingToAdmin) {
      if (!email || !password) {
        setError('Email and password are required to promote to admin.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }

    setSaving(true)
    try {
      let uid = member.uid
      let currentEmail = email || member.email

      if (isPromotingToAdmin) {
        console.log('Promoting to Admin: Creating Auth account...')
        const tempClient = createAuthClient()
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email,
          password,
          options: { data: { displayName, role } }
        })
        console.log('Promotion Auth result:', { authData, authError })
        if (authError) throw authError
        uid = authData.user?.id || null
        currentEmail = email
      }

      const oldRole = member.role || 'member'
      console.log('Updating member profile in DB...', { id: member.id, role })
      await onSave(member.id, { 
        displayname: displayName, 
        phone, 
        role, 
        uid, 
        email: currentEmail 
      })
      console.log('Member profile updated successfully.')
      
      if (oldRole !== role) {
        logAction('CHANGE_ROLE', { userId: member.id, oldRole, newRole: role })
      }
      
      onClose()
    } catch (err) {
      console.error('Error in EditMemberModal:', err)
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setError('This email is already registered.')
      } else {
        setError(err.message || 'Failed to update member. Please try again.')
      }
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
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Full Name</label>
            <input required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
              placeholder="e.g. Ah Huat" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Phone *</label>
              <input required type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                placeholder="+60 12-345 6789" />
            </div>
            {isMaster && (
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 transition-all appearance-none">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>

          {role === 'admin' && !member.uid && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in border-t border-surface-800 pt-4">
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">New Email *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Initial Password *</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg px-4 py-3 text-surface-100 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-all"
                  placeholder="Min 6 chars" />
              </div>
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
  const [activeTab, setActiveTab] = useState('troupes')
  const [showTroupeModal, setShowTroupeModal] = useState(false)
  const [editingTroupe, setEditingTroupe] = useState(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  
  const { userProfile } = useAuth()
  const isMaster = userProfile?.role === 'master'

  const { troupes, loading: loadingT, timeoutError: timeoutT, addTroupe, updateTroupe, deleteTroupe } = useTroupes()
  const { members: rawMembers, loading: loadingM, timeoutError: timeoutM, addMember, updateMember, deleteMember } = useMembers()
  
  const { admins, regularMembers, masters } = useMemo(() => {
    const activeMembers = rawMembers.filter(m => m.status !== 'deleted')
    
    const mastersList = activeMembers
      .filter(m => m.role === 'master')
      .sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''))
      
    const adminsList = activeMembers
      .filter(m => m.role === 'admin')
      .sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''))
    
    const membersList = activeMembers
      .filter(m => m.role !== 'admin' && m.role !== 'master')
      .sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''))
      
    return { admins: adminsList, regularMembers: membersList, masters: mastersList }
  }, [rawMembers])

  const members = [...masters, ...admins, ...regularMembers]

  const loading = loadingT || loadingM

  const getTroupeName = (troupeId) => troupes.find(t => t.id === troupeId)?.name || 'Unassigned'

  const confirmDeleteMember = (m) => {
    if (window.confirm(`Are you sure you want to remove ${m.displayname || 'this member'} from the system?`)) {
      deleteMember(m.id)
    }
  }

  const isOnline = (lastActive) => {
    if (!lastActive) return false
    try {
      const ms = lastActive.toMillis ? lastActive.toMillis() : new Date(lastActive).getTime()
      return (Date.now() - ms) < 300000 // 5 minutes
    } catch(e) { return false }
  }

  const formatLastActive = (lastActive) => {
    if (!lastActive) return 'Never'
    try {
      const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } catch(e) { return 'Unknown' }
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-surface-100 tracking-tight">Team Management</h2>
          <p className="text-surface-400 mt-1 font-medium">Manage your troupes and members</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => activeTab === 'troupes' ? setShowTroupeModal(true) : setShowMemberModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crimson-600 text-white font-bold hover:bg-crimson-500 shadow-lg shadow-crimson-500/20 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{activeTab === 'troupes' ? 'New Troupe' : 'Add Member'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface-900 border border-surface-800 rounded-xl p-1">
        {['troupes', 'members'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === tab
                ? 'bg-crimson-600 text-white shadow-lg shadow-crimson-500/20'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
            }`}
          >
            {tab === 'troupes' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Troupes
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Members
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-crimson-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : activeTab === 'troupes' ? (
        /* ─── Troupes Tab ─── */
        troupes.length === 0 ? (
          <div className="bg-surface-900 border border-surface-800 border-dashed rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h3 className="text-xl font-bold text-surface-100 mb-2">No Troupes Yet</h3>
            <p className="text-surface-400 mb-6">Create your troupes here. Members can be assigned to them on the daily itinerary.</p>
            <button onClick={() => setShowTroupeModal(true)}
              className="px-6 py-3 rounded-xl bg-surface-800 text-surface-100 font-bold hover:bg-surface-700 transition-all">
              + Create First Troupe
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {troupes.map(troupe => {
              return (
                <div key={troupe.id} className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-card hover:border-surface-700 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-crimson-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></span>
                        {troupe.name}
                      </h3>
                      {troupe.vehicleplate && (
                        <span className="text-[10px] font-black text-surface-500 bg-surface-800 px-2 py-1 rounded inline-flex items-center gap-1.5 mt-1">
                          <svg className="w-3 h-3 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                          {troupe.vehicleplate}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTroupe(troupe)}
                        className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-colors px-2 py-1 rounded hover:bg-brand-500/10">
                        Edit
                      </button>
                      <button onClick={() => deleteTroupe(troupe.id)}
                        className="text-surface-500 hover:text-crimson-400 text-xs font-bold transition-colors px-2 py-1 rounded hover:bg-crimson-500/10">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ─── Members Tab ─── */
        members.length === 0 ? (
          <div className="bg-surface-900 border border-surface-800 border-dashed rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-surface-100 mb-2">No Members</h3>
            <p className="text-surface-400 mb-6">Add your first team member to get started.</p>
            <button onClick={() => setShowMemberModal(true)}
              className="px-6 py-3 rounded-xl bg-surface-800 text-surface-100 font-bold hover:bg-surface-700 transition-all">
              + Add First Member
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
                  {/* Masters Section */}
                  {masters.length > 0 && (
                    <>
                      <tr className="bg-surface-950/60">
                        <td colSpan="3" className="px-5 py-2.5 text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] border-y border-surface-800">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
                             Command Master ({masters.length})
                          </div>
                        </td>
                      </tr>
                      {masters.map(m => (
                        <tr key={m.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 border border-violet-500/20">
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
                              <span className="text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest w-fit bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                {m.role || 'master'}
                              </span>
                              {!isOnline(m.lastactive) && m.lastactive && (
                                <span className="text-[10px] mt-1 font-medium opacity-80">Seen {formatLastActive(m.lastactive)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => setEditingMember(m)}
                                className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-brand-500/10">
                                Edit
                              </button>
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
                                <span className="w-8 h-8 rounded-full bg-gold-500/10 text-gold-400 flex items-center justify-center text-xs font-bold shrink-0 border border-gold-500/20">
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
                              <span className="text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest w-fit bg-gold-500/10 text-gold-400 border border-gold-500/20">
                                {m.role || 'admin'}
                              </span>
                              {!isOnline(m.lastactive) && m.lastactive && (
                                <span className="text-[10px] mt-1 font-medium opacity-80">Seen {formatLastActive(m.lastactive)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => setEditingMember(m)}
                                className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-brand-500/10">
                                Edit
                              </button>
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
                              <span className="text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest w-fit bg-surface-800 border border-surface-700/50">
                                {m.role || 'member'}
                              </span>
                              {!isOnline(m.lastactive) && m.lastactive && (
                                <span className="text-[10px] mt-1 font-medium opacity-80">Seen {formatLastActive(m.lastactive)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => setEditingMember(m)}
                                className="text-surface-400 hover:text-brand-400 text-xs font-bold transition-all px-2 py-1 rounded hover:bg-brand-500/10">
                                Edit
                              </button>
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
              {masters.length > 0 && (
                <div className="space-y-4">
                  <p className="px-2 text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                    Command Master ({masters.length})
                  </p>
                  <div className="grid gap-4">
                    {masters.map(m => (
                      <div key={m.id} className="bg-surface-900 border border-violet-500/20 rounded-2xl p-5 shadow-card hover:border-violet-500/40 transition-all flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center text-sm font-bold shrink-0 border border-violet-500/20">
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                  {m.role || 'master'}
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
                            <button onClick={() => setEditingMember(m)}
                               className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 transition-all border border-surface-700">
                               Edit
                            </button>
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
                                <span className="w-10 h-10 rounded-full bg-gold-500/10 text-gold-400 flex items-center justify-center text-sm font-bold shrink-0 border border-gold-500/20">
                                  {m.displayname?.charAt(0) || '?'}
                                </span>
                                {isOnline(m.lastactive) && (
                                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface-900 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                                )}
                              </div>
                              <div>
                                <p className="text-surface-100 font-bold">{m.displayname || 'Unknown'}</p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-gold-500/10 text-gold-400 border border-gold-500/20">
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
                            <button onClick={() => setEditingMember(m)}
                               className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 transition-all border border-surface-700">
                               Edit
                            </button>
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
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-surface-800 text-surface-400 border border-surface-700/50">
                                  {m.phone || 'No Phone'}
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
                            <button onClick={() => setEditingMember(m)}
                               className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 transition-all border border-surface-700">
                               Edit
                            </button>
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
      <AddMemberModal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} onAdd={addMember} troupes={troupes} />
      <EditMemberModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} member={editingMember} onSave={updateMember} troupes={troupes} isMaster={isMaster} />
    </div>
  )
}
