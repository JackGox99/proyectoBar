import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import MovementHistory from '../components/inventory/MovementHistory'

/**
 * Inventory — Local Stock Inquiry (HU017) + Manual Stock Entry (HU018) +
 * Stock Movement Log (HU020). Tab strip lets the user switch views.
 * Cashier sees only their assigned venue; admin sees global inventory.
 */
export default function Inventory() {
  const { user: currentUser } = useAuth()

  // HU020 — active tab: 'stock' (default) | 'history'.
  const [activeTab, setActiveTab] = useState('stock')

  const [items, setItems]       = useState([])
  const [venues, setVenues]     = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState('')
  const [search, setSearch]     = useState('')
  // Admin-only: '' = All Locations, otherwise a specific venue ID.
  const [adminVenueId, setAdminVenueId] = useState('')

  // Binary-search demo (iterative vs recursive). Llama al endpoint dedicado
  // /inventory/binary-search?algo=iterative|recursive para mostrar al usuario
  // qué variante del algoritmo se ejecutó en el backend.
  const [binQuery, setBinQuery]     = useState('')
  const [binAlgo, setBinAlgo]       = useState('recursive')
  const [binResult, setBinResult]   = useState(null) // { item, algo, found, elapsedMs }
  const [binLoading, setBinLoading] = useState(false)
  const [binError, setBinError]     = useState('')

  // Manual Stock Entry modal (HU018)
  const [modalOpen, setModalOpen]       = useState(false)
  const [entryProduct, setEntryProduct] = useState('')
  const [entryQty, setEntryQty]         = useState('')
  const [entrySearch, setEntrySearch]   = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [entryError, setEntryError]     = useState('')
  // HU019 — error específico del campo Quantity (controla el borde rojo).
  const [qtyError, setQtyError]         = useState('')

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
    setQtyError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEntryError('')
    setQtyError('')

    if (!entryProduct) {
      setEntryError('Please select a product.')
      return
    }
    if (entryQty === '' || entryQty === null) {
      setQtyError('Quantity is required.')
      return
    }
    // HU019 — solo enteros positivos. Mensaje alineado al mockup.
    if (!/^\d+$/.test(String(entryQty).trim())) {
      setQtyError('Invalid input. Please enter a whole number (e.g., 10).')
      return
    }
    const qty = parseInt(entryQty, 10)
    if (qty <= 0) {
      setQtyError('Quantity must be greater than zero.')
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

  // Llama al endpoint /inventory/binary-search con el algoritmo elegido.
  // Mide tiempo en el cliente para que el usuario pueda comparar iterativo vs recursivo.
  const handleBinarySearch = async (e) => {
    e?.preventDefault?.()
    setBinError('')
    setBinResult(null)

    const name = binQuery.trim()
    if (!name) {
      setBinError('Type a product name to search.')
      return
    }
    if (isAdmin && !adminVenueId) {
      setBinError('Select a location first (admin must scope the search to one venue).')
      return
    }

    setBinLoading(true)
    const params = new URLSearchParams({ name, algo: binAlgo })
    if (isAdmin) params.set('venue_id', String(adminVenueId))

    const started = performance.now()
    try {
      const res = await fetch(`/api/v1/inventory/binary-search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Binary search request failed')
      }
      const elapsedMs = performance.now() - started
      setBinResult({ ...data, elapsedMs })
    } catch (err) {
      setBinError(err.message)
    } finally {
      setBinLoading(false)
    }
  }

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

  const tabBtnStyle = (tab) => ({
    color: activeTab === tab ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
    borderBottom: activeTab === tab
      ? '2px solid var(--color-brand-primary)'
      : '2px solid transparent',
  })

  return (
    <div>
      {/* HU020 — Tab strip: Stock Status / Movement History */}
      <div
        className="mb-6 flex gap-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          className="px-4 py-2 text-sm font-semibold -mb-px transition-colors duration-150"
          style={tabBtnStyle('stock')}
        >
          Stock Status
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          className="px-4 py-2 text-sm font-semibold -mb-px transition-colors duration-150"
          style={tabBtnStyle('history')}
        >
          Movement History
        </button>
      </div>

      {activeTab === 'stock' && (
      <>
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

      {/* Binary Search Demo — exact match via iterative or recursive algorithm */}
      <div
        className="mb-4 rounded-lg p-4"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
            Binary Search — Exact Match
          </h3>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            O(log n) — runs MergeSort first, then binary search
          </span>
        </div>

        <form onSubmit={handleBinarySearch} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Product name (exact)
            </label>
            <input
              type="text"
              value={binQuery}
              onChange={(e) => setBinQuery(e.target.value)}
              placeholder="e.g. cerveza"
              className="w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <span className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Algorithm
            </span>
            <div
              className="inline-flex rounded-md overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
              role="radiogroup"
              aria-label="Binary search algorithm"
            >
              {[
                { key: 'iterative', label: 'Iterative' },
                { key: 'recursive', label: 'Recursive' },
              ].map(({ key, label }) => {
                const active = binAlgo === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setBinAlgo(key)}
                    className="px-3 py-2 text-sm font-semibold transition-colors duration-150"
                    style={{
                      backgroundColor: active ? 'var(--color-brand-primary)' : 'transparent',
                      color: active ? '#1A0E02' : 'var(--color-text-primary)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={binLoading}
            className="px-4 py-2 rounded-md text-sm font-semibold transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              color: '#1A0E02',
            }}
          >
            {binLoading ? 'Searching…' : 'Run Search'}
          </button>
        </form>

        {binError && (
          <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>
            {binError}
          </p>
        )}

        {binResult && (
          <div
            className="mt-3 rounded-md p-3 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--color-brand-primary)',
                  color: '#1A0E02',
                }}
              >
                {binResult.algo}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {binResult.elapsedMs?.toFixed(2)} ms (round-trip)
              </span>
            </div>
            {binResult.found ? (
              <p>
                Found <strong>{binResult.item?.producto?.nombre}</strong> — current stock:{' '}
                <strong>{binResult.item?.stock_actual}</strong>
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>
                No product matches that exact name in the selected location.
              </p>
            )}
          </div>
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
      </>
      )}

      {activeTab === 'history' && <MovementHistory />}

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

              {/* Quantity (HU019 — Integer Unit Validation) */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Quantity to Add
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Enter whole units (e.g. 12)"
                  value={entryQty}
                  onKeyDown={(e) => {
                    const passThrough = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter']
                    if (!passThrough.includes(e.key) && !/^\d$/.test(e.key)) {
                      e.preventDefault()
                      setQtyError('Only whole units are allowed')
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text')
                    if (!/^\d+$/.test(text.trim())) {
                      e.preventDefault()
                      setQtyError('Only whole units are allowed')
                    }
                  }}
                  onChange={(e) => {
                    setEntryQty(e.target.value.replace(/[^\d]/g, ''))
                    if (qtyError) setQtyError('')
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: `1px solid ${qtyError ? 'var(--color-error)' : 'var(--color-border)'}`,
                    color: 'var(--color-text-primary)',
                  }}
                />
                {qtyError && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                    {qtyError}
                  </p>
                )}
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
