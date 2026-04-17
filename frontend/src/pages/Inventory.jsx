import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Inventory — Local Stock Inquiry (HU017).
 * Cashier sees only their assigned venue; admin sees global inventory.
 */
export default function Inventory() {
  const { user: currentUser } = useAuth()

  const [items, setItems]       = useState([])
  const [venues, setVenues]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  // Admin-only: '' = All Locations, otherwise a specific venue ID.
  const [adminVenueId, setAdminVenueId] = useState('')

  const isAdmin  = currentUser?.rol === 'admin'
  const isCashier = currentUser?.rol === 'cajero'
  const canView = isAdmin || isCashier

  const fetchInventory = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      const url = isAdmin && adminVenueId
        ? `/api/v1/inventory?venue_id=${adminVenueId}`
        : '/api/v1/inventory'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load inventory')
      }
      const data = await res.json()
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [canView, currentUser?.token, isAdmin, adminVenueId])

  const fetchVenues = useCallback(async () => {
    if (!canView) return
    try {
      const res = await fetch('/api/v1/venues', {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setVenues(data || [])
    } catch {
      /* venue name is cosmetic — silently ignore */
    }
  }, [canView, currentUser?.token])

  useEffect(() => {
    fetchInventory()
    fetchVenues()
  }, [fetchInventory, fetchVenues])

  const venueLabel = useMemo(() => {
    if (isAdmin) {
      if (!adminVenueId) return 'All Locations'
      const match = venues.find((v) => String(v.id) === String(adminVenueId))
      return match?.nombre || ''
    }
    if (!currentUser?.sede_id) return ''
    const match = venues.find((v) => v.id === currentUser.sede_id)
    return match?.nombre || ''
  }, [isAdmin, adminVenueId, currentUser?.sede_id, venues])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((it) =>
      (it.producto?.nombre || '').toLowerCase().includes(term)
    )
  }, [items, search])

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
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Inventory Status{venueLabel ? ` - ${venueLabel}` : ''}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Current stock available at your assigned location.
        </p>
      </div>

      {/* Search bar + (admin) venue selector */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search product..."
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

      {/* Inventory table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['Product Name', 'Category', 'Current Stock'].map((col) => (
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
                  <td colSpan={3} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {items.length === 0
                      ? 'No inventory records found.'
                      : 'No products match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((it, idx) => {
                  const isOutOfStock = it.stock_actual === 0
                  return (
                    <tr
                      key={it.id}
                      style={{
                        backgroundColor: idx % 2 === 0
                          ? 'var(--color-bg-surface)'
                          : 'var(--color-bg-elevated)',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <td className="px-4 py-3 font-medium"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {it.producto?.nombre || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'rgba(37,99,235,0.12)',
                            color: '#2563eb',
                          }}
                        >
                          {it.producto?.categoria?.nombre || '—'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-semibold"
                        style={{
                          color: isOutOfStock ? 'var(--color-error)' : 'var(--color-text-primary)',
                        }}
                      >
                        {it.stock_actual} units
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && !error && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              color: 'var(--color-text-muted)',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
          >
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
