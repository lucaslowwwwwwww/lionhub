/**
 * SplashScreen — A premium, minimalist entry view.
 * Always shows the universal LDMS platform branding.
 * Tenant-specific branding appears ONLY inside the dashboard after login.
 * @param {boolean} isExiting - Trigger the fade-out animation.
 */
export default function SplashScreen({ isExiting }) {
  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-surface-950 transition-opacity duration-700 ${isExiting ? 'animate-splash-out' : 'animate-splash-in'}`}>
      
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.02] pointer-events-none overflow-hidden select-none">
        <img src="/lionhub_logo.png" alt="" className="w-[150%] sm:w-[100%] max-w-none grayscale" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        
        {/* Logo Container */}
        <div className="relative w-44 h-44 md:w-56 md:h-56">
          {/* Minimal Loading Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-surface-800 border-t-crimson-500 animate-ring-rotate" />
          
          {/* Lionhub Logo */}
          <div className="absolute inset-0.5 rounded-full overflow-hidden bg-surface-900 flex items-center justify-center border border-surface-700/50 shadow-2xl animate-logo-pulse">
            <img src="/lionhub_logo.png" alt="Lionhub" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Branding Text */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-5xl font-black text-surface-50 tracking-tight uppercase px-8 leading-tight">
            LIONHUB
          </h1>
          <p className="text-sm md:text-base font-bold text-crimson-500 uppercase tracking-widest">
            Lion Dance Management System
          </p>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-surface-800/50" />
             <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.4em]">
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
