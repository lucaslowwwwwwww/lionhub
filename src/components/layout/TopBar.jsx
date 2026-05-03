import { useAuth } from '../../hooks/useAuth'
import { useScrollDirection } from '../../hooks/useScrollDirection'
import { useOrg } from '../../contexts/OrgContext'

export default function TopBar({ setIsMobileMenuOpen }) {
  const { userProfile, logout } = useAuth()
  const scrollDirection = useScrollDirection()
  const { logoUrl, nameCn, nameEn } = useOrg()
  const displayName = nameCn || nameEn || 'LDMS'

  return (
    <header className={`fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-50 md:z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800 transition-transform duration-300 ease-in-out ${
      scrollDirection === 'down' ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
    }`}>
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between md:justify-end">
        
        {/* Mobile Hamburger & Branding */}
        <div className="flex items-center gap-3 md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 -ml-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-surface-800 flex items-center justify-center bg-surface-900">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-surface-400 text-xs font-black">{displayName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 animate-fade-in">
            <h1 className="text-sm font-bold text-surface-200 tracking-tight truncate max-w-[140px]">{displayName}</h1>
          </div>
        </div>

        {/* Mobile User Actions (hidden on desktop because Sidebar handles it) */}
        <div className="flex items-center gap-4 md:hidden">
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            userProfile?.role === 'master'
              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
              : userProfile?.role === 'admin'
              ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
              : 'bg-crimson-500/15 text-crimson-400 border border-crimson-500/30'
          }`}>
            {userProfile?.role || 'member'}
          </span>

          <button
            onClick={logout}
            className="p-2 -mr-2 text-surface-400 hover:text-crimson-400 hover:bg-surface-800 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
