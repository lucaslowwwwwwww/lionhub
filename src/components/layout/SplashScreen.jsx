/**
 * SplashScreen — A premium, minimalist entry view.
 * Always shows the universal LDMS platform branding.
 * Tenant-specific branding appears ONLY inside the dashboard after login.
 * @param {boolean} isExiting - Trigger the fade-out animation.
 */
export default function SplashScreen({ isExiting }) {
  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-surface-950 transition-opacity duration-700 ${isExiting ? 'animate-splash-out' : 'animate-splash-in'}`}>
      <div className="relative flex flex-col items-center gap-8">
        
        {/* Logo Container */}
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          {/* Minimal Loading Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-surface-800 border-t-crimson-500 animate-ring-rotate" />
          
          {/* LDMS Logo — always platform default */}
          <div className="absolute inset-2 rounded-full overflow-hidden bg-surface-900 flex items-center justify-center border border-surface-700/50 shadow-2xl animate-logo-pulse">
            <div className="text-crimson-500 font-black text-2xl tracking-tighter">
              LDMS
            </div>
          </div>
        </div>

        {/* Branding Text — always platform default */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase px-8 leading-tight">
            LION DANCE <span className="text-crimson-500 block">MANAGEMENT SYSTEM</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-surface-800/50" />
             <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.4em]">
               Professional Platform
             </p>
             <div className="h-px w-8 bg-surface-800/50" />
          </div>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
         <p className="text-[9px] font-black text-surface-500 uppercase tracking-[0.3em] opacity-30">
           Platform Terminal v2.0
         </p>
      </div>
    </div>
  )
}
