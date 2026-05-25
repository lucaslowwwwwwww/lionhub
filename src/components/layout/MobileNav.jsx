import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Haptics } from '../../utils/haptics'

const NAV_ITEMS = [
  { 
    name: 'Home', 
    path: '/dashboard', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
    roles: ['master', 'admin'] 
  },
  { 
    name: 'Daily', 
    path: '/assignment', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, 
    roles: ['member', 'logistics'] 
  },
  { 
    name: 'Inventory', 
    path: '/inventory', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" /></svg>, 
    roles: ['logistics'] 
  },
  { 
    name: 'Route', 
    path: '/itinerary', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>, 
    roles: ['master', 'admin'] 
  },
  { 
    name: 'CRM', 
    path: '/customers', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
    roles: ['master', 'admin'] 
  },
  { 
    name: 'Finance', 
    path: '/finance', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
    roles: ['master', 'admin'] 
  },
  { 
    name: 'Calendar', 
    path: '/calendar', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
    roles: ['member', 'logistics'] 
  },
  { 
    name: 'About', 
    path: '/about', 
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
    roles: ['member', 'logistics'] 
  }
]

export default function MobileNav({ setIsMobileMenuOpen }) {
  const { pathname } = useLocation()
  const { userProfile } = useAuth()
  const userRole = userProfile?.role || 'member'

  const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(userRole))

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-900/90 backdrop-blur-xl border-t border-surface-800 z-50 px-2 pb-safe pt-1">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map(item => {
          const isActive = pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => Haptics.light()}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors no-callout ${
                isActive ? 'text-crimson-400' : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <span className={`text-xl mb-1 transition-transform ${isActive ? 'scale-110' : 'grayscale opacity-70'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
        
        {/* Static Menu Item to trigger Sidebar */}
        <button
          onClick={() => {
            Haptics.medium()
            setIsMobileMenuOpen(true)
          }}
          aria-label="Open Mobile Menu"
          className="flex flex-col items-center justify-center w-16 h-full transition-colors text-surface-400 hover:text-surface-200 no-callout"
        >
          <span className="text-xl mb-1 transition-transform grayscale opacity-70 group-hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </span>
          <span className="text-[10px] font-medium tracking-wide opacity-70">
            Menu
          </span>
        </button>
      </div>
    </nav>
  )
}

