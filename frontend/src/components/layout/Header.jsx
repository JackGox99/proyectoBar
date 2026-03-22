/**
 * Header
 *
 * Fixed top bar containing:
 *  - Hamburger button (mobile only, md:hidden) to toggle sidebar
 *  - Bar name / brand logo
 *  - Login button (right side)
 *
 * Props:
 *  onMenuToggle — callback that flips sidebar open/closed on mobile
 */
export default function Header({ onMenuToggle }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Left: hamburger (mobile) + brand name */}
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only below md breakpoint */}
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

        {/* Brand */}
        <div className="flex items-center gap-2">
          {/* Gold accent square acts as logo mark */}
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

      {/* Right: Login button */}
      <button className="btn-primary text-sm">
        Login
      </button>
    </header>
  )
}
