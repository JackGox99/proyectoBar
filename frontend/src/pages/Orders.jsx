import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API = '/api/v1'

/**
 * Orders — Orders Dashboard (HU021) + Add Item with stock validation (HU023).
 * Mesero: crea pedidos para su sede, agrega items con validación de stock, cancela los propios.
 * Admin:  ídem pero elige sede al crear y puede cancelar cualquier pedido.
 */
export default function Orders() {
  const { user: currentUser } = useAuth()
  const isWaiter = currentUser?.rol === 'mesero'
  const isAdmin  = currentUser?.rol === 'admin'
  const canView  = isWaiter || isAdmin

  const [orders, setOrders]           = useState([])
  const [venues, setVenues]           = useState([])
  const [venueName, setVenueName]     = useState('')
  const [adminVenueId, setAdminVenueId] = useState('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [creating, setCreating]       = useState(false)
  const [toast, setToast]             = useState('')

  // Add Item modal state
  const [addItemOrder, setAddItemOrder] = useState(null) // order object | null

  const authHeaders = { Authorization: `Bearer ${currentUser?.token ?? ''}` }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/orders`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load orders')
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.token])

  useEffect(() => {
    fetch(`${API}/venues`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        setVenues(data)
        if (currentUser?.sede_id) {
          const v = data.find(v => v.id === currentUser.sede_id)
          if (v) setVenueName(v.nombre)
        }
      })
      .catch(() => {})
  }, [currentUser?.sede_id])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--color-text-muted)' }}>Access restricted to waiters and admins.</p>
      </div>
    )
  }

  async function handleCreate() {
    if (isAdmin && !adminVenueId) {
      setError('Please select a location before creating an order.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const body = isAdmin ? JSON.stringify({ venue_id: Number(adminVenueId) }) : undefined
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: isAdmin ? { ...authHeaders, 'Content-Type': 'application/json' } : authHeaders,
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      setOrders(prev => [data, ...prev])
      setToast(`Order #${data.id} opened successfully`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleCancel(orderId) {
    setError('')
    try {
      const res = await fetch(`${API}/orders/${orderId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order')
      setOrders(prev => prev.filter(o => o.id !== orderId))
      setToast(`Order #${orderId} cancelled`)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleItemAdded(orderId) {
    setToast(`Item added to Order #${orderId}`)
    setAddItemOrder(null)
  }

  const openOrders = orders.filter(o => o.estado === 'abierto')
  const headerTitle = venueName ? `Orders Dashboard — ${venueName}` : 'Orders Dashboard'

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
          style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
        >
          {toast}
        </div>
      )}

      {/* Add Item Modal */}
      {addItemOrder && (
        <AddItemModal
          order={addItemOrder}
          authHeaders={authHeaders}
          onSuccess={() => handleItemAdded(addItemOrder.id)}
          onClose={() => setAddItemOrder(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {headerTitle}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {openOrders.length} open order{openOrders.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 items-center">
            <select
              value={adminVenueId}
              onChange={e => setAdminVenueId(e.target.value)}
              className="input-field text-sm"
              style={{ minWidth: '160px' }}
            >
              <option value="">Select location…</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !adminVenueId}
              className="btn-primary px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-opacity"
            >
              {creating ? 'Opening…' : '+ Create New Order'}
            </button>
          </div>
        )}

        {isWaiter && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary px-6 py-3 text-base font-semibold rounded-lg disabled:opacity-60 transition-opacity"
          >
            {creating ? 'Opening…' : '+ Create New Order'}
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span style={{ color: 'var(--color-text-muted)' }}>Loading orders…</span>
        </div>
      ) : openOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🧾</span>
          <p style={{ color: 'var(--color-text-muted)' }}>
            No open orders. Hit "+ Create New Order" to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={handleCancel}
              onAddItem={() => setAddItemOrder(order)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, onCancel, onAddItem }) {
  const started    = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const waiterName = order.usuario?.nombre ?? order.usuario?.username ?? '—'

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Order #{order.id}
        </span>
        <span
          className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}
        >
          OPEN
        </span>
      </div>

      <div className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Waiter:</span>{' '}
          {waiterName}
        </span>
        <span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Time Started:</span>{' '}
          {started}
        </span>
        {order.sede && (
          <span>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Location:</span>{' '}
            {order.sede.nombre}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-2 flex flex-col gap-2">
        <button
          onClick={onAddItem}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
          style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          + Add Item
        </button>
        <button
          onClick={() => onCancel(order.id)}
          className="w-full py-2 rounded-lg text-sm font-semibold border transition-colors duration-150"
          style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#dc2626'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#dc2626'
          }}
        >
          Cancel Order
        </button>
      </div>
    </div>
  )
}

// ─── AddItemModal ─────────────────────────────────────────────────────────────

function AddItemModal({ order, authHeaders, onSuccess, onClose }) {
  const [inventory, setInventory] = useState([])
  const [loadingInv, setLoadingInv] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity]     = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Fetch inventory for the order's venue.
  useEffect(() => {
    setLoadingInv(true)
    fetch(`${API}/inventory?venue_id=${order.sede_id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => setInventory(Array.isArray(data) ? data : []))
      .catch(() => setInventory([]))
      .finally(() => setLoadingInv(false))
  }, [order.sede_id])

  const selectedItem = inventory.find(i => String(i.producto_id) === String(selectedId))
  const available    = selectedItem?.stock_actual ?? null

  const qty            = parseInt(quantity, 10)
  const qtyValid       = !isNaN(qty) && qty > 0
  const stockOk        = available === null || (qtyValid && qty <= available)
  const canSubmit      = selectedId && qtyValid && stockOk && !submitting

  // Inline validation message
  let stockMsg = ''
  if (selectedItem && available === 0) {
    stockMsg = 'Out of stock at this location.'
  } else if (selectedItem && qtyValid && !stockOk) {
    stockMsg = `Insufficient stock. Current availability: ${available} unit${available !== 1 ? 's' : ''}.`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API}/orders/${order.id}/items`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(selectedId),
          cantidad:   qty,
          notas:      notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add item')
      onSuccess()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Add Item — Order #{order.id}
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loadingInv ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading products…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Product selector */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Product
              </label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setQuantity(''); setSubmitError('') }}
                className="input-field w-full"
                required
              >
                <option value="">Select a product…</option>
                {inventory.map(inv => (
                  <option
                    key={inv.producto_id}
                    value={inv.producto_id}
                    disabled={inv.stock_actual === 0}
                  >
                    {inv.producto?.nombre ?? `Product #${inv.producto_id}`}
                    {' — '}
                    {inv.stock_actual === 0 ? 'Out of Stock' : `Available: ${inv.stock_actual}`}
                  </option>
                ))}
              </select>

              {/* Available counter shown below selector */}
              {selectedItem && available > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Available: <span className="font-semibold">{available}</span> unit{available !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Quantity input */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max={available ?? undefined}
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setSubmitError('') }}
                className="input-field w-full"
                style={stockMsg ? { borderColor: '#dc2626' } : {}}
                placeholder="e.g. 2"
                disabled={!selectedId || available === 0}
                required
              />
              {/* Stock validation message */}
              {stockMsg && (
                <p className="text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>
                  {stockMsg}
                </p>
              )}
            </div>

            {/* Notes (optional) */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-field w-full"
                placeholder="e.g. no ice"
              />
            </div>

            {/* Server error */}
            {submitError && (
              <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
                {submitError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
              >
                {submitting ? 'Adding…' : 'Add to Order'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
