import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

/**
 * Layout — application shell
 *
 * Renders the full-page frame:
 *   ┌─────────────────────────────────────────┐
 *   │  Header (fixed, full width)             │  ← 56px
 *   ├─────────────┬───────────────────────────┤
 *   │  Sidebar    │  <Outlet /> (page content)│
 *   │  240px      │  flex-1, scrollable       │
 *   │  (fixed)    │                           │
 *   └─────────────┴───────────────────────────┘
 *
 * Responsive behavior:
 *   - Desktop (≥ 768px): sidebar is always visible; main content has left margin = 240px.
 *   - Mobile  (< 768px): sidebar is hidden by default; hamburger in Header toggles it.
 *     An overlay dims the main content when the sidebar is open.
 */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar when viewport becomes desktop-sized
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => { if (e.matches) setSidebarOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area
          - On desktop: pushed right by sidebar width via left margin
          - On mobile: full width (sidebar overlays on top)
      */}
      <main
        className="transition-all duration-200"
        style={{
          marginTop: 'var(--header-height)',
          marginLeft: 0,
          minHeight: 'calc(100dvh - var(--header-height))',
        }}
      >
        {/* Responsive margin — Tailwind can't reference CSS vars so we use a style tag trick */}
        <style>{`
          @media (min-width: 768px) {
            main { margin-left: var(--sidebar-width); }
          }
        `}</style>

        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
