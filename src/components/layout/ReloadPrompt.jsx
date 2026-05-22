import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
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

  // Auto-close offline ready toast after 4 seconds
  if (offlineReady) {
    setTimeout(() => setOfflineReady(false), 4000)
  }

  return (
    <>
      {/* Offline Ready Toast */}
      {offlineReady && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-[99999] bg-surface-900 border border-surface-800 rounded-2xl p-4 shadow-2xl animate-slide-up flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-surface-100 uppercase tracking-widest">Offline Ready</p>
            <p className="text-[11px] text-surface-400 mt-0.5">App cached successfully. You can now use it offline!</p>
          </div>
        </div>
      )}

      {/* Update Available — single action, no dismiss */}
      {needRefresh && (
        <div className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in" />
          
          <div className="relative w-full max-w-md bg-surface-900 border border-surface-800 rounded-t-3xl md:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-8 shadow-2xl animate-slide-up flex flex-col gap-5">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            
            <div className="text-center">
              <h2 className="text-lg font-black text-surface-100 uppercase tracking-wider">System Update Available</h2>
              <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                A new version of Lionhub is ready. Tap below to apply updates and access new features.
              </p>
            </div>

            <button
              onClick={() => updateServiceWorker(true)}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-600/20"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </>
  )
}
