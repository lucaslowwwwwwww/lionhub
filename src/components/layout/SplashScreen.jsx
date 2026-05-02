import { useEffect, useState } from 'react'

/**
 * SplashScreen — A premium, minimalist entry view.
 * @param {boolean} isExiting - Trigger the fade-out animation.
 */
export default function SplashScreen({ isExiting }) {
  const [logoLoaded, setLogoLoaded] = useState(false)

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-surface-950 transition-opacity duration-700 ${isExiting ? 'animate-splash-out' : 'animate-splash-in'}`}>
      <div className="relative flex flex-col items-center gap-8">
        
        {/* Logo Container */}
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          {/* Minimal Loading Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-surface-800 border-t-crimson-500 animate-ring-rotate" />
          
          {/* Logo with pulse */}
          <div className="absolute inset-2 rounded-full overflow-hidden bg-surface-900 flex items-center justify-center border border-surface-700/50 shadow-2xl animate-logo-pulse">
            <img 
              src="/chuan_cheng_logo.png" 
              alt="LDMS Logo"
              className={`w-full h-full object-cover transition-opacity duration-1000 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLogoLoaded(true)}
            />
            {!logoLoaded && (
               <div className="text-crimson-500 font-black text-2xl tracking-tighter">
                 LDMS
               </div>
            )}
          </div>
        </div>

        {/* Branding Text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-surface-50 tracking-[0.2em] uppercase">
            传承龙狮
          </h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-surface-800" />
             <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.4em]">
               Management System
             </p>
             <div className="h-px w-8 bg-surface-800" />
          </div>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
         <p className="text-[9px] font-black text-surface-400 uppercase tracking-[0.3em] opacity-40">
           Powered by Supabase & React
         </p>
      </div>
    </div>
  )
}
