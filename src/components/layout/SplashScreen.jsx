import { useState, useEffect } from 'react'

/**
 * SplashScreen — A premium, minimalist entry view.
 * @param {boolean} isExiting - Trigger the fade-out animation.
 */
export default function SplashScreen({ isExiting }) {
  const [logoLoaded, setLogoLoaded] = useState(false)
  
  // Use cached branding for the fast splash, but ignore if super admin
  const isSuperAdmin = localStorage.getItem('ldms_is_super_admin') === 'true'
  const cachedLogo = isSuperAdmin ? null : localStorage.getItem('ldms_cached_logo')
  const cachedNameCn = isSuperAdmin ? null : localStorage.getItem('ldms_cached_name_cn')

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-surface-950 transition-opacity duration-700 ${isExiting ? 'animate-splash-out' : 'animate-splash-in'}`}>
      <div className="relative flex flex-col items-center gap-8">
        
        {/* Logo Container */}
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          {/* Minimal Loading Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-surface-800 border-t-crimson-500 animate-ring-rotate" />
          
          {/* Logo with pulse */}
          <div className="absolute inset-2 rounded-full overflow-hidden bg-surface-900 flex items-center justify-center border border-surface-700/50 shadow-2xl animate-logo-pulse">
            {cachedLogo ? (
              <>
                <img 
                  src={cachedLogo} 
                  alt="Logo" 
                  className={`w-full h-full object-cover transition-opacity duration-700 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setLogoLoaded(true)}
                />
                {!logoLoaded && (
                  <div className="text-crimson-500 font-black text-2xl tracking-tighter">LDMS</div>
                )}
              </>
            ) : (
              <div className="text-crimson-500 font-black text-2xl tracking-tighter">
                LDMS
              </div>
            )}
          </div>
        </div>

        {/* Branding Text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase px-8 leading-tight">
            {cachedNameCn ? (
              <>{cachedNameCn} <span className="text-crimson-500 block text-lg md:text-2xl mt-1">MANAGEMENT SYSTEM</span></>
            ) : (
              <>LION DANCE <span className="text-crimson-500 block">MANAGEMENT SYSTEM</span></>
            )}
          </h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-surface-800/50" />
             <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.4em]">
               {cachedNameCn ? 'Association Console' : 'Professional Platform'}
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
