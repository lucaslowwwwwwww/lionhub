import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'

/**
 * GeneralSettings
 * Professional tabbed interface for managing application-wide configurations.
 */
export default function GeneralSettings() {
  const { settings, loading, timeoutError, updateSettings } = useSettings()
  const { userProfile, deleteAccount, updateProfile } = useAuth()
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)

  const [activeTab, setActiveTab] = useState('club')
  const [localSettings, setLocalSettings] = useState({
    theme: userProfile?.appearance?.theme || localStorage.getItem('app-theme') || 'dark',
    baselocation: '',
    defaultduration: 30,
    lioncolors: [],
    cnyoverrides: {},
    clubnameen: '',
    clubnamecn: '',
    clubaddress: '',
    clubphone: '',
    receiptpreparedby: '',
    signatoryphone: '',
    clubregistrationno: '',
    bankname: '',
    banktype: '',
    banknumber: ''
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [newColor, setNewColor] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (settings) {
      setLocalSettings(prev => ({
        ...prev,
        baselocation: settings.baselocation || '',
        defaultduration: settings.defaultduration || 30,
        lioncolors: settings.lioncolors || ['黑|Black', '黄|Yellow', '紫|Purple', '橙|Orange', '青|Green', '红|Red', '白|White'],
        cnyoverrides: settings.cnyoverrides || {},
        clubnameen: settings.clubnameen || 'Persatuan Tarian Singa Dan Naga Chuan Cheng Melaka',
        clubnamecn: settings.clubnamecn || '馬來西亞馬六甲傳承龍獅體育會',
        clubaddress: settings.clubaddress || 'NO 23-1, JALAN IMJ 2, TAMAN INDUSTRI MALIM JAYA, 75250, MELAKA',
        clubphone: settings.clubphone || '012-328 2862 / 013-666 0979',
        clubregistrationno: settings.clubregistrationno || '(PPM-015-04-30122019)',
        receiptpreparedby: settings.receiptpreparedby || 'REX YONG',
        signatoryphone: settings.signatoryphone || '60136660979',
        bankname: settings.bankname || 'PERSATUAN TARIAN NAGA DAN SINGA CHUAN CHENG MELAKA',
        banktype: settings.banktype || 'CIMB',
        banknumber: settings.banknumber || '8011396083',
        theme: userProfile?.appearance?.theme || settings.theme || localStorage.getItem('app-theme') || 'dark'
      }))
    }
  }, [settings, userProfile?.appearance?.theme])

  const handleLocalThemeChange = (newTheme) => {
    setLocalSettings(prev => ({ ...prev, theme: newTheme }))
    // Dispatch a preview event (detail contains the theme)
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }))
  }

  const handleSave = async () => {
    if (!isAdmin) return
    setIsSaving(true)
    setSaveMessage('')
    try {
      // 1. Persist personal theme preference to user profile
      localStorage.setItem('app-theme', localSettings.theme)
      await updateProfile({
        appearance: { 
          ...userProfile?.appearance,
          theme: localSettings.theme 
        }
      })
      window.dispatchEvent(new Event('theme-changed'))

      // 2. Sync global settings (excluding theme if possible, but keeping it for legacy)
      const { theme, ...globalData } = localSettings
      await updateSettings({
        ...globalData,
        defaultduration: Number(localSettings.defaultduration) || 30
      })
      setSaveMessage('Success: Preferences & Global Settings synchronized.')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveMessage('Error: Synchronization failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
    } catch (err) {
      alert("Verification required. Please sign out and sign back in to delete your account.")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-surface-800 border-t-crimson-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">Initializing Systems...</p>
      </div>
    )
  }

  const tabs = [
    { id: 'club', label: 'Organization', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    )},
    { id: 'logistics', label: 'Logistics', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { id: 'assets', label: 'Lion Assets', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" /></svg>
    )},
    { id: 'app', label: 'Preferences', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    )},
    { id: 'calendar', label: 'Calendar', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
    { id: 'account', label: 'Security', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    )}
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {timeoutError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-bold">Slow connection detected</p>
            <p className="text-amber-500/70 text-xs font-medium">The system settings took longer than expected to load. Try refreshing.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Refresh
          </button>
        </div>
      )}
      
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-surface-50 tracking-tight uppercase">Master Console</h1>
          <p className="text-surface-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">System level configuration & club overrides</p>
        </div>
        
        {isAdmin && activeTab !== 'overview' && activeTab !== 'account' && (
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black uppercase tracking-widest ${saveMessage.includes('Error') ? 'text-crimson-500' : 'text-green-500'}`}>
              {saveMessage}
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-crimson-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 hover:bg-crimson-500 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSaving ? 'Syncing...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex items-center gap-1 p-1 bg-surface-900/60 border border-surface-800/50 rounded-2xl backdrop-blur-md overflow-x-auto no-scrollbar shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-surface-800 text-crimson-400 shadow-inner' 
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="px-4">
        {activeTab === 'club' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Official Club Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Club Name (English)</label>
                    <input type="text" value={localSettings.clubnameen} onChange={(e) => setLocalSettings({...localSettings, clubnameen: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Club Name (Chinese)</label>
                    <input type="text" value={localSettings.clubnamecn || ''} onChange={(e) => setLocalSettings({...localSettings, clubnamecn: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Reg No (e.g. PPM...)</label>
                    <input type="text" value={localSettings.clubregistrationno || ''} onChange={(e) => setLocalSettings({...localSettings, clubregistrationno: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">HQ Address (Receipt Header)</label>
                    <textarea rows={4} value={localSettings.clubaddress} onChange={(e) => setLocalSettings({...localSettings, clubaddress: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 py-3 text-xs text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner resize-none leading-relaxed" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Contact Phone (Header)</label>
                    <input type="text" value={localSettings.clubphone} onChange={(e) => setLocalSettings({...localSettings, clubphone: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Receipt Prepared By (Signatory)</label>
                    <input type="text" value={localSettings.receiptpreparedby} onChange={(e) => setLocalSettings({...localSettings, receiptpreparedby: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Signatory Contact Phone</label>
                    <input type="text" value={localSettings.signatoryphone} onChange={(e) => setLocalSettings({...localSettings, signatoryphone: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                 </div>
              </div>
            </section>

            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Bank Transfer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Account Holder Name</label>
                      <input type="text" value={localSettings.bankname} onChange={(e) => setLocalSettings({...localSettings, bankname: e.target.value})}
                        className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner uppercase" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Bank Name / Type</label>
                      <input type="text" value={localSettings.banktype} onChange={(e) => setLocalSettings({...localSettings, banktype: e.target.value})}
                        className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-sm text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner uppercase" placeholder="e.g. CIMB" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Account Number</label>
                    <input type="text" value={localSettings.banknumber} onChange={(e) => setLocalSettings({...localSettings, banknumber: e.target.value})}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-12 text-xl text-surface-100 font-black focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner tabular-nums" />
                    <p className="text-[10px] text-surface-600 font-bold italic mt-3 px-1 leading-relaxed">This information is displayed at the bottom of generated PDF receipts to facilitate customer payments.</p>
                 </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'app' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Visual Preference */}
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Appearance Engine</h3>
              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Color Palette Mode</label>
                <div className="flex gap-2">
                  {['dark', 'light', 'system'].map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => handleLocalThemeChange(theme)}
                      className={`flex-1 py-4 px-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        localSettings.theme === theme 
                          ? 'bg-crimson-500/10 border-crimson-500/50 text-crimson-400 shadow-glow' 
                          : 'bg-surface-950 border-surface-800 text-surface-500 hover:border-surface-700'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Base Location */}
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Geographic Origin</h3>
              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">HQ / Dispatch Address</label>
                <textarea
                  rows={2}
                  value={localSettings.baselocation}
                  onChange={(e) => setLocalSettings({ ...localSettings, baselocation: e.target.value })}
                  className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 py-4 text-surface-200 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner resize-none text-sm leading-relaxed"
                  placeholder="23, Jalan Imj 2, Melaka"
                />
                <p className="text-[10px] text-surface-600 font-bold italic mt-3 px-1">Used as the primary waypoint for G-Maps route optimization and troupe dispatching.</p>
              </div>
            </section>

            {/* Performance Logic */}
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Scheduling Logic</h3>
              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Standard Performance Slot (Mins)</label>
                <div className="relative group">
                   <input
                    type="number"
                    min="5"
                    step="5"
                    value={localSettings.defaultduration}
                    onChange={(e) => setLocalSettings({ ...localSettings, defaultduration: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-black focus:outline-none focus:border-crimson-500/50 transition-all text-xl tabular-nums shadow-inner"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-surface-700 font-black uppercase text-[10px] tracking-widest pointer-events-none group-focus-within:text-crimson-500">Minutes</div>
                </div>
                <p className="text-[10px] text-surface-600 font-bold italic mt-3 px-1 leading-relaxed">This value automatically populates your schedule gaps when deploying troupes in the field.</p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Equipment Assets */}
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Performance Assets</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Standard Lion Colors</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {localSettings.lioncolors.map((color) => (
                      <div key={color} className="flex items-center gap-2 pl-4 pr-2 h-10 bg-surface-950 border border-surface-800 rounded-xl group hover:border-crimson-500/30 transition-all">
                        <span className="text-xs font-bold text-surface-200">{color.includes('|') ? color.split('|')[1].trim().toUpperCase() : color}</span>
                        <button
                          type="button"
                          onClick={() => setLocalSettings(prev => ({ ...prev, lioncolors: prev.lioncolors.filter(c => c !== color) }))}
                          className="w-6 h-6 flex items-center justify-center text-surface-600 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-md transition-all ml-1"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom color (e.g. 白|White)..."
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!newColor.trim()) return
                          setLocalSettings(p => ({ ...p, lioncolors: [...p.lioncolors, newColor.trim()] }))
                          setNewColor('')
                        }
                      }}
                      className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 h-12 text-sm text-surface-100 focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                         if (!newColor.trim()) return
                         setLocalSettings(p => ({ ...p, lioncolors: [...p.lioncolors, newColor.trim()] }))
                         setNewColor('')
                      }}
                      className="px-6 h-12 bg-surface-800 hover:bg-surface-700 text-surface-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >Add</button>
                  </div>
                  <p className="text-[9px] text-surface-600 font-bold italic mt-3 px-1">Tip: Use "Chinese|English" (e.g. 粉|PINK) to automatically translate colors for the receipt.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Lunar Year Cycles</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl mb-4">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs text-amber-400 font-medium leading-relaxed">Set the "Day 1" of CNY to enable accurate 15-day tracking and automated zodiac scheduling logic for the entire troupe.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-surface-950/50 p-4 border border-surface-800 rounded-2xl">
                    <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Active Cycle</label>
                    <p className="text-2xl font-black text-surface-200 tracking-tighter">{new Date().getFullYear()}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest pl-1">Override Day 1</label>
                    <input 
                      type="date"
                      value={localSettings.cnyoverrides?.[new Date().getFullYear()] || ''}
                      onChange={(e) => {
                        const yr = new Date().getFullYear();
                        setLocalSettings(p => ({ ...p, cnyoverrides: { ...p.cnyoverrides, [yr]: e.target.value } }));
                      }}
                      className="w-full bg-surface-950 border border-surface-800 rounded-2xl h-14 px-5 text-sm font-black text-amber-500 focus:outline-none focus:border-amber-500/50 shadow-inner"
                    />
                  </div>
                </div>

                {localSettings.cnyoverrides?.[new Date().getFullYear()] && (
                   <button 
                     onClick={() => {
                        const yr = new Date().getFullYear();
                        const next = { ...localSettings.cnyoverrides };
                        delete next[yr];
                        setLocalSettings(p => ({ ...p, cnyoverrides: next }));
                     }}
                     className="text-[9px] font-black text-crimson-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-crimson-500/5 px-4 py-2 rounded-xl transition-all mx-auto"
                   >✕ Clear Override</button>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-crimson-950/10 border border-crimson-900/30 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-md">
                  <h3 className="text-xl font-black text-crimson-500 uppercase tracking-tight mb-2">Danger Zone</h3>
                  <p className="text-sm text-surface-400 font-medium leading-relaxed">Permanently terminate your secure session and remove all personal authentication tokens from our encrypted indices. This action is irreversible.</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-8 py-3.5 bg-crimson-600 border border-crimson-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-crimson-500 shadow-xl shadow-crimson-600/20 transition-all active:scale-95 whitespace-nowrap"
                >
                  Terminate Account
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-900 border border-surface-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-crimson-500/10 text-crimson-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-glow-crimson">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-surface-100 uppercase tracking-tight mb-3">Terminate?</h3>
              <p className="text-sm font-bold text-surface-500 uppercase tracking-widest leading-relaxed px-4">This action permanently deletes your identity record and cannot be undone.</p>
            </div>
            <div className="p-4 bg-surface-950/60 border-t border-surface-800 flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-4 rounded-2xl bg-surface-800 text-[10px] font-black text-surface-300 uppercase tracking-[0.2em] hover:bg-surface-700 transition-all"
              >Abort</button>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-4 rounded-2xl bg-crimson-600 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 hover:bg-crimson-500 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Erasing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
