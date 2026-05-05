import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useOrg } from '../../contexts/OrgContext'
import { useAuth } from '../../hooks/useAuth'
import { useAudit } from '../../hooks/useAudit'

/**
 * SuperAdminDashboard
 * Dedicated platform interface for Super Master Administrators.
 */
export default function SuperAdminDashboard() {
  const { isSuperAdmin, impersonatedOrgId, setImpersonatedOrgId } = useOrg()
  const { userProfile, logout } = useAuth()
  const { logAction } = useAudit()
  const [orgs, setOrgs] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newOrgData, setNewOrgData] = useState({ 
    name_en: '',
    name_cn: '', 
    registration_no: '', 
    master_email: '',
    master_name: '',
    subscription_start: new Date().toISOString().split('T')[0],
    subscription_duration: '1y'
  })
  const [registering, setRegistering] = useState(false)
  const [lastRegistered, setLastRegistered] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [orgToRenew, setOrgToRenew] = useState(null)
  const [renewDuration, setRenewDuration] = useState('1y')
  const [renewing, setRenewing] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) return

    async function fetchData() {
      try {
        const [orgsRes, usersRes] = await Promise.all([
          supabase.from('organizations').select('*, users(count)').order('name_en', { ascending: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'super_admin')
        ])

        if (orgsRes.error) throw orgsRes.error
        setOrgs(orgsRes.data || [])
        setTotalUsers(usersRes.count || 0)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isSuperAdmin])

  const toggleOrgStatus = async (orgId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const confirmMessage = newStatus === 'inactive' 
      ? 'Are you sure you want to DEACTIVATE this association? Its users will be logged out and unable to access the system.'
      : 'Reactivate this association?'

    if (!window.confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', orgId)

      if (error) throw error

      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: newStatus } : o))
      logAction('SUPER_ADMIN_TOGGLE_ORG_STATUS', { targetOrgId: orgId, newStatus })
    } catch (err) {
      console.error('Failed to update org status:', err)
      alert('Failed to update organization status.')
    }
  }

  const handleRegisterOrg = async (e) => {
    e.preventDefault()
    if (!newOrgData.name_en) return alert('English Name is required.')
    if (!newOrgData.master_email) return alert('Master Admin Email is required.')
    
    setRegistering(true)
    setLastRegistered(null)
    try {
      // Calculate expires_at
      const start = new Date(newOrgData.subscription_start)
      const durationMap = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }
      const expires = new Date(start)
      expires.setMonth(start.getMonth() + (durationMap[newOrgData.subscription_duration] || 12))
      const expires_at = expires.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('organizations')
        .insert([{
          name_en: newOrgData.name_en,
          name_cn: newOrgData.name_cn,
          registration_no: newOrgData.registration_no,
          master_email: newOrgData.master_email,
          master_name: newOrgData.master_name,
          subscription_start: newOrgData.subscription_start,
          subscription_duration: newOrgData.subscription_duration,
          expires_at: expires_at,
          status: 'active'
        }])
        .select('*, users(count)')
        .single()

      if (error) throw error
      
      setOrgs(prev => [...prev, data].sort((a, b) => a.name_en.localeCompare(b.name_en)))
      setLastRegistered(data)
      setNewOrgData({ 
        name_en: '', 
        name_cn: '', 
        registration_no: '', 
        master_email: '',
        master_name: '',
        subscription_start: new Date().toISOString().split('T')[0],
        subscription_duration: '1y'
      })
      logAction('SUPER_ADMIN_CREATE_ORG', { newOrgId: data.id, orgName: data.name_en, masterEmail: data.master_email })
    } catch (err) {
      console.error('Failed to register org:', err)
      alert('Registration failed.')
    } finally {
      setRegistering(false)
    }
  }

  const handleDeleteOrg = async () => {
    if (!orgToDelete || deleteConfirmName !== orgToDelete.name_en) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgToDelete.id)

      if (error) throw error

      setOrgs(prev => prev.filter(o => o.id !== orgToDelete.id))
      logAction('SUPER_ADMIN_DELETE_ORG', { orgId: orgToDelete.id, orgName: orgToDelete.name_en })
      setShowDeleteModal(false)
      setOrgToDelete(null)
      setDeleteConfirmName('')
    } catch (err) {
      console.error('Failed to delete org:', err)
      alert('Deletion failed. Ensure you have proper permissions.')
    } finally {
      setDeleting(false)
    }
  }

  // Helper: compute time remaining from expiration date
  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return { text: 'No Plan', color: 'text-surface-500', urgent: false }
    const now = new Date()
    const exp = new Date(expiresAt)
    const diffMs = exp - now
    if (diffMs <= 0) return { text: 'Expired', color: 'text-crimson-500', urgent: true }
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 7) return { text: `${diffDays} Day${diffDays > 1 ? 's' : ''} Left`, color: 'text-crimson-500', urgent: true }
    if (diffDays <= 30) return { text: `${diffDays} Days Left`, color: 'text-yellow-500', urgent: true }
    if (diffDays <= 90) return { text: `${Math.floor(diffDays / 30)} Month${Math.floor(diffDays / 30) > 1 ? 's' : ''} Left`, color: 'text-yellow-400', urgent: false }
    
    const months = Math.floor(diffDays / 30)
    if (months >= 12) {
      const years = Math.floor(months / 12)
      const remainMonths = months % 12
      return { text: remainMonths > 0 ? `${years}y ${remainMonths}m Left` : `${years} Year${years > 1 ? 's' : ''} Left`, color: 'text-green-500', urgent: false }
    }
    return { text: `${months} Month${months > 1 ? 's' : ''} Left`, color: 'text-green-500', urgent: false }
  }

  const handleRenewSubscription = async () => {
    if (!orgToRenew) return
    
    setRenewing(true)
    try {
      // Start from the existing expiration or today (whichever is later)
      const existingExpiry = orgToRenew.expires_at ? new Date(orgToRenew.expires_at) : new Date()
      const baseDate = existingExpiry > new Date() ? existingExpiry : new Date()
      
      const durationMap = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }
      const additionalMonths = durationMap[renewDuration] || 12
      
      const newExpiry = new Date(baseDate)
      newExpiry.setMonth(baseDate.getMonth() + additionalMonths)
      const expires_at = newExpiry.toISOString().split('T')[0]

      // Store only the latest plan duration (don't accumulate)
      const subscription_duration = renewDuration

      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          expires_at,
          subscription_duration,
          status: 'active'
        })
        .eq('id', orgToRenew.id)
        .select('*, users(count)')
        .single()

      if (error) throw error

      setOrgs(prev => prev.map(o => o.id === data.id ? data : o))
      logAction('SUPER_ADMIN_RENEW_SUBSCRIPTION', { orgId: data.id, newExpiry: expires_at, duration: renewDuration })
      setShowRenewModal(false)
      setOrgToRenew(null)
    } catch (err) {
      console.error('Failed to renew subscription:', err)
      alert('Renewal failed.')
    } finally {
      setRenewing(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-950 text-center px-4">
        <div className="w-16 h-16 bg-crimson-500/10 text-crimson-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-surface-50 uppercase tracking-widest">Access Denied</h2>
        <p className="text-surface-500 text-sm mt-2 mb-8">This platform console is restricted to Super Master Administrators.</p>
        <button onClick={logout} className="px-8 py-3 bg-surface-800 text-surface-200 font-bold uppercase tracking-widest rounded-xl text-xs hover:bg-surface-700 transition-colors">
          Return to Login
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col relative overflow-hidden">
      {/* Platform Watermark */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0 select-none overflow-hidden">
        <img 
          src="/lionhub_logo.jpeg" 
          alt="Lion Hub" 
          className="w-[150%] sm:w-[100%] max-w-none h-auto object-contain grayscale"
        />
      </div>

      {/* Super Admin Topbar */}
      <header className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-xl border-b border-surface-800 px-4 sm:px-10 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-surface-700/50 shadow-lg shadow-black/20 shrink-0">
            <img src="/lionhub_logo.jpeg" alt="Lionhub" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black text-surface-50 tracking-tight uppercase leading-tight">Lionhub</h1>
            <p className="text-crimson-500 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Super Admin Terminal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-surface-200">{userProfile?.displayname}</p>
            <p className="text-[10px] text-surface-500 uppercase tracking-widest">{userProfile?.email}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl bg-surface-800 text-surface-400 hover:text-crimson-400 hover:bg-surface-700 transition-all border border-surface-700/50"
            title="Log Out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-10 space-y-6 sm:space-y-10 animate-fade-in relative z-10">
        
        {/* Global Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-crimson-500/10 blur-[40px] rounded-full group-hover:bg-crimson-500/20 transition-all" />
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1 relative z-10">Total Tenants</p>
            <p className="text-4xl font-black text-surface-50 relative z-10">{loading ? '-' : orgs.length}</p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-[40px] rounded-full group-hover:bg-green-500/20 transition-all" />
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1 relative z-10">Active Tenants</p>
            <p className="text-4xl font-black text-surface-50 relative z-10">{loading ? '-' : orgs.filter(o => o.status !== 'inactive').length}</p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-all" />
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1 relative z-10">Platform Users</p>
            <p className="text-4xl font-black text-surface-50 relative z-10">{loading ? '-' : totalUsers}</p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-3xl p-4 sm:p-6 flex flex-col justify-center relative overflow-hidden">
             <button 
               onClick={() => setShowRegisterModal(true)}
               className="w-full h-full min-h-[70px] sm:min-h-[80px] bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all shadow-lg shadow-crimson-600/20"
             >
               <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Register Tenant</span>
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black text-surface-200 uppercase tracking-widest">Active Associations</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-surface-900 border border-surface-800 rounded-3xl p-6 h-64 animate-pulse" />
            ))
          ) : (
            orgs.map((org) => {
              const isCurrent = impersonatedOrgId === org.id
              const isActive = org.status !== 'inactive'
              
              return (
                <div 
                  key={org.id} 
                  className={`group relative overflow-hidden bg-surface-900 border rounded-3xl transition-all duration-500 flex flex-col ${
                    isCurrent ? 'border-crimson-500/50 shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'border-surface-800 hover:border-surface-700'
                  } ${!isActive ? 'opacity-75 grayscale' : ''}`}
                >
                  {/* Status Banner */}
                  {!isActive && (
                    <div className="absolute top-4 right-[-30px] bg-crimson-600 text-white text-[9px] font-black uppercase tracking-widest py-1 px-10 rotate-45 z-20 shadow-lg">
                      Inactive
                    </div>
                  )}

                  {/* Header Area */}
                  <div className="p-6 border-b border-surface-800/50 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-surface-800 bg-surface-950 flex items-center justify-center shrink-0">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name_en} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-surface-600 font-black text-[10px]">NO LOGO</span>
                        )}
                      </div>
                      <div className="flex-1 pr-4">
                        <h3 className="text-base font-black text-surface-50 tracking-tight leading-tight uppercase line-clamp-2">{org.name_en}</h3>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1">{org.name_cn}</p>
                      </div>
                      
                      {/* Delete Trigger */}
                      <button 
                        onClick={() => {
                          setOrgToDelete(org)
                          setShowDeleteModal(true)
                          setDeleteConfirmName('')
                        }}
                        className="p-2 rounded-lg bg-surface-950 border border-surface-800 text-surface-600 hover:text-crimson-500 hover:border-crimson-500/30 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Tenant"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="p-6 flex-1 flex flex-col justify-between z-10 bg-surface-900/50">
                    {/* Metadata Section */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">ID Reference</span>
                        <span className="text-[9px] font-mono text-surface-400 opacity-50">{org.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Created Date</span>
                        <span className="text-[10px] font-bold text-surface-300">{new Date(org.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Reg No</span>
                        <span className="text-[10px] font-bold text-surface-300">{org.registration_no || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Total Users</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse" />
                          <span className="text-[10px] font-black text-white">{org.users?.[0]?.count || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Current Plan</span>
                        <span className="text-[10px] font-bold text-surface-300">
                          {(() => {
                            const dur = org.subscription_duration
                            if (!dur) return 'N/A'
                            const map = { '1m': '1 Month', '3m': '3 Months', '6m': '6 Months', '1y': '1 Year' }
                            return map[dur] || dur
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Time Remaining</span>
                        {(() => {
                          const remaining = getTimeRemaining(org.expires_at)
                          return (
                            <span className={`text-[10px] font-black uppercase tracking-tight ${remaining.color} ${remaining.urgent ? 'animate-pulse' : ''}`}>
                              {remaining.text}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center justify-between px-1 pt-2 border-t border-surface-800/50">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">Expiration</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-tight ${
                            org.expires_at && new Date(org.expires_at) < new Date() ? 'text-crimson-500' : 'text-green-500'
                          }`}>
                            {org.expires_at ? new Date(org.expires_at).toLocaleDateString() : 'NO PLAN'}
                          </span>
                          <button 
                            onClick={() => {
                              setOrgToRenew(org)
                              setShowRenewModal(true)
                            }}
                            className="p-1 rounded bg-surface-800 text-surface-400 hover:text-crimson-400 hover:bg-surface-700 transition-colors"
                            title="Renew Subscription"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Status Toggle */}
                      <div className="flex items-center justify-between px-1 pt-4 border-t border-surface-800/50">
                        <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">System Access</span>
                        <button 
                          onClick={() => toggleOrgStatus(org.id, org.status)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-surface-700'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <button 
                          onClick={() => {
                            setImpersonatedOrgId(null)
                            logAction('SUPER_ADMIN_STOP_IMPERSONATION', {})
                          }}
                          className="w-full py-3.5 rounded-2xl bg-crimson-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-crimson-600/20 hover:bg-crimson-500 transition-all"
                        >
                          Stop Impersonation
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setImpersonatedOrgId(org.id)
                            logAction('SUPER_ADMIN_IMPERSONATION', { 
                              targetOrgId: org.id,
                              targetOrgName: org.name_en 
                            })
                          }}
                          disabled={!isActive}
                          className="w-full py-3.5 rounded-2xl bg-surface-950 text-surface-200 border border-surface-800 font-black text-[10px] uppercase tracking-widest hover:border-crimson-500/50 hover:text-crimson-400 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isActive ? 'Impersonate Tenant' : 'Tenant Deactivated'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-950/80 backdrop-blur-sm p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-surface-50 uppercase tracking-tight">Register Tenant</h3>
                <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mt-1">Scaffold New Association Database</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-surface-500 hover:text-surface-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!lastRegistered ? (
              <form onSubmit={handleRegisterOrg} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">English Name (Required)</label>
                  <input 
                    type="text" 
                    required
                    value={newOrgData.name_en}
                    onChange={(e) => setNewOrgData({...newOrgData, name_en: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                    placeholder="e.g. Chuan Cheng Lion Dance"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Chinese Name</label>
                    <input 
                      type="text" 
                      value={newOrgData.name_cn}
                      onChange={(e) => setNewOrgData({...newOrgData, name_cn: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                      placeholder="e.g. 传承龙狮"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Registration No</label>
                    <input 
                      type="text" 
                      value={newOrgData.registration_no}
                      onChange={(e) => setNewOrgData({...newOrgData, registration_no: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                      placeholder="e.g. PPM-015-04"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Master Admin Email (Required)</label>
                    <input 
                      type="email" 
                      required
                      value={newOrgData.master_email}
                      onChange={(e) => setNewOrgData({...newOrgData, master_email: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                      placeholder="boss@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Master Admin Name</label>
                    <input 
                      type="text" 
                      value={newOrgData.master_name}
                      onChange={(e) => setNewOrgData({...newOrgData, master_name: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Subscription Start</label>
                    <input 
                      type="date" 
                      required
                      value={newOrgData.subscription_start}
                      onChange={(e) => setNewOrgData({...newOrgData, subscription_start: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Plan Duration</label>
                    <select 
                      value={newOrgData.subscription_duration}
                      onChange={(e) => setNewOrgData({...newOrgData, subscription_duration: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
                    >
                      <option value="1m">1 Month</option>
                      <option value="3m">3 Months</option>
                      <option value="6m">6 Months</option>
                      <option value="1y">1 Year</option>
                    </select>
                  </div>
                </div>
                <p className="text-[9px] text-surface-600 font-bold uppercase tracking-widest">Expiration will be calculated automatically based on start date and duration.</p>


                <div className="pt-6 border-t border-surface-800/50 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={registering}
                    className="px-8 py-3 bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-crimson-600/20"
                  >
                    {registering ? 'Creating...' : 'Register Tenant'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">Tenant Registered Successfully</h4>
                  <p className="text-sm text-surface-400 mt-2 px-4 leading-relaxed">
                    Association <span className="text-crimson-500 font-black">{lastRegistered.name_en}</span> is now active.
                  </p>
                </div>

                <div className="bg-surface-950 border border-surface-800 rounded-2xl p-6 space-y-4">
                  <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest text-center">Next Steps for Client</p>
                  <div className="p-4 bg-surface-900 border border-surface-800 rounded-xl text-center">
                    <p className="text-xs font-bold text-surface-200 mb-1">Tell the client to Sign Up using:</p>
                    <p className="text-sm font-black text-crimson-400 tracking-wide">{lastRegistered.master_email}</p>
                  </div>
                  <p className="text-[9px] text-surface-600 text-center font-medium leading-relaxed">
                    Their account will be automatically recognized as the Master Admin upon registration. You do not need to share any passwords.
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setShowRegisterModal(false)
                    setLastRegistered(null)
                  }}
                  className="w-full py-4 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Close & Refresh List
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && orgToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-950/90 backdrop-blur-md p-4">
          <div className="bg-surface-900 border border-crimson-900/30 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-crimson-500/10 text-crimson-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Destructive Action</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed px-4">
                You are about to permanently delete <span className="text-white font-black">{orgToDelete.name_en}</span>. 
                This will wipe out all itineraries, users, financial data, and assets for this tenant. <strong>This cannot be undone.</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-3 text-center">Type the organization name to confirm</label>
                <input 
                  type="text" 
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-surface-50 text-center font-bold focus:border-crimson-500 transition-colors"
                  placeholder={orgToDelete.name_en}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setOrgToDelete(null)
                    setDeleteConfirmName('')
                  }}
                  className="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-200 font-black text-[10px] uppercase tracking-widest hover:bg-surface-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteOrg}
                  disabled={deleting || deleteConfirmName !== orgToDelete.name_en}
                  className="flex-[2] py-4 rounded-2xl bg-crimson-600 disabled:opacity-30 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-crimson-600/20 hover:bg-crimson-500 transition-all"
                >
                  {deleting ? 'Wiping Data...' : 'Confirm Destruction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      {showRenewModal && orgToRenew && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-950/90 backdrop-blur-md p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-crimson-500/10 text-crimson-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Renew Subscription</h3>
              <p className="text-xs text-surface-400 mt-2 font-bold uppercase tracking-widest">{orgToRenew.name_en}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-3">Select Extension Period</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: '1m', label: '1 Month' },
                    { id: '3m', label: '3 Months' },
                    { id: '6m', label: '6 Months' },
                    { id: '1y', label: '1 Year' }
                  ].map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setRenewDuration(plan.id)}
                      className={`py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${
                        renewDuration === plan.id 
                          ? 'bg-crimson-600 border-crimson-500 text-white shadow-lg shadow-crimson-600/20' 
                          : 'bg-surface-950 border-surface-800 text-surface-400 hover:border-surface-700'
                      }`}
                    >
                      {plan.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => {
                    setShowRenewModal(false)
                    setOrgToRenew(null)
                  }}
                  className="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-200 font-black text-[10px] uppercase tracking-widest hover:bg-surface-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRenewSubscription}
                  disabled={renewing}
                  className="flex-[2] py-4 rounded-2xl bg-crimson-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-crimson-600/20 hover:bg-crimson-500 transition-all"
                >
                  {renewing ? 'Updating...' : 'Extend Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
