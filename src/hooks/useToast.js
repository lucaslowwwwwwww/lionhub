import { useContext } from 'react'
import { ToastContext } from '../contexts/ToastContextObject'

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback to console if used outside provider
    return { showToast: (msg) => console.error("Toast outside provider:", msg) }
  }
  return context
}
