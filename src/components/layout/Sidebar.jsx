import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { Haptics } from '../../utils/haptics'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { 
        name: 'Dashboard', 
        path: '/dashboard', 
        roles: ['master', 'admin'], 
        subItems: [
          { name: 'Main', path: '/dashboard/main' },
          { name: 'Daily', path: '/dashboard/status' }
        ],
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )},
      { name: 'Daily Assignment', path: '/assignment', roles: ['master', 'admin', 'member', 'logistics'], icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )},
      { name: 'Itinerary', path: '/itinerary', roles: ['master', 'admin'], icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )},
      { name: 'Customers', path: '/customers', roles: ['master', 'admin'], icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )},
      { name: 'Inventory', path: '/inventory', roles: ['master', 'admin', 'logistics'], icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" strokeWidth="1.5" />
        </svg>
      )},
      { name: 'Calendar', path: '/calendar', roles: ['master', 'admin', 'member', 'logistics'], icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )},
    ]
  },
  {
    label: 'Administration',
    items: [
      { 
        name: 'Finance', 
        path: '/finance', 
        roles: ['master', 'admin'], 
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )},
      { 
        name: 'Billing', 
        path: '/billing', 
        roles: ['master', 'admin'], 
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )},
      { 
        name: 'Salary Calculator', 
        path: '/salary', 
        roles: ['master'], 
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )},
      { 
        name: 'Settings', 
        path: '/settings', 
        roles: ['master', 'admin', 'member', 'logistics'], 
        subItems: [
          { name: 'General', path: '/settings/general', roles: ['master', 'admin', 'member', 'logistics'] },
          { name: 'Team Settings', path: '/settings/team', roles: ['master', 'admin'] }
        ],
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )},
    ]
  },
  {
    label: 'Information',
    items: [
      { 
        name: 'About & Legal', 
        path: '/about', 
        roles: ['master', 'admin', 'member', 'logistics'], 
        icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    ]
  }
]

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { pathname } = useLocation()
  const { userProfile, logout } = useAuth()
  const { impersonatedOrgId, setImpersonatedOrgId, logoUrl, nameCn, nameEn } = useOrg()
  const userRole = userProfile?.role || 'member'

  const displayName = nameCn || nameEn || 'Lionhub'

  const handleLogout = () => {
    if (impersonatedOrgId) {
      alert("You are currently impersonating an organization. Please click the red 'Quit Impersonation' button at the bottom of the sidebar before logging out.")
      return
    }
    logout()
  }

  const handleLinkClick = () => {
    Haptics.light()
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-[55] animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 bg-surface-950 border-r border-surface-800 flex flex-col z-[60] md:z-[45] transition-all duration-300 ease-in-out font-sans shadow-2xl will-change-transform ${
          isCollapsed ? 'md:w-[80px]' : 'md:w-[240px]'
        } ${
          isMobileMenuOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ── Brand Section ── */}
        <div className={`pt-[calc(2.75rem+env(safe-area-inset-top))] pb-6 px-4 flex items-center shrink-0 transition-[padding,justify-content] duration-300 ease-in-out ${isCollapsed ? 'md:justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-surface-800 bg-surface-900 shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-surface-400 text-xs font-black">{displayName.charAt(0)}</span>
              )}
            </div>
            <div className={`min-w-0 animate-fade-in transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : ''}`}>
              <span className="text-sm font-bold text-surface-5 tracking-tight truncate max-w-[140px] block">{displayName}</span>
            </div>
          </div>

          <button 
            onClick={() => {
              Haptics.medium()
              window.innerWidth < 768 ? setIsMobileMenuOpen(false) : setIsCollapsed(!isCollapsed)
            }}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`flex items-center justify-center rounded-lg border border-surface-800 bg-surface-900/50 text-surface-400 hover:text-surface-100 transition-all shadow-sm ${
              isCollapsed ? 'md:absolute md:-right-3 md:top-[calc(3.5rem+env(safe-area-inset-top))] md:w-6 md:h-6 md:bg-surface-900' : 'w-7 h-7'
            }`}
          >
            {window.innerWidth < 768 ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isCollapsed ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Scrollable Menu ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 hidden-scrollbar space-y-7">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (item.superAdminOnly && !userProfile?.is_super_admin) return false
              return item.roles.includes(userRole)
            })
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className="space-y-1">
                <p className={`text-[10px] font-bold tracking-widest uppercase text-surface-500 mb-3 ml-2 transition-all duration-300 ${isCollapsed ? 'md:opacity-0 md:h-0 md:my-0 md:overflow-hidden' : 'opacity-100'}`}>
                  {group.label}
                </p>
                
                {visibleItems.map(item => {
                  const isActiveGroup = pathname.startsWith(item.path)
                  const hasSubItems = Boolean(item.subItems)
                  const shouldHighlightParent = isActiveGroup && (!hasSubItems || isCollapsed)

                  return (
                    <div key={item.path} className="mb-1">
                      <Link
                        to={hasSubItems ? item.subItems[0].path : item.path}
                        onClick={hasSubItems ? undefined : handleLinkClick}
                        className={`relative flex items-center justify-between mx-1 px-3 h-10 rounded-xl transition-all duration-200 group no-callout ${
                          shouldHighlightParent 
                            ? 'bg-crimson-500/10 text-crimson-400 font-medium' 
                            : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {shouldHighlightParent && (
                            <div className="absolute left-[-4px] inset-y-2 w-1 rounded-r bg-crimson-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                          )}
                          <span className={`transition-transform duration-200 shrink-0 ${shouldHighlightParent ? '' : 'group-hover:scale-110'}`}>
                            {item.icon}
                          </span>
                          <span className={`text-sm whitespace-nowrap animate-fade-in ${isCollapsed ? 'md:hidden' : ''}`}>
                            {item.name}
                          </span>
                        </div>
                        {hasSubItems && (
                          <svg className={`w-4 h-4 transition-transform duration-300 ${isActiveGroup ? 'rotate-180 text-crimson-400' : 'text-surface-500'} ${isCollapsed ? 'md:hidden' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </Link>

                      {hasSubItems && isActiveGroup && (
                        <div className={`ml-8 mt-1.5 border-l-2 border-surface-800/60 flex flex-col gap-1 py-1 animate-fade-in origin-top ${isCollapsed ? 'md:hidden' : ''}`}>
                          {item.subItems.filter(sub => !sub.roles || sub.roles.includes(userRole)).map(subItem => {
                             const isSubActive = pathname === subItem.path
                             return (
                               <Link 
                                 key={subItem.path} 
                                 to={subItem.path} 
                                 onClick={handleLinkClick}
                                 className={`block pl-4 pr-3 py-2 text-xs rounded-r-lg transition-colors relative no-callout ${
                                   isSubActive 
                                     ? 'text-surface-100 font-bold bg-surface-800/50' 
                                     : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/30'
                                 }`}
                               >
                                 {isSubActive && <div className="absolute left-[-2px] inset-y-0 w-0.5 bg-crimson-500" />}
                                 {subItem.name}
                               </Link>
                             )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* ── Impersonation Quit Banner ── */}
        {impersonatedOrgId && (
          <div className="p-3 border-t border-surface-800/50 bg-crimson-950/20">
            <button
              onClick={() => setImpersonatedOrgId(null)}
              className="w-full py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg shadow-crimson-600/20"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>Quit Impersonation</span>
            </button>
          </div>
        )}

        {/* ── Footer / Profile Settings ── */}
        <div className="p-3 border-t border-surface-800/50">
          <div className="p-1 flex items-center gap-3 transition-[padding,gap] duration-300 ease-in-out">
            <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex flex-col items-center justify-center shrink-0 overflow-hidden">
              <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className={`flex-1 min-w-0 transition-[width,opacity] duration-300 ease-in-out ${isCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'opacity-100'}`}>
              <p className="text-xs font-semibold text-surface-200 truncate">{userProfile?.displayname || userProfile?.displayName || 'Admin User'}</p>
              <p className="text-[10px] text-surface-500 uppercase tracking-widest truncate">{userProfile?.is_super_admin ? 'Super Admin' : userRole}</p>
            </div>
            <button 
              onClick={handleLogout} 
              aria-label="Logout"
              title={impersonatedOrgId ? "Please quit impersonation first to log out" : "Logout"}
              className={`p-1.5 rounded-lg transition-colors animate-fade-in shrink-0 ${
                impersonatedOrgId 
                  ? 'text-surface-600 hover:text-crimson-400 cursor-not-allowed' 
                  : 'text-surface-400 hover:text-crimson-400'
              } ${isCollapsed ? 'md:hidden' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
