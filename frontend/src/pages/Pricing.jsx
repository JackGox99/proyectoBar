import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Pricing — Centralized Pricing Master (HU014).
 * Admin-only: view all products and update their sale price.
 */
export default function Pricing() {
  const { user: currentUser } = useAuth()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState('')

  // Track edited prices per product id
  const [prices, setPrices]     = useState({})
  const [saving, setSaving]     = useState({})

  const isAdmin = currentUser?.rol === 'admin'

  const fetchProducts = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/products', {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data)
      // Initialize prices map from fetched data
      const map = {}
      data.forEach((p) => { map[p.id] = String(p.precio || '') })
      setPrices(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, currentUser?.token])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function handlePriceChange(id, value) {
    // Allow only digits (positive integer)
    if (value !== '' && !/^\d+$/.test(value)) return
    setPrices((prev) => ({ ...prev, [id]: value }))
  }

  async function handleUpdate(product) {
    const value = Number(prices[product.id])
    if (!value || value <= 0) {
      setError('Price must be a positive integer')
      return
    }

    setSaving((prev) => ({ ...prev, [product.id]: true }))
    setError('')

    try {
      const res = await fetch(`/api/v1/products/${product.id}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token ?? ''}`,
        },
        body: JSON.stringify({ price: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update price')

      setToast(data.message || 'Price updated successfully')
      // Update local product data
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, precio: value } : p))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving((prev) => ({ ...prev, [product.id]: false }))
    }
  }

  // Check if a row's price has been modified
  function isModified(product) {
    return String(product.precio || '') !== (prices[product.id] ?? '')
  }

  if (!isAdmin) {
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
      {/* Success toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium shadow-lg"
          style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
        >
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Centralized Pricing Master
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Manage product sale prices across all locations.
        </p>
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

      {/* Pricing table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['Product Name', 'Category', 'Current Price', 'Actions'].map((col) => (
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
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    No products found. Register products first.
                  </td>
                </tr>
              ) : (
                products.map((prod, idx) => (
                  <tr
                    key={prod.id}
                    style={{
                      backgroundColor: idx % 2 === 0
                        ? 'var(--color-bg-surface)'
                        : 'var(--color-bg-elevated)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {prod.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(37,99,235,0.12)',
                          color: '#2563eb',
                        }}
                      >
                        {prod.categoria?.nombre || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={prices[prod.id] ?? ''}
                          onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                          className="w-28 px-2 py-1 rounded-md text-sm outline-none transition-colors duration-150"
                          style={{
                            backgroundColor: 'var(--color-bg-elevated)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                          onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
                          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUpdate(prod)}
                        disabled={saving[prod.id] || !isModified(prod)}
                        className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150"
                        style={{
                          backgroundColor: (!saving[prod.id] && isModified(prod))
                            ? '#2563eb'
                            : 'var(--color-border)',
                          color: (!saving[prod.id] && isModified(prod))
                            ? '#fff'
                            : 'var(--color-text-muted)',
                          cursor: (!saving[prod.id] && isModified(prod))
                            ? 'pointer'
                            : 'not-allowed',
                        }}
                        onMouseEnter={(e) => {
                          if (!saving[prod.id] && isModified(prod))
                            e.currentTarget.style.filter = 'brightness(1.1)'
                        }}
                        onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                      >
                        {saving[prod.id] ? 'Saving...' : 'Update'}
                      </button>
                    </td>
                  </tr>
                ))
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
            Changes apply to all locations
          </div>
        )}
      </div>
    </div>
  )
}
