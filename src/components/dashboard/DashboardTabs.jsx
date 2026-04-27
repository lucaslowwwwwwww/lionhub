import { Link, useLocation } from 'react-router-dom'

export default function DashboardTabs() {
  const { pathname } = useLocation()

  const TABS = [
    { name: 'Main', path: '/dashboard/main', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { name: 'Daily', path: '/dashboard/daily', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  ]

  return (
    <div className="md:hidden flex gap-2 bg-surface-900 border border-surface-800 rounded-xl p-1 mb-6">
      {TABS.map(tab => {
        const isActive = pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              isActive
                ? 'bg-crimson-600 text-white shadow-lg shadow-crimson-500/20'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
