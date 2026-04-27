import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage, ProtectedRoute, SessionGuard } from './components/auth'
import { AppShell } from './components/layout'
import { useAuth } from './hooks/useAuth'
import { useSettings } from './hooks/useSettings'
import { useMembers } from './hooks/useMembers'
import { useState, useEffect, lazy, Suspense } from 'react'
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

/**
 * LoginGuard — redirects already-authenticated users away from /login.
 */
function LoginGuard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-950 gap-4">
        <svg className="animate-spin h-10 w-10 text-crimson-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-surface-500 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">
          Securing Connection...
        </p>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

/**
 * ThemeManager — watches settings and updates root HTML class.
 */
function ThemeManager({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark')
  const [hasManualOverride, setHasManualOverride] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e?.detail) {
        setTheme(e.detail)
        setHasManualOverride(true)
      } else {
        // This is a persistence call (from handleSave)
        const savedTheme = localStorage.getItem('app-theme') || settings?.theme || 'dark'
        setTheme(savedTheme)
        setHasManualOverride(false)
      }
    }

    // Sync from database ONLY if the user hasn't made a manual choice in this session
    if (settings?.theme && !hasManualOverride) {
      setTheme(settings.theme)
      // We don't necessarily want to spray localStorage here, 
      // just ensure the UI matches the cloud state for other users/sessions.
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
  }, [theme, settings?.theme, hasManualOverride])

  return children
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeManager>
          {/* Global Watermark Logo - Top Layer Overlay but Pointer-Disabled */}
          <div className="fixed inset-0 flex items-center justify-center opacity-[0.12] dark:opacity-[0.10] pointer-events-none z-50 overflow-hidden select-none translate-y-[-10vh]">
            <img 
              src="/chuan_cheng_logo.png" 
              alt="Watermark" 
              className="w-[80vw] md:w-[70vw] max-w-[600px] h-auto object-contain"
            />
          </div>
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
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Suspense>
                  </AppShell>
                </SessionGuard>
              </ProtectedRoute>
            } />
          </Routes>
        </ThemeManager>
      </AuthProvider>
    </Router>
  )
}


export default App
