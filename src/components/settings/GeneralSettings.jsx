import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'

/**
 * GeneralSettings
 * Professional tabbed interface for managing application-wide configurations.
 * Refactored for Multi-Tenant SaaS alignment.
 */
export default function GeneralSettings() {
  const { settings, loading, updateSettings, uploadLogo } = useSettings()
  const { userProfile, deleteAccount, updateProfile } = useAuth()
  const isAdmin = ['admin', 'master'].includes(userProfile?.role)

  const [activeTab, setActiveTab] = useState(isAdmin ? 'club' : 'security')
  const [isUploading, setIsUploading] = useState(false)
  const [localSettings, setLocalSettings] = useState({
    theme: userProfile?.appearance?.theme || localStorage.getItem('ldms-theme') || 'dark',
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
    banknumber: '',
    cai_qing_types: [],
    extra_characters: []
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newCaiQing, setNewCaiQing] = useState('')
  const [newChar, setNewChar] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (settings) {
      setLocalSettings(prev => ({
        ...prev,
        baselocation: settings.baselocation || '',
        defaultduration: settings.defaultduration || 30,
        lioncolors: settings.lioncolors || [],
        cnyoverrides: settings.cnyoverrides || {},
        clubnameen: settings.clubnameen || '',
        clubnamecn: settings.clubnamecn || '',
        clubaddress: settings.clubaddress || '',
        clubphone: settings.clubphone || '',
        clubregistrationno: settings.clubregistrationno || '',
        receiptpreparedby: settings.receiptpreparedby || '',
        signatoryphone: settings.signatoryphone || '',
        bankname: settings.bankname || '',
        banktype: settings.banktype || '',
        banknumber: settings.banknumber || '',
        cai_qing_types: settings.cai_qing_types || [],
        extra_characters: settings.extra_characters || [],
        theme: userProfile?.appearance?.theme || settings.theme || localStorage.getItem('ldms-theme') || 'dark'
      }))
    }
  }, [settings, userProfile?.appearance?.theme])

  const handleLocalThemeChange = (newTheme) => {
    setLocalSettings(prev => ({ ...prev, theme: newTheme }))
    // Update UI immediately for preview
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }))
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploading(true)
    try {
      await uploadLogo(file)
      setSaveMessage('Success: Logo updated.')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Error: Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      const { theme, ...globalData } = localSettings
      
      if (isAdmin) {
        // Persist association settings
        await updateSettings({
          ...globalData,
          defaultduration: Number(localSettings.defaultduration) || 30
        })
      }

      // Persist personal theme preference
      localStorage.setItem('ldms-theme', theme)
      await updateProfile({ 
        appearance: { ...userProfile?.appearance, theme } 
      })

      setSaveMessage('Success: Configuration saved.')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Error: Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
    } catch {
      setSaveMessage('Error: Deletion failed.')
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

  const TABS = [
    ...(isAdmin ? [
      { id: 'club', label: 'Identity', icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      )},
      { id: 'performance', label: 'Performance', icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      )},
      { id: 'financial', label: 'Financial', icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )},
    ] : []),
    { id: 'security', label: 'Appearance & Security', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    )}
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-surface-50 tracking-tight uppercase">Settings</h1>
          <p className="text-surface-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configure your association identity and operational rules</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-fit px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${
            isSaving 
              ? 'bg-surface-800 text-surface-500 cursor-not-allowed' 
              : 'bg-crimson-600 text-white hover:bg-crimson-500 shadow-crimson-600/20 active:scale-95'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </header>

      {saveMessage && (
        <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-4 duration-300 ${
          saveMessage.includes('Success') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-crimson-500/10 border-crimson-500/30 text-crimson-400'
        }`}>
          <p className="text-xs font-black uppercase tracking-widest text-center">{saveMessage}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-1 p-1 bg-surface-900 border border-surface-800 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] transition-all whitespace-nowrap border ${
              activeTab === tab.id ? 'bg-surface-800 text-surface-50 shadow-sm border-surface-700/50' : 'border-transparent text-surface-500 hover:text-surface-200'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-crimson-500' : ''}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <main className="mt-8">
        {activeTab === 'club' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Visual Branding */}
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Visual Branding</h3>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group">
                   <div className="w-32 h-32 bg-surface-950 border-2 border-surface-800 rounded-3xl overflow-hidden flex items-center justify-center shadow-inner group-hover:border-crimson-500/50 transition-all">
                     {settings.clublogo ? (
                       <img src={settings.clublogo} alt="Logo" className="w-full h-full object-contain p-2" />
                     ) : (
                       <div className="text-[10px] font-black text-surface-700 uppercase tracking-widest text-center px-4">No Identity Asset</div>
                     )}
                     {isUploading && (
                       <div className="absolute inset-0 bg-surface-950/80 flex items-center justify-center backdrop-blur-sm">
                         <div className="w-6 h-6 border-2 border-surface-700 border-t-crimson-500 rounded-full animate-spin" />
                       </div>
                     )}
                   </div>
                </div>
                <div className="flex-1 space-y-4">
                   <div>
                     <h4 className="text-sm font-black text-surface-100 uppercase tracking-tight">Organization Seal</h4>
                     <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest leading-relaxed mt-1">
                       Upload a high-resolution PNG or SVG. This will be used for splash screens, watermarks, and PDF headers.
                     </p>
                   </div>
                   <label className="inline-flex items-center gap-2 px-6 py-3 bg-surface-800 hover:bg-surface-700 text-surface-50 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all active:scale-95 shadow-lg">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                     </svg>
                     Replace Asset
                     <input type="file" id="settings-logo-upload" name="settings_logo_upload" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                   </label>
                </div>
              </div>
            </section>

            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Association Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Registration Name (EN)</label>
                  <input type="text" id="settings-club-name-en" name="settings_club_name_en" value={localSettings.clubnameen} onChange={(e) => setLocalSettings({ ...localSettings, clubnameen: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Registration Name (CN)</label>
                  <input type="text" id="settings-club-name-cn" name="settings_club_name_cn" value={localSettings.clubnamecn} onChange={(e) => setLocalSettings({ ...localSettings, clubnamecn: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Official Address</label>
                  <textarea rows={2} id="settings-club-address" name="settings_club_address" value={localSettings.clubaddress} onChange={(e) => setLocalSettings({ ...localSettings, clubaddress: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 py-4 text-surface-200 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner resize-none text-sm leading-relaxed" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Reg Number</label>
                  <input type="text" id="settings-reg-number" name="settings_reg_number" value={localSettings.clubregistrationno} onChange={(e) => setLocalSettings({ ...localSettings, clubregistrationno: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Contact Hotline</label>
                  <input type="text" id="settings-contact-hotline" name="settings_contact_hotline" value={localSettings.clubphone} onChange={(e) => setLocalSettings({ ...localSettings, clubphone: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Operational Logistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">HQ / Dispatch Address</label>
                  <textarea rows={2} id="settings-hq-address" name="settings_hq_address" value={localSettings.baselocation} onChange={(e) => setLocalSettings({ ...localSettings, baselocation: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 py-4 text-surface-200 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner resize-none text-sm leading-relaxed" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Standard Duration (Mins)</label>
                  <input type="number" id="settings-standard-duration" name="settings_standard_duration" value={localSettings.defaultduration} onChange={(e) => setLocalSettings({ ...localSettings, defaultduration: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
              </div>
            </section>

            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Lion Performance Assets</h3>
              <div className="space-y-8">
                {/* Colors */}
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Standard Lion Colors</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {localSettings.lioncolors.map((color) => (
                      <div key={color} className="flex items-center gap-2 pl-4 pr-2 h-10 bg-surface-950 border border-surface-800 rounded-xl">
                        <span className="text-xs font-bold text-surface-200">{color}</span>
                        <button onClick={() => setLocalSettings(prev => ({ ...prev, lioncolors: prev.lioncolors.filter(c => c !== color) }))} className="text-surface-600 hover:text-crimson-500 p-1 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="settings-new-lion-color" name="settings_new_lion_color" placeholder="e.g. 黑|Black" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                      className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 h-12 text-sm text-surface-100 focus:outline-none focus:border-crimson-500/50 transition-all" />
                    <button onClick={() => { 
                      if (newColor.trim() && newColor.includes('|')) { 
                        setLocalSettings(p => ({ ...p, lioncolors: [...p.lioncolors, newColor.trim()] })); 
                        setNewColor(''); 
                      } else {
                        setSaveMessage('Error: Format must be Chinese|English (e.g. 黑|Black)');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }
                    }}
                      className="px-6 h-12 bg-surface-800 text-surface-100 text-[10px] font-black uppercase rounded-xl hover:bg-surface-700 transition-all">Add</button>
                  </div>
                </div>

                {/* Cai Qing */}
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Cai Qing (采青) Types</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {localSettings.cai_qing_types.map((type) => (
                      <div key={type} className="flex items-center gap-2 pl-4 pr-2 h-10 bg-surface-950 border border-surface-800 rounded-xl">
                        <span className="text-xs font-bold text-surface-200">{type}</span>
                        <button onClick={() => setLocalSettings(prev => ({ ...prev, cai_qing_types: prev.cai_qing_types.filter(c => c !== type) }))} className="text-surface-600 hover:text-crimson-500 p-1 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="settings-new-caiqing" name="settings_new_caiqing" placeholder="e.g. 步步高升|Soaring High" value={newCaiQing} onChange={(e) => setNewCaiQing(e.target.value)}
                      className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 h-12 text-sm text-surface-100 focus:outline-none focus:border-crimson-500/50 transition-all" />
                    <button onClick={() => { 
                      if (newCaiQing.trim() && newCaiQing.includes('|')) { 
                        setLocalSettings(p => ({ ...p, cai_qing_types: [...p.cai_qing_types, newCaiQing.trim()] })); 
                        setNewCaiQing(''); 
                      } else {
                        setSaveMessage('Error: Format must be Chinese|English (e.g. 步步高升|Soaring High)');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }
                    }}
                      className="px-6 h-12 bg-surface-800 text-surface-100 text-[10px] font-black uppercase rounded-xl hover:bg-surface-700 transition-all">Add</button>
                  </div>
                </div>

                {/* Extra Characters */}
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Extra Characters / Mascots</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {localSettings.extra_characters.map((char) => (
                      <div key={char} className="flex items-center gap-2 pl-4 pr-2 h-10 bg-surface-950 border border-surface-800 rounded-xl">
                        <span className="text-xs font-bold text-surface-200">{char}</span>
                        <button onClick={() => setLocalSettings(prev => ({ ...prev, extra_characters: prev.extra_characters.filter(c => c !== char) }))} className="text-surface-600 hover:text-crimson-500 p-1 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="settings-new-extra-char" name="settings_new_extra_char" placeholder="e.g. 财神爷|God of Wealth" value={newChar} onChange={(e) => setNewChar(e.target.value)}
                      className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 h-12 text-sm text-surface-100 focus:outline-none focus:border-crimson-500/50 transition-all" />
                    <button onClick={() => { 
                      if (newChar.trim() && newChar.includes('|')) { 
                        setLocalSettings(p => ({ ...p, extra_characters: [...p.extra_characters, newChar.trim()] })); 
                        setNewChar(''); 
                      } else {
                        setSaveMessage('Error: Format must be Chinese|English (e.g. 财神爷|God of Wealth)');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }
                    }}
                      className="px-6 h-12 bg-surface-800 text-surface-100 text-[10px] font-black uppercase rounded-xl hover:bg-surface-700 transition-all">Add</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Financial Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Receipt Prepared By</label>
                  <input type="text" id="settings-receipt-prepared-by" name="settings_receipt_prepared_by" value={localSettings.receiptpreparedby} onChange={(e) => setLocalSettings({ ...localSettings, receiptpreparedby: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Signatory Phone</label>
                  <input type="text" id="settings-signatory-phone" name="settings_signatory_phone" value={localSettings.signatoryphone} onChange={(e) => setLocalSettings({ ...localSettings, signatoryphone: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
              </div>
            </section>

            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Settlement Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Beneficiary Name</label>
                  <input type="text" id="settings-beneficiary-name" name="settings_beneficiary_name" value={localSettings.bankname} onChange={(e) => setLocalSettings({ ...localSettings, bankname: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Bank Institution</label>
                  <input type="text" id="settings-bank-institution" name="settings_bank_institution" value={localSettings.banktype} onChange={(e) => setLocalSettings({ ...localSettings, banktype: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 ml-1">Account Number</label>
                  <input type="text" id="settings-account-number" name="settings_account_number" value={localSettings.banknumber} onChange={(e) => setLocalSettings({ ...localSettings, banknumber: e.target.value })}
                    className="w-full bg-surface-950 border border-surface-800 rounded-2xl px-5 h-14 text-surface-100 font-bold focus:outline-none focus:border-crimson-500/50 transition-all shadow-inner" />
                </div>
              </div>
            </section>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 pl-1">Appearance Profile</h3>
              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3 ml-1">Interface Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'system'].map((theme) => (
                    <button key={theme} onClick={() => handleLocalThemeChange(theme)}
                      className={`h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                        localSettings.theme === theme ? 'bg-crimson-500/10 border-crimson-500/50 text-crimson-400 shadow-glow' : 'bg-surface-950 border-surface-800 text-surface-500 hover:border-surface-700'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-sm border-crimson-900/20">
              <h3 className="text-xs font-black text-crimson-500 uppercase tracking-[0.2em] mb-6 pl-1">Danger Zone</h3>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 rounded-2xl border border-crimson-900/50 text-crimson-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-crimson-500/10 transition-all"
              >
                Terminate Account Permanently
              </button>
            </section>
          </div>
        )}
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-surface-900 border border-surface-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-surface-50 uppercase tracking-tight mb-2 text-center">Final Confirmation</h3>
              <p className="text-surface-400 text-sm mb-8 text-center leading-relaxed">This action permanently deletes your identity record and all associated records. This cannot be undone.</p>
              <div className="flex gap-3">
                 <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 rounded-xl bg-surface-800 text-surface-200 font-black text-[10px] uppercase">Cancel</button>
                 <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex-1 py-4 rounded-xl bg-crimson-600 text-white font-black text-[10px] uppercase shadow-lg shadow-crimson-600/20">
                   {isDeleting ? 'Deleting...' : 'Delete Now'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
