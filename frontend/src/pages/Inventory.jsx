import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Inventory — Local Stock Inquiry (HU017) + Manual Stock Entry (HU018).
 * Cashier sees only their assigned venue; admin sees global inventory.
 */
export default function Inventory() {
  const { user: currentUser } = useAuth()

  const [items, setItems]       = useState([])
  const [venues, setVenues]     = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState('')
  const [search, setSearch]     = useState('')
  // Admin-only: '' = All Locations, otherwise a specific venue ID.
  const [adminVenueId, setAdminVenueId] = useState('')

  // Manual Stock Entry modal (HU018)
  const [modalOpen, setModalOpen]       = useState(false)
  const [entryProduct, setEntryProduct] = useState('')
  const [entryQty, setEntryQty]         = useState('')
  const [entrySearch, setEntrySearch]   = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [entryError, setEntryError]     = useState('')

  const isAdmin  = currentUser?.rol === 'admin'
  const isCashier = currentUser?.rol === 'cajero'
  const canView = isAdmin || isCashier
  const canAddStock = isAdmin || isCashier

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

  const fetchProducts = useCallback(async () => {
    if (!canAddStock) return
    try {
      const res = await fetch('/api/v1/products', {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setProducts(data || [])
    } catch {
      /* product list is only needed for the entry modal */
    }
  }, [canAddStock, currentUser?.token])

  useEffect(() => {
    fetchInventory()
    fetchVenues()
    fetchProducts()
  }, [fetchInventory, fetchVenues, fetchProducts])

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

  // Sede mostrada dentro del modal (HU018 — "Current Location: [Sede Name]").
  const modalVenueLabel = useMemo(() => {
    if (isAdmin) {
      if (!adminVenueId) return ''
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

  const productOptions = useMemo(() => {
    const term = entrySearch.trim().toLowerCase()
    const list = (products || []).filter((p) => p.activo !== false)
    if (!term) return list
    return list.filter((p) => (p.nombre || '').toLowerCase().includes(term))
  }, [products, entrySearch])

  const openModal = () => {
    setEntryProduct('')
    setEntryQty('')
    setEntrySearch('')
    setEntryError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEntryError('')

    if (!entryProduct) {
      setEntryError('Please select a product.')
      return
    }
    if (entryQty === '' || entryQty === null) {
      setEntryError('Quantity is required.')
      return
    }
    // Regla de negocio: solo enteros positivos (no decimales).
    if (!/^\d+$/.test(String(entryQty).trim())) {
      setEntryError('Quantity must be a whole number (no decimals).')
      return
    }
    const qty = parseInt(entryQty, 10)
    if (qty <= 0) {
      setEntryError('Quantity must be greater than zero.')
      return
    }
    if (isAdmin && !adminVenueId) {
      setEntryError('Please select a location before adding stock.')
      return
    }

    setSubmitting(true)
    try {
      const body = { product_id: Number(entryProduct), quantity: qty }
      if (isAdmin) body.venue_id = Number(adminVenueId)

      const res = await fetch('/api/v1/inventory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token ?? ''}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add stock')
      }

      setToast(data.message || 'Stock updated successfully')
      setModalOpen(false)
      fetchInventory()
    } catch (err) {
      setEntryError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Inventory Status{venueLabel ? ` - ${venueLabel}` : ''}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Current stock available at your assigned location.
          </p>
        </div>

        {canAddStock && (
          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2 rounded-md text-sm font-semibold transition-opacity duration-150 hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-success, #16a34a)',
              color: '#ffffff',
            }}
          >
            + Manual Stock Entry
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'rgba(22,163,74,0.12)',
            border: '1px solid #16a34a',
            color: '#16a34a',
          }}
        >
          {toast}
        </div>
      )}

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

      {/* Manual Stock Entry Modal (HU018) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Manual Stock Entry
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
              Current Location: <strong>{modalVenueLabel || '—'}</strong>
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Product selector with search */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Select Product
                </label>
                <input
                  type="text"
                  placeholder="Search product (e.g. Old Parr 750ml)"
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none mb-2"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <select
                  value={entryProduct}
                  onChange={(e) => setEntryProduct(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: entryProduct ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <option value="">
                    {productOptions.length === 0 ? 'No products match' : '-- Select a product --'}
                  </option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Enter whole units (e.g. 12)"
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Entry error */}
              {entryError && (
                <div
                  className="px-3 py-2 rounded-md text-xs"
                  style={{
                    backgroundColor: 'rgba(239,83,80,0.12)',
                    border: '1px solid var(--color-error)',
                    color: 'var(--color-error)',
                  }}
                >
                  {entryError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md text-sm font-semibold transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--color-success, #16a34a)',
                    color: '#ffffff',
                  }}
                >
                  {submitting ? 'Adding...' : 'Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
