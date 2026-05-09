import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrgProvider } from './contexts/OrgContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoginPage, ProtectedRoute, SessionGuard } from './components/auth'
import { AppShell, SplashScreen } from './components/layout'
import { useAuth } from './hooks/useAuth'
import { useSettings } from './hooks/useSettings'
import { useMembers } from './hooks/useMembers'
import { useState, useEffect, useContext, useRef, lazy, Suspense } from 'react'
import { OrgContext } from './contexts/OrgContext'
import './index.css'

import DashboardPage from './components/dashboard/DashboardPage'

// Lazy Load Pages for Code Splitting
const ItineraryPage = lazy(() => import('./components/itinerary').then(m => ({ default: m.ItineraryPage })))
const TeamPage = lazy(() => import('./components/team/TeamPage'))
const GeneralSettings = lazy(() => import('./components/settings/GeneralSettings'))
const CustomersPage = lazy(() => import('./components/customers/CustomersPage'))
const FinancePage = lazy(() => import('./components/finance/FinancePage'))
const InventoryPage = lazy(() => import('./components/inventory').then(m => ({ default: m.InventoryPage })))
const BillingPage = lazy(() => import('./components/billing/BillingPage'))
const SuperAdminDashboard = lazy(() => import('./components/superadmin/SuperAdminDashboard'))
const AboutPage = lazy(() => import('./components/about').then(m => ({ default: m.AboutPage })))
const SalaryCalculator = lazy(() => import('./components/salary/SalaryCalculator'))

/**
 * LoginGuard — redirects already-authenticated users away from /login.
 */
function LoginGuard() {
  const { user, loading } = useAuth()

  if (loading) return null

  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

/**
 * ThemeManager — watches settings and updates root HTML class.
 */
function ThemeManager({ children }) {
  const { userProfile } = useAuth()
  const { settings } = useSettings()
  const [theme, setTheme] = useState(localStorage.getItem('ldms-theme') || 'dark')
  const [hasManualOverride, setHasManualOverride] = useState(false)

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e?.detail) {
        setTheme(e.detail)
        setHasManualOverride(true)
      } else {
        // This is a persistence call
        const userTheme = userProfile?.appearance?.theme
        const globalTheme = settings?.theme
        const savedTheme = localStorage.getItem('ldms-theme') || userTheme || globalTheme || 'dark'
        setTheme(savedTheme)
        setHasManualOverride(false)
      }
    }

    // Determine preference priority:
    // 1. Manual override (this session)
    // 2. User Profile (cloud preference)
    // 3. Global Settings (fallback)
    // 4. LocalStorage (last used on this machine)
    const userTheme = userProfile?.appearance?.theme
    const globalTheme = settings?.theme
    const targetTheme = userTheme || globalTheme || localStorage.getItem('ldms-theme') || 'dark'

    if (targetTheme && !hasManualOverride) {
      setTheme(targetTheme)
    }

    window.addEventListener('theme-changed', handleThemeChange)
    const root = document.documentElement
    
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else if (theme === 'system') {
      const isLight = window.matchMedia('(prefers-color-scheme: light)').matches
      root.classList.toggle('light', isLight)
      root.classList.toggle('dark', !isLight)
    }
    
    return () => window.removeEventListener('theme-changed', handleThemeChange)
  }, [theme, userProfile?.appearance?.theme, settings?.theme, hasManualOverride])

  return children
}

