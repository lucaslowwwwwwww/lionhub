import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const SESSION_KEY = 'lion_dance_session_start'
// Security Rule 1: Max 7 days session lifetime before forced re-auth
const MAX_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 

export default function SessionGuard({ children }) {
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!user) {
      // Clean up session token when logged out
      localStorage.removeItem(SESSION_KEY)
      return
    }

    const sessionStart = localStorage.getItem(SESSION_KEY)
    
    if (!sessionStart) {
      // Start the 7-day clock
      localStorage.setItem(SESSION_KEY, Date.now().toString())
    } else {
      const startTime = parseInt(sessionStart, 10)
      const isExpired = (Date.now() - startTime) > MAX_SESSION_DURATION_MS
      
      if (isExpired) {
        console.warn('Security alert: Session exceeded 7 days. Forcing re-authentication.')
        localStorage.removeItem(SESSION_KEY)
        logout()
      }
    }
  }, [user, logout])

  return children
}
