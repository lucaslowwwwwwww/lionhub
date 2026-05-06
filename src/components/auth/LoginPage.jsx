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
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [activePolicyModal, setActivePolicyModal] = useState(null)
  const navigate = useNavigate()

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
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Initialize</h1>
                <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Master Admin Enrollment</p>
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
                    <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Owner Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white focus:border-crimson-500/50 transition-all outline-none text-sm font-medium"
                      placeholder="owner@association.com"
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
                  {loading ? 'Processing...' : 'Register Console'}
                </button>

                <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[10px] font-black text-surface-600 hover:text-surface-300 uppercase tracking-widest pt-2">
                  Back to Secure Login
                </button>

                <p className="text-[10px] text-surface-500 font-bold leading-normal text-center mt-6">
                  By registering, you agree to our{' '}
                  <button type="button" onClick={() => setActivePolicyModal('terms')} className="text-crimson-500 hover:underline">Terms of Service</button>,{' '}
                  <button type="button" onClick={() => setActivePolicyModal('privacy')} className="text-crimson-500 hover:underline">Privacy Policy</button>, and{' '}
                  <button type="button" onClick={() => setActivePolicyModal('refund')} className="text-crimson-500 hover:underline">Refund Policy</button>.
                </p>
              </form>
            </div>
          </div>

            {/* LOGIN FORM */}
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
                  {loading ? 'Validating...' : 'Initiate Session'}
                </button>

                <button type="button" onClick={() => setIsRegistering(true)} className="w-full text-[10px] font-black text-surface-600 hover:text-surface-300 uppercase tracking-widest pt-2">
                  New Association? Initialize Portal
                </button>

                <p className="text-[10px] text-surface-500 font-bold leading-normal text-center mt-6">
                  By signing in, you agree to our{' '}
                  <button type="button" onClick={() => setActivePolicyModal('terms')} className="text-crimson-500 hover:underline">Terms of Service</button>,{' '}
                  <button type="button" onClick={() => setActivePolicyModal('privacy')} className="text-crimson-500 hover:underline">Privacy Policy</button>, and{' '}
                  <button type="button" onClick={() => setActivePolicyModal('refund')} className="text-crimson-500 hover:underline">Refund Policy</button>.
                </p>
              </form>
            </div>
          </div>
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
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Lionhub System Agreement</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <p>Welcome to **Lionhub**, a professional performance and association management platform designed to streamline operations for troupes and associations globally.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. User Eligibility & Accounts</h3>
                  <p>Access is restricted strictly to authorized administrators, master coordinators, and assigned personnel of subscribing associations. You are fully responsible for maintaining the confidentiality of your login credentials.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. Acceptable Use</h3>
                  <p>You agree to use this system exclusively for legitimate operational planning, troupe scheduling, member rosters, and accounting records. Unauthorized reverse-engineering, system scanning, or data scraping is strictly prohibited.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. Platform Modifications</h3>
                  <p>The platform owner (Super Admin) reserves the right to deploy updates, perform background maintenance, and modify interface features to ensure optimal security, performance, and stability.</p>
                </div>
              </div>
            )}

            {activePolicyModal === 'privacy' && (
              <div className="space-y-6 text-left">
                <header>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Privacy Policy</h2>
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Data Safety & Compliance</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <p>At **Lionhub**, we take the privacy of your association, members, and transactions extremely seriously.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. Data Collected</h3>
                  <p>We store basic coordinator names, emails, active-status indicators (presence logs), member roster details, troupe allocations, equipment inventories, and financial ledger transactions.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. Strict Multi-Tenant Isolation</h3>
                  <p>All stored records are fully isolated using database-level Row-Level Security (RLS) policies. Your data can only be accessed by authenticated accounts inside your specific association. We never sell, share, or monetize any customer data.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. Administrative Access</h3>
                  <p>SaaS platform administrators may access system records strictly for necessary technical diagnostics, support ticket debugging, and server infrastructure maintenance.</p>
                </div>
              </div>
            )}

            {activePolicyModal === 'refund' && (
              <div className="space-y-6 text-left">
                <header>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Refund & Cancellation</h2>
                  <p className="text-[9px] font-black text-crimson-500 uppercase tracking-widest">Billing & Subscription Terms</p>
                </header>
                <div className="space-y-4 text-surface-300 text-xs leading-relaxed font-medium">
                  <p>Our commitment is to provide a reliable, premium service to power your association's daily operations.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">1. Subscription Cycles</h3>
                  <p>Subscriptions are billed on a recurring monthly or annual basis. The subscription fee is fully disclosed before onboarding.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">2. Cancellation Policy</h3>
                  <p>You can cancel your subscription at any time. Upon cancellation, your association retains full console access until the end of the current billing cycle, and no further automatic charges will occur.</p>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider pt-2">3. Refund Terms</h3>
                  <p>Due to the active server resource and database provisioning required to host your multi-tenant portal, refunds are generally evaluated on a case-by-case basis under special circumstances (such as extended server downtime).</p>
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