function ConnectionOverlay() {
  const { connectionError, refreshProfile, loading } = useAuth()

  if (!connectionError) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-950/80 backdrop-blur-md p-6 text-center">
      <div className="max-w-md w-full bg-surface-900 border border-surface-800 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-crimson-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">Connection Lost</h2>
        <p className="text-surface-400 text-sm mb-8 leading-relaxed">
          We couldn't sync your profile data. Please check your internet connection and try again.
        </p>
        <button 
          onClick={refreshProfile}
          disabled={loading}
          className="w-full py-4 bg-crimson-600 hover:bg-crimson-500 disabled:bg-surface-800 text-white font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Retrying...
            </>
          ) : (
            'Reconnect Now'
          )}
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const { settings } = useSettings()
  const { user, loading: authLoading } = useAuth()
  const orgCtx = useContext(OrgContext)
  const [showSplash, setShowSplash] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const [initialSplashDone, setInitialSplashDone] = useState(false)
  const prevUserRef = useRef(undefined)

  // Detect login transition — re-show splash ONLY after the initial one is done
  useEffect(() => {
    if (initialSplashDone && prevUserRef.current === null && user) {
      setShowSplash(true)
      setIsExiting(false)
    }
    prevUserRef.current = user ?? null
  }, [user, initialSplashDone])

  // Timer to dismiss splash (runs on initial load AND on login re-trigger)
  useEffect(() => {
    if (!showSplash) return

    const minTime = 1200
    const maxTime = 3500
    const startTime = Date.now()

    const checkLoading = setInterval(() => {
      const elapsed = Date.now() - startTime

      if ((!authLoading && elapsed >= minTime) || elapsed >= maxTime) {
        clearInterval(checkLoading)
        setIsExiting(true)
        setTimeout(() => {
          setShowSplash(false)
          setInitialSplashDone(true)
        }, 700)
      }
    }, 100)

    return () => clearInterval(checkLoading)
  }, [showSplash, authLoading])

  if (showSplash) return <SplashScreen isExiting={isExiting} />

  // If Super Admin and NOT impersonating, render the dedicated dashboard
  if (orgCtx?.isSuperAdmin && !orgCtx?.impersonatedOrgId) {
    return (
      <ThemeManager>
        <ConnectionOverlay />
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <SessionGuard>
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-screen bg-surface-950 gap-4">
                    <div className="w-12 h-12 border-4 border-surface-800 border-t-crimson-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">Loading Console...</p>
                  </div>
                }>
                  <SuperAdminDashboard />
                </Suspense>
              </SessionGuard>
            </ProtectedRoute>
          } />
        </Routes>
      </ThemeManager>
    )
  }

  return (
    <>
      <ThemeManager>
      <ConnectionOverlay />
      {/* Global Watermark Logo - Top Layer Overlay but Pointer-Disabled */}
      <WatermarkOverlay />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginGuard />} />

        {/* Protected Area wrapping AppShell */}
        <Route path="/*" element={
          <ProtectedRoute>
            <SessionGuard>
              <AppShell>
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="w-12 h-12 border-4 border-surface-800 border-t-crimson-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest animate-pulse">Initializing Module...</p>
                  </div>
                }>
                  <Routes>
                    <Route path="/dashboard/main" element={<DashboardPage />} />
                    <Route path="/dashboard/status" element={<DashboardPage />} />
                    <Route path="/assignment" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<Navigate to="/dashboard/main" replace />} />
                    <Route path="/dashboard/daily" element={<Navigate to="/assignment" replace />} />
                    <Route path="/itinerary" element={<ItineraryPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/finance" element={<FinancePage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/settings/general" element={<GeneralSettings />} />
                    <Route path="/settings/team" element={<TeamPage />} />
                    <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
                    <Route path="/salary" element={<SalaryCalculator />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </SessionGuard>
          </ProtectedRoute>
        } />
      </Routes>
      </ThemeManager>
    </>
  )
}

function WatermarkOverlay() {
  const orgCtx = useContext(OrgContext)
  const { settings } = useSettings()

  // Disable watermark completely for pure Super Admin sessions
  if (orgCtx?.isSuperAdmin && !orgCtx?.impersonatedOrgId) {
    return null
  }

  // Prefer org logo, then settings if not impersonating
  const logoSrc = orgCtx?.logoUrl || (!orgCtx?.orgId ? settings?.clublogo : null)
  
  if (!logoSrc) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center opacity-[0.12] dark:opacity-[0.08] pointer-events-none z-0 overflow-hidden select-none">
      <img 
        src={logoSrc} 
        alt="Watermark" 
        className="w-[90vw] md:w-[80vw] max-w-[1000px] h-auto object-contain"
      />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrgProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </OrgProvider>
      </AuthProvider>
    </Router>
  )
}


export default App
