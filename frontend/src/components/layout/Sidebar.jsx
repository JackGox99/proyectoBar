import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard',  to: '/',           icon: '▦',  roles: null },
  { label: 'Inventory',  to: '/inventory',  icon: '📦', roles: ['admin', 'mesero', 'cajero'] },
  { label: 'Orders',     to: '/orders',     icon: '🧾', roles: ['admin', 'mesero', 'cajero'] },
  { label: 'Products',   to: '/products',   icon: '🍺', roles: ['admin'] },
  { label: 'Categories', to: '/categories', icon: '📂', roles: ['admin'] },
  { label: 'Users',      to: '/users',      icon: '👤', roles: ['admin'] },
  { label: 'Reports',    to: '/reports',    icon: '📊', roles: ['admin'] },
  { label: 'My Profile', to: '/profile',    icon: '🔑', roles: null },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()
  const rol = user?.rol ?? ''
  const visibleItems = NAV_ITEMS.filter(item => item.roles === null || item.roles.includes(rol))
  return (
    <>
      {/* Dark overlay — mobile only, shown when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Main navigation"
        className={[
          'fixed z-20 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          // Mobile: slide in/out from left
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          top: 'var(--header-height)',
          left: 0,
          width: 'var(--sidebar-width)',
          height: 'calc(100dvh - var(--header-height))',
          backgroundColor: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
          overflowY: 'auto',
        }}
      >
        {/* Venue label */}
        <div
          className="px-4 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Navigation
        </div>

        <nav className="flex-1 px-2 pb-4">
          {visibleItems.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-base leading-none w-5 text-center" aria-hidden="true">
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — app version */}
        <div
          className="px-4 py-3 text-xs border-t"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border)',
          }}
        >
          Bar Inventory v0.0.3
        </div>
      </aside>
    </>
  )
}
