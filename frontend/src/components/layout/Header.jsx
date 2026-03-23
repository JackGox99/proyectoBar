import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Header — fixed top bar.
 *
 * When authenticated: shows user name + role badge + Logout button.
 * When unauthenticated: shows Login button (redirects to /login).
 */
export default function Header({ onMenuToggle }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
      style={{
        height:          'var(--header-height)',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom:    '1px solid var(--color-border)',
      }}
    >
      {/* Left: hamburger (mobile) + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-md
                     transition-colors duration-150 hover:bg-[var(--color-bg-elevated)]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]"
        >
          <span className="block w-5 h-0.5 bg-[var(--color-text-primary)] mb-1" />
          <span className="block w-5 h-0.5 bg-[var(--color-text-primary)] mb-1" />
          <span className="block w-5 h-0.5 bg-[var(--color-text-primary)]" />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="hidden xs:block w-7 h-7 rounded-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
            aria-hidden="true"
          />
          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--color-brand-primary)' }}>
            Bar Inventory
          </span>
        </div>
      </div>

      {/* Right: user info + logout OR login button */}
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          {/* User name + role */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.nombre}
            </span>
            <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
              {user.rol}
            </span>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className="btn-ghost text-sm">
            Logout
          </button>
        </div>
      ) : (
        <button onClick={() => navigate('/login')} className="btn-primary text-sm">
          Login
        </button>
      )}
    </header>
  )
}
