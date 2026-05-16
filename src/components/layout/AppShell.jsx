import { useState } from 'react'
import { usePresence } from '../../hooks/usePresence'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import TopBar from './TopBar'

export default function AppShell({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  usePresence()

  return (
    <div className="flex min-h-screen bg-surface-950 text-surface-100 selection:bg-crimson-500/30 overflow-x-hidden max-w-full">
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Viewport */}
      <div className={`flex-1 flex flex-col w-full min-w-0 transition-[margin] duration-300 ease-in-out will-change-[margin] ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[240px]'}`}>
        <TopBar setIsMobileMenuOpen={setIsMobileMenuOpen} />
        
        {/* pb-24 handles spacing for the mobile bottom nav so content isn't hidden behind it */}
        {/* pt-20 accounts for the fixed 64px (h-16) mobile header + original p-4 spacing */}
        <main className="flex-1 px-4 pt-[calc(5rem+env(safe-area-inset-top))] pb-24 md:px-8 md:pt-8 md:pb-8 max-w-7xl mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav setIsMobileMenuOpen={setIsMobileMenuOpen} />
    </div>
  )
}
