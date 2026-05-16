import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

/**
 * MovementHistory — HU020: Stock Movement Log.
 * Cashier sees only movements from their assigned venue (forced by backend);
 * admin sees all venues and can filter by venue.
 */
export default function MovementHistory() {
  const { user: currentUser } = useAuth()

  const [movements, setMovements] = useState([])
  const [venues, setVenues]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  // Admin-only filter; cashier ignores it (backend forces SedeID from JWT).
  const [adminVenueId, setAdminVenueId] = useState('')

  const isAdmin   = currentUser?.rol === 'admin'
  const isCashier = currentUser?.rol === 'cajero'
  const canView   = isAdmin || isCashier

  const fetchMovements = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('product', search.trim())
      if (isAdmin && adminVenueId) params.set('venue_id', adminVenueId)
      const qs = params.toString()
      const res = await fetch(`/api/v1/inventory/movements${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load movement history')
      }
      const data = await res.json()
      setMovements(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [canView, currentUser?.token, isAdmin, adminVenueId, search])

  const fetchVenues = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await fetch('/api/v1/venues', {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) return
      setVenues((await res.json()) || [])
    } catch {
      /* venue selector is admin-only convenience; ignore failure silently */
    }
  }, [isAdmin, currentUser?.token])

  useEffect(() => { fetchVenues() }, [fetchVenues])

  // Debounce search to avoid hammering the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(fetchMovements, 250)
    return () => clearTimeout(t)
  }, [fetchMovements])

  const venueLabel = useMemo(() => {
    if (isCashier) {
      const match = venues.find((v) => v.id === currentUser?.sede_id)
      return match?.nombre || ''
    }
    if (!adminVenueId) return 'All Locations'
    const match = venues.find((v) => String(v.id) === String(adminVenueId))
    return match?.nombre || ''
  }, [isCashier, adminVenueId, venues, currentUser?.sede_id])

  const footerMessage = useMemo(() => {
    if (isCashier) return 'Showing movements for the current location only.'
    if (!adminVenueId) return 'Showing movements across all locations.'
    return `Showing movements for ${venueLabel} only.`
  }, [isCashier, adminVenueId, venueLabel])

  const formatDateTime = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const userLabel = (u) =>
    u?.username || u?.nombre || (u?.id ? `User #${u.id}` : '—')

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="text-5xl" aria-hidden="true">🔒</span>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-error)' }}>
          Access Denied
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header (HU020 mockup) */}
      <div className="mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Stock Movement Log{venueLabel ? ` - ${venueLabel}` : ''}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Audit log of manual stock entries. Most recent first.
        </p>
      </div>

      {/* Filters: product search + (admin) venue selector */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />

        {isAdmin && (
          <select
            value={adminVenueId}
            onChange={(e) => setAdminVenueId(e.target.value)}
            aria-label="Filter by location"
            className="w-full sm:w-56 px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          >
            <option value="">All Locations</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'rgba(239,83,80,0.12)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Movements table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['Date/Time', 'Product', 'Quantity Added', 'User'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    No stock entries found.
                  </td>
                </tr>
              ) : (
                movements.map((m, idx) => (
                  <tr
                    key={m.id}
                    style={{
                      backgroundColor: idx % 2 === 0
                        ? 'var(--color-bg-surface)'
                        : 'var(--color-bg-elevated)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td className="px-4 py-3"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {formatDateTime(m.fecha)}
                    </td>
                    <td className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {m.inventario?.producto?.nombre || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold"
                      style={{ color: 'var(--color-success)' }}>
                      +{m.cantidad}
                    </td>
                    <td className="px-4 py-3"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {userLabel(m.usuario)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (HU020 mockup) */}
        {!loading && !error && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              color: 'var(--color-text-muted)',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
          >
            {footerMessage}
          </div>
        )}
      </div>
    </div>
  )
}
