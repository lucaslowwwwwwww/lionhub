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

      <div className="w-full max-w-6xl min-h-[650px] md:h-[750px] bg-surface-900/40 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] border border-surface-800 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* ── MOBILE BRANDING ── */}
        <div className="md:hidden pt-12 pb-6 text-center flex flex-col items-center">
           <div className="w-20 h-20 rounded-full bg-surface-950 border-2 border-surface-800 flex items-center justify-center mb-4 shadow-glow overflow-hidden">
              <span className="text-crimson-500 font-black text-xl tracking-tighter">LDMS</span>
           </div>
           <h2 className="text-lg font-black text-white tracking-tight uppercase px-8">
              Lion Dance <span className="text-crimson-500">Management</span> System
           </h2>
        </div>

        {/* ── VISUAL SLIDING PANEL (DESKTOP) ── */}
        <div className={`hidden md:flex absolute top-0 bottom-0 w-1/2 bg-surface-950 z-30 transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) items-center justify-center border-x border-surface-800 ${
          isRegistering ? 'translate-x-full' : 'translate-x-0'
        }`}>
          <div className="relative text-center p-12">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-crimson-600/5 rounded-full blur-[80px]" />
             <div className="relative w-44 h-44 rounded-full bg-surface-900 border-2 border-surface-800 flex items-center justify-center mx-auto mb-10 shadow-inner overflow-hidden">
                <span className="text-crimson-500 font-black text-5xl tracking-tighter drop-shadow-glow">LDMS</span>
             </div>
             <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight mb-3">
                Lion Dance <span className="text-crimson-500">Management</span> System
             </h2>
             <p className="text-[10px] font-black text-surface-500 tracking-[0.4em] uppercase opacity-60">
                Professional Platform v2.0
             </p>
          </div>
        </div>

        {/* ── FORMS CONTAINER ── */}
        <div className="flex-1 relative min-h-[450px] md:min-h-0">
          
          {/* REGISTER FORM */}
          <div className={`absolute inset-y-0 left-0 w-full md:w-1/2 flex flex-col justify-center p-8 pb-12 md:p-16 transition-all duration-700 ${
            !isRegistering 
              ? 'opacity-0 -translate-x-12 pointer-events-none' 
              : 'opacity-100 translate-x-0'
          }`}>
            <div className="w-full max-w-sm mx-auto">
              <header className="mb-8 md:mb-10 text-center md:text-left pt-4 md:pt-0">
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
              </form>
            </div>
          </div>

          {/* LOGIN FORM */}
          <div className={`absolute inset-y-0 right-0 w-full md:w-1/2 flex flex-col justify-center p-8 pb-12 md:p-16 transition-all duration-700 ${
            isRegistering 
              ? 'opacity-0 translate-x-12 pointer-events-none' 
              : 'opacity-100 translate-x-0'
          }`}>
            <div className="w-full max-w-sm mx-auto">
              <header className="mb-8 md:mb-10 text-center md:text-left pt-4 md:pt-0">
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
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

