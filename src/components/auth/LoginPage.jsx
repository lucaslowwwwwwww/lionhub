import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useSettings } from '../../hooks/useSettings'

export default function LoginPage() {
  const { settings } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [activePolicyModal, setActivePolicyModal] = useState(null)
  const navigate = useNavigate()

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      })

      if (resetError) throw resetError
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send password reset email.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const savedError = sessionStorage.getItem('login_error')
    if (savedError) {
      setError(savedError)
      sessionStorage.removeItem('login_error')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { displayname: 'Master Admin' }
          }
        })
        if (authError) throw authError
        alert('Registration successful! Please log in.')
        setIsRegistering(false)
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (authError) {
          const messages = {
            'Invalid login credentials': 'Invalid email or password.',
            'Email not confirmed': 'Please confirm your email.',
            'Too many requests': 'Too many attempts. Try later.',
          }
          setError(messages[authError.message] || authError.message || 'Sign-in failed.')
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 md:p-12 selection:bg-crimson-500/30 overflow-x-hidden relative">
      
      {/* ── ALERTS / BANNERS ── */}
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="w-full bg-crimson-600/90 backdrop-blur-md text-white py-2 px-4 flex items-center justify-center gap-3 animate-slide-down pointer-events-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Offline Mode — Limited Functionality</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl min-h-screen md:min-h-[750px] bg-surface-900/40 backdrop-blur-none md:backdrop-blur-3xl rounded-none md:rounded-[40px] border-none md:border md:border-surface-800 shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col relative">
        
        {/* MOBILE BRANDING MOVED INSIDE FORMS */}

        {/* ── VISUAL SLIDING PANEL (DESKTOP) ── */}
        <div className={`hidden md:flex absolute top-0 bottom-0 w-1/2 bg-surface-950 z-30 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform items-center justify-center border-x border-surface-800 ${
          isRegistering ? 'translate-x-full' : 'translate-x-0'
        }`}>
          <div className="relative text-center p-12">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-crimson-600/5 rounded-full blur-[80px]" />
             <div className="relative w-52 h-52 rounded-full bg-surface-900 border-2 border-surface-800 flex items-center justify-center mx-auto mb-10 shadow-inner overflow-hidden">
                <img src="/lionhub_logo.jpeg" alt="Lionhub" className="w-full h-full object-cover" />
             </div>
             <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight mb-1">
                LIONHUB
             </h2>
             <p className="text-xs font-bold text-crimson-500 uppercase tracking-widest mb-6">
                Lion Dance Management System
             </p>
             <p className="text-[10px] font-black text-surface-500 tracking-[0.4em] uppercase opacity-60">
                Professional Platform v2.0
             </p>
          </div>
        </div>

        {/* ── FORMS CONTAINER ── */}
        <div className="flex-1 relative min-h-[550px] md:min-h-0 bg-surface-900/20 md:bg-transparent flex flex-col">
          
          {/* Static Mobile Branding */}
          <div className="md:hidden pt-12 pb-2 text-center flex flex-col items-center z-20">
             <div className="w-40 h-40 rounded-full bg-surface-950 border-2 border-surface-800 flex items-center justify-center mb-4 shadow-glow overflow-hidden">
                <img src="/lionhub_logo.jpeg" alt="Lionhub" className="w-full h-full object-cover" />
             </div>
             <h2 className="text-3xl font-black text-white tracking-tight uppercase">LIONHUB</h2>
             <p className="text-xs font-bold text-crimson-500 uppercase tracking-widest mt-2">
                Lion Dance Management System
             </p>
          </div>
          
          {/* Forms Wrapper (Remaining Space) */}
          <div className="flex-1 relative min-h-[420px] md:min-h-0">
            {/* REGISTER FORM */}
            <div className={`absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col justify-center p-8 pb-12 md:p-16 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${
              isRegistering 
                ? 'opacity-100 translate-x-0 z-10' 
                : 'opacity-0 -translate-x-0 md:-translate-x-8 pointer-events-none z-0'
            }`}>
            <div className="w-full max-w-sm mx-auto">
              <header className="mb-8 md:mb-10 text-center md:text-left pt-2 md:pt-0">
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Initialize Account</h1>
                <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Setup Your Password & Access</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && isRegistering && (
                  <div className="p-4 bg-crimson-900/10 border border-crimson-500/20 rounded-2xl text-crimson-400 text-[11px] font-bold flex gap-3 items-center">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all">
                  {loading ? 'Processing...' : 'Register Account'}
                </button>

                <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[10px] font-black text-surface-600 hover:text-surface-300 uppercase tracking-widest pt-2">
                  Back to Secure Login
                </button>

                <p className="text-[10px] text-surface-500 font-bold leading-normal text-center mt-6">
                  By registering, you agree to our{' '}
                  <button type="button" onClick={() => setActivePolicyModal('terms')} className="text-crimson-500 hover:underline">Terms of Service</button>,{' '}
                  <button type="button" onClick={() => setActivePolicyModal('privacy')} className="text-crimson-500 hover:underline">Privacy Policy</button>, and{' '}
                  <button type="button" onClick={() => setActivePolicyModal('refund')} className="text-crimson-500 hover:underline">Cancellation & Refund Policy</button>.
                </p>
              </form>
            </div>
          </div>

            {/* LOGIN & RECOVERY FORMS */}
            {isForgotPassword ? (
              <div className="absolute inset-y-0 right-0 w-full md:w-1/2 flex flex-col justify-center p-8 pb-12 md:p-16 animate-fade-in z-10">
                <div className="w-full max-w-sm mx-auto">
                  <header className="mb-8 md:mb-10 text-center md:text-left pt-2 md:pt-0">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Recover Access</h1>
                    <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Request Password Reset Link</p>
                  </header>

                  {resetSent ? (
                    <div className="space-y-6 text-center md:text-left">
                      <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4 animate-in zoom-in">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Reset Link Sent</h3>
                      <p className="text-sm text-surface-400 leading-relaxed">
                        We have sent a secure password reset link to <span className="text-crimson-400 font-bold">{email}</span>. Please check your inbox.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsForgotPassword(false)
                          setResetSent(false)
                          setEmail('')
                        }}
                        className="w-full py-5 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all mt-4"
                      >
                        Back to Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                      {error && (
                        <div className="p-4 bg-crimson-900/10 border border-crimson-500/20 rounded-2xl text-crimson-400 text-[11px] font-bold flex gap-3 items-center">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          {error}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Email Address</label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                            placeholder="name@example.com"
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={loading} className="w-full py-5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all">
                        {loading ? 'Sending...' : 'Send Reset Link'}
                      </button>

                      <button type="button" onClick={() => { setIsForgotPassword(false); setEmail(''); setError(''); }} className="w-full text-[10px] font-black text-surface-600 hover:text-surface-300 uppercase tracking-widest pt-2">
                        Back to Secure Login
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className={`absolute inset-y-0 right-0 w-full md:w-1/2 flex flex-col justify-center p-8 pb-12 md:p-16 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${
                !isRegistering 
                  ? 'opacity-100 translate-x-0 z-10' 
                  : 'opacity-0 translate-x-0 md:translate-x-8 pointer-events-none z-0'
              }`}>
                <div className="w-full max-w-sm mx-auto">
                  <header className="mb-8 md:mb-10 text-center md:text-left pt-2 md:pt-0">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Console Access</h1>
                    <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Authorized Personnel Only</p>
                  </header>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && !isRegistering && (
                      <div className="p-4 bg-crimson-900/10 border border-crimson-500/20 rounded-2xl text-crimson-400 text-[11px] font-bold flex gap-3 items-center">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Login Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                          placeholder="operator@system.v2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Password</label>
                          <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }} className="text-[9px] font-black text-crimson-500 hover:text-crimson-400 uppercase tracking-widest">
                            Forgot?
                          </button>
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                          placeholder="••••••••••••"
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all">
                      {loading ? 'Validating...' : 'Initiate Session'}
                    </button>

                    <button type="button" onClick={() => setIsRegistering(true)} className="w-full text-[10px] font-black text-surface-600 hover:text-surface-300 uppercase tracking-widest pt-2">
                      First Time? Register & Setup Password
                    </button>

                    <p className="text-[10px] text-surface-500 font-bold leading-normal text-center mt-6">
                      By signing in, you agree to our{' '}
                      <button type="button" onClick={() => setActivePolicyModal('terms')} className="text-crimson-500 hover:underline">Terms of Service</button>,{' '}
                      <button type="button" onClick={() => setActivePolicyModal('privacy')} className="text-crimson-500 hover:underline">Privacy Policy</button>, and{' '}
                      <button type="button" onClick={() => setActivePolicyModal('refund')} className="text-crimson-500 hover:underline">Cancellation & Refund Policy</button>.
                    </p>
                  </form>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ── POLICY MODAL ── */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-[200] bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
          <div className="bg-surface-900 border border-surface-800 rounded-[32px] shadow-2xl max-w-2xl w-full p-8 md:p-10 max-h-[80vh] overflow-y-auto flex flex-col relative">
            <button
              onClick={() => setActivePolicyModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-surface-950 border border-surface-800 hover:border-surface-700 text-surface-400 hover:text-white transition-all outline-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {activePolicyModal === 'terms' && (
              <div className="space-y-6 text-left">
                <header>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Terms of Service</h2>
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Lionhub System Agreement — Last Updated: 5 May 2026</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. Acceptance of Terms</h3>
                  <p>By accessing or using the Lionhub platform ("the Platform"), you agree to be bound by these Terms of Service. If you are registering on behalf of a Lion or Dragon Dance association, troupe, or club, you represent and warrant that you have the legal authority to bind said entity to this agreement. <strong>If you disagree with any part of these terms, you must immediately cease all access to the Platform and discontinue the use of our management services.</strong></p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. Roles and Data Responsibility</h3>
                  <p><strong>Data Controller</strong>: Your association remains the Data Controller at all times. By inputting member contact details and customer information into Lionhub, you warrant that you have obtained explicit consent from those individuals to manage their data in a cloud-based management system.</p>
                  <p><strong>Data Processor</strong>: Lionhub acts solely as the Data Processor, providing the secure software infrastructure and tools required to store, organize, and manage your operational data.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. Acceptable Use</h3>
                  <p>Lionhub is designed exclusively for the professional management of cultural arts troupe operations, deployments, and finances. Users agree not to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Attempt to breach or circumvent the Platform's security architectures.</li>
                    <li>Reverse-engineer, decompile, or disassemble any portion of the software.</li>
                    <li>Use the system for any illegal activities or unauthorized data harvesting.</li>
                  </ul>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">4. Subscriptions and Payments</h3>
                  <p>Access to the Platform requires an active annual or half-yearly subscription.</p>
                  <p>Payments are settled via direct bank transfer or authorized payment gateways.</p>
                  <p><strong>Suspension</strong>: Failure to renew a subscription will result in automatic account suspension. Access to database records will be restricted until all outstanding payments are settled.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">5. Limitation of Liability</h3>
                  <p>The Lionhub platform is provided on an "as is" and "as available" basis. While we utilize enterprise-grade infrastructure to ensure high availability, Lionhub and its operator, Low Phak Hey, shall not be held liable for any indirect damages, lost performance revenue, or business interruptions resulting from:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Third-party internet provider failures.</li>
                    <li>Unscheduled system downtime.</li>
                    <li>Accidental data deletion by your authorized committee members.</li>
                  </ul>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">6. Governing Law</h3>
                  <p>These terms shall be governed by and construed in accordance with the laws of Malaysia.</p>
                </div>
              </div>
            )}

            {activePolicyModal === 'privacy' && (
              <div className="space-y-6 text-left">
                <header>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Privacy Policy</h2>
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Data Safety & Compliance — Last Updated: 5 May 2026</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. Introduction</h3>
                  <p>Lionhub is committed to protecting your troupe's operational and personal data in strict compliance with the <strong>Personal Data Protection Act 2010 (PDPA)</strong> of Malaysia.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. Data Collection Scope</h3>
                  <p>We securely store the following operational information provided by your committee:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Account Credentials</strong>: Committee names, emails, and phone numbers.</li>
                    <li><strong>Troupe Personnel</strong>: Member names and contact details for deployment tracking.</li>
                    <li><strong>Client Records</strong>: Customer names, performance addresses, and contact numbers.</li>
                    <li><strong>Financial Records</strong>: Invoices, quotes, and troupe financial entries.</li>
                  </ul>
                  <p><em>Note: Lionhub explicitly does not collect or store highly sensitive personal documents, such as NRIC copies or bank passwords.</em></p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. Utilization of Information</h3>
                  <p>Your data is used strictly to operate the Lionhub platform, including:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Facilitating performance scheduling and itinerary management.</li>
                    <li>Tracking member deployments and availability.</li>
                    <li>Generating financial reports and invoices.</li>
                    <li>Sending critical system alerts and subscription updates.</li>
                  </ul>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">4. Data Isolation and Security</h3>
                  <p>Your data is hosted using enterprise-grade PostgreSQL cloud infrastructure. We implement strict <strong>Row Level Security (RLS)</strong> protocols. This ensures that your association’s records are completely isolated; it is technically impossible for another troupe or unauthorized third party to view or access your data.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">5. Non-Disclosure Guarantee</h3>
                  <p>Lionhub will never sell, rent, or share your association's operational data, client lists, or financial records with any third parties, marketing agencies, or competing associations.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">6. Rights of Access (PDPA)</h3>
                  <p>Under the PDPA, your association has the right to request access to, correct, or export the data stored on our platform at any time.</p>
                </div>
              </div>
            )}

            {activePolicyModal === 'refund' && (
              <div className="space-y-6 text-left">
                <header>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Cancellation & Refund</h2>
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Billing & Subscription Terms — Last Updated: 5 May 2026</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. Subscription Cancellations</h3>
                  <p>Users may cancel their Lionhub subscription at any time by notifying support or opting not to renew a pending annual/half-yearly invoice. Access will remain active until the end of the current paid billing cycle.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. No Prorated Refunds</h3>
                  <p>Because Lionhub reserves dedicated server infrastructure and database resources for your association immediately upon payment, we do not offer prorated refunds for mid-cycle cancellations.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. The 12-Month Seasonal Archive (Grace Period)</h3>
                  <p>We recognize the seasonal nature of the Lion Dance industry. If a subscription lapses:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Secure Archive</strong>: Your account and all operational history will be placed into a "Frozen Archive" for exactly 12 months.</li>
                    <li><strong>Reactivation</strong>: Renewing within this 12-month window will instantly restore all your data exactly as it was.</li>
                  </ul>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">4. Permanent Data Purge</h3>
                  <p>If an account remains inactive and unpaid for more than 12 consecutive months, all data associated with the troupe will be permanently and irreversibly deleted from our servers to ensure continuous data privacy.</p>
                  
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">5. Data Export Prior to Expiration</h3>
                  <p>We strongly encourage all treasurers and troupe masters to utilize the built-in <strong>Export Tools</strong> to download member lists and financial records prior to allowing a subscription to expire.</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setActivePolicyModal(null)}
              className="mt-8 py-4 bg-crimson-600 hover:bg-crimson-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-crimson-600/20 transition-all outline-none"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
