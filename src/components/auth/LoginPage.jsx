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
  const navigate = useNavigate()

  // On mount, check if there's a persisted login error (survives LoginGuard unmount/remount)
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        const messages = {
          'Invalid login credentials': 'Invalid email or password.',
          'Email not confirmed': 'Please confirm your email before logging in.',
          'Too many requests': 'Too many attempts. Please try again later.',
        }
        setError(messages[authError.message] || authError.message || 'Sign-in failed. Please try again.')
      }
      // AuthContext's onAuthStateChange will verify the role.
      // If non-admin, it will signOut and store error in sessionStorage.
      // If admin, LoginGuard will navigate to /dashboard.
    } catch (err) {
      setError('Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        {/* ── Branding ── */}
        <div className="text-center mb-8">
          <img 
            src={settings?.clublogo || "/chuan_cheng_logo.png"} 
            alt="Logo" 
            className="w-20 h-20 mx-auto rounded-2xl shadow-2xl mb-4 border border-surface-800 object-cover" 
          />
          <h1 className="text-3xl font-extrabold text-crimson-500 tracking-tight">
            {settings?.clubnamecn || "传承龙狮体育会"}
          </h1>
          <p className="text-surface-200 text-sm mt-1 uppercase tracking-widest font-bold">
            {settings?.clubnameen ? "Management System" : "管理系统"}
          </p>
        </div>

        {/* ── Card ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-900/80 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-8 shadow-card space-y-5"
        >
          {/* Error banner */}
          {error && (
            <div className="border text-sm rounded-lg px-4 py-3 flex items-start gap-2 bg-crimson-900/40 border-crimson-700/50 text-crimson-300">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-surface-200 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 placeholder-surface-700 focus:outline-none focus:ring-2 focus:ring-crimson-500/60 focus:border-transparent transition"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-surface-200 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 placeholder-surface-700 focus:outline-none focus:ring-2 focus:ring-crimson-500/60 focus:border-transparent transition"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-crimson-600 to-crimson-500 text-white font-semibold hover:from-crimson-500 hover:to-crimson-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-card hover:shadow-card-hover cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Wait…' : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-xs text-surface-700 pt-2">
             Powered by Supabase
          </p>
        </form>
      </div>
    </div>
  )
}
