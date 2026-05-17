import React, { useState, useCallback } from 'react'
import Toast from '../components/common/Toast'
import { ToastContext } from './ToastContextObject'

/**
 * ToastProvider
 * Manages the state and rendering of pop-out notifications.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'error') => {
    // Generate a unique ID for each toast
    const id = Math.random().toString(36).substring(2, 9)
    
    // We only show one toast at a time for simplicity in this UI
    // but the system supports stacking if needed.
    setToasts([{ id, message, type }])
  }, [])

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => hideToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
