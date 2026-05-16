import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Dashboard — landing page with live counts for implemented modules
 * (Products, Categories, Users, Inventory, Venues) and "Coming soon"
 * placeholders for modules pending implementation (Orders, Reports, Settings).
 */
export default function Dashboard() {
  const { user } = useAuth()
  const token     = user?.token ?? ''
  const rol       = user?.rol ?? ''
  const isAdmin   = rol === 'admin'
  const isMesero  = rol === 'mesero'
  const isCajero  = rol === 'cajero'
  const canOrder  = isAdmin || isMesero || isCajero

  const [stats, setStats] = useState({
    products: null,
    categories: null,
    users: null,
    venues: null,
    inventoryRows: null,
    lowStock: null,
    openOrders: null,
  })

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }

    async function safeCount(url, filter) {
      try {
        const res = await fetch(url, { headers })
        if (!res.ok) return null
        const data = await res.json()
        if (!Array.isArray(data)) return null
        return filter ? data.filter(filter).length : data.length
      } catch {
        return null
      }
    }

    async function load() {
      const [products, categories, users, venues, inventory, orders] = await Promise.all([
        safeCount('/api/v1/products', (p) => p.activo !== false),
        safeCount('/api/v1/categories'),
        safeCount('/api/v1/users'),
        safeCount('/api/v1/venues'),
        (async () => {
          try {
            const res = await fetch('/api/v1/inventory', { headers })
            if (!res.ok) return null
            const data = await res.json()
            if (!Array.isArray(data)) return null
            const low = data.filter(
              (i) => i.stock_actual === 0 ||
                     (i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo),
            ).length
            return { total: data.length, low }
          } catch {
            return null
          }
        })(),
        safeCount('/api/v1/orders', (o) => o.estado === 'abierto'),
      ])

      setStats({
        products,
        categories,
        users,
        venues,
        inventoryRows: inventory?.total ?? null,
        lowStock: inventory?.low ?? null,
        openOrders: orders,
      })
    }

    load()
  }, [token])

  const fmt = (n) => (n == null ? '—' : String(n))

  const STAT_CARDS = [
    { label: 'Total Products',   value: fmt(stats.products),      color: 'var(--color-brand-primary)' },
    { label: 'Categories',       value: fmt(stats.categories),    color: 'var(--color-accent)' },
    { label: 'Inventory Items',  value: fmt(stats.inventoryRows), color: 'var(--color-brand-primary)' },
    { label: 'Low Stock Alerts', value: fmt(stats.lowStock),      color: 'var(--color-error)' },
    { label: 'Open Orders',      value: canOrder ? fmt(stats.openOrders) : '—', color: 'var(--color-accent)' },
    { label: 'Users',            value: isAdmin ? fmt(stats.users) : '—', color: 'var(--color-success)' },
  ]

  const ALL_MODULES = [
    { name: 'Inventory',  desc: 'Track stock levels per venue.',      icon: '📦', to: '/inventory',  roles: ['admin', 'mesero', 'cajero'] },
    { name: 'Orders',     desc: 'Open, manage and summarize orders.', icon: '🧾', to: '/orders',     roles: ['admin', 'mesero', 'cajero'] },
    { name: 'Products',   desc: 'Manage the global product catalog.', icon: '🍺', to: '/products',   roles: ['admin'] },
    { name: 'Categories', desc: 'Organize products by category.',     icon: '📂', to: '/categories', roles: ['admin'] },
    { name: 'Users',      desc: 'Staff accounts and roles.',          icon: '👤', to: '/users',      roles: ['admin'] },
    { name: 'Reports',    desc: 'Sales and product rotation report.', icon: '📊', to: '/reports',    roles: ['admin'] },
  ]

  // Solo mostrar módulos a los que el usuario tiene acceso según su rol.
  const MODULES = ALL_MODULES.filter(m => m.roles.includes(rol))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Welcome{user?.nombre ? `, ${user.nombre}` : ''}. Here's a snapshot of your bar.
        </p>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, color }) => (
          <div key={label} className="card flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </span>
            <span className="text-3xl font-bold" style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Modules grid */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODULES.map(({ name, desc, icon, to }) => (
            <Link key={name} to={to} className="no-underline">
              <div
                className="card flex items-start gap-4 h-full"
                style={{ cursor: 'pointer', transition: 'transform 150ms, box-shadow 150ms' }}
                title={`Go to ${name}`}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
              >
                <span className="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {desc}
                  </p>
                  <span className="badge mt-2 badge-success">Available</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
