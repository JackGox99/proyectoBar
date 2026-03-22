/**
 * Dashboard — main landing page after login.
 *
 * This is the placeholder for HU004. Real KPI cards and charts
 * will be implemented in subsequent HUs (inventory, orders, reports).
 */

const STAT_CARDS = [
  { label: 'Total Products',    value: '—', color: 'var(--color-brand-primary)' },
  { label: 'Open Orders',       value: '—', color: 'var(--color-accent)' },
  { label: 'Low Stock Alerts',  value: '—', color: 'var(--color-error)' },
  { label: 'Revenue Today',     value: '—', color: 'var(--color-success)' },
]

export default function Dashboard() {
  return (
    <div>
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Welcome to Bar Inventory. Select a module from the sidebar to get started.
        </p>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Coming soon modules grid */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { name: 'Inventory',  desc: 'Track stock levels per venue.',           icon: '📦' },
            { name: 'Orders',     desc: 'Manage open and paid orders.',             icon: '🧾' },
            { name: 'Products',   desc: 'Edit the global product catalog.',         icon: '🍺' },
            { name: 'Users',      desc: 'Manage staff accounts and roles.',         icon: '👤' },
            { name: 'Reports',    desc: 'View sales and low-stock reports.',        icon: '📊' },
            { name: 'Settings',   desc: 'Configure venues and system preferences.', icon: '⚙️' },
          ].map(({ name, desc, icon }) => (
            <div
              key={name}
              className="card flex items-start gap-4 cursor-default"
              style={{ opacity: 0.6 }}
              title="Coming soon"
            >
              <span className="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {desc}
                </p>
                <span className="badge badge-warning mt-2">Coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
