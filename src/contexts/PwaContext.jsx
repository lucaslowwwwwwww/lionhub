import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const PwaContext = createContext(null)

export function usePwa() {
  return useContext(PwaContext)
}

export function PwaProvider({ children }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('SW registered successfully')
        registrationRef.current = r

        // Check for service worker updates every 10 minutes
        setInterval(() => {
          r.update().catch(err => console.error('Failed to update SW', err))
        }, 10 * 60 * 1000)

        // Check for updates when PWA is resumed/brought back to foreground
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(err => console.error('Failed to update SW on visibility change', err))
          }
        })
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  const registrationRef = useRef(null)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  // Manual check for updates
  const checkForUpdate = useCallback(async () => {
    const r = registrationRef.current
    if (!r) return
    setChecking(true)
    try {
      await r.update()
      setLastChecked(new Date())
    } catch (err) {
      console.error('Manual SW update check failed', err)
    } finally {
      // Small delay so the user sees the checking state
      setTimeout(() => setChecking(false), 1500)
    }
  }, [])

  const dismissRefresh = useCallback(() => {
    setNeedRefresh(false)
  }, [setNeedRefresh])

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false)
  }, [setOfflineReady])

  // Auto-close offline ready toast after 4 seconds
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(() => setOfflineReady(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [offlineReady, setOfflineReady])

  const value = {
    needRefresh,
    offlineReady,
    checking,
    lastChecked,
    updateServiceWorker,
    checkForUpdate,
    dismissRefresh,
    dismissOfflineReady,
  }

  return (
    <PwaContext.Provider value={value}>
      {children}
    </PwaContext.Provider>
  )
}
