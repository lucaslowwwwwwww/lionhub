import { useAuth } from '../../hooks/useAuth'
import { useScrollDirection } from '../../hooks/useScrollDirection'
import { useOrg } from '../../contexts/OrgContext'

export default function TopBar({ setIsMobileMenuOpen }) {
  const { userProfile } = useAuth()
  const scrollDirection = useScrollDirection()
  const { logoUrl, nameCn, nameEn } = useOrg()
  const displayName = nameCn || nameEn || 'Lionhub'

  return (
    <header className={`fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-50 md:z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800 transition-transform duration-300 ease-in-out pt-safe ${
      scrollDirection === 'down' ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
    }`}>
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between md:justify-end">
        
        {/* Mobile Branding */}
        <div className="flex items-center gap-3 md:hidden">

          <div className="w-8 h-8 rounded-lg overflow-hidden border border-surface-800 flex items-center justify-center bg-surface-900">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-surface-400 text-xs font-black">{displayName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 animate-fade-in">
            <span className="text-sm font-bold text-surface-200 tracking-tight block">{displayName}</span>
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
        </div>
      </div>
    </header>
  )
}
