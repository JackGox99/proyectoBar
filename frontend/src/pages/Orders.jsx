import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API = '/api/v1'

function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/**
 * Orders — HU021 (open/cancel orders) + HU023 (add item / stock validation)
 *          + HU024 (order summary: item list, remove item, grand total).
 */
export default function Orders() {
  const { user: currentUser } = useAuth()
  const isWaiter  = currentUser?.rol === 'mesero'
  const isAdmin   = currentUser?.rol === 'admin'
  const isCashier = currentUser?.rol === 'cajero'
  const canView     = isWaiter || isAdmin || isCashier
  const canPay      = isAdmin || isCashier
  const canAddItems = isAdmin || isWaiter

  const [orders, setOrders]             = useState([])
  const [venues, setVenues]             = useState([])
  const [venueName, setVenueName]       = useState('')
  const [adminVenueId, setAdminVenueId] = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [creating, setCreating]         = useState(false)
  const [toast, setToast]               = useState('')

  // Modal state
  const [summaryOrderId, setSummaryOrderId]       = useState(null)  // HU024
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0)
  const [addItemOrder, setAddItemOrder]           = useState(null)  // HU023
  const [checkoutOrder, setCheckoutOrder]         = useState(null)  // HU025

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
      if (summaryOrderId === orderId) setSummaryOrderId(null)
      setToast(`Order #${orderId} cancelled`)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleItemAdded(orderId) {
    setToast(`Item added to Order #${orderId}`)
    setAddItemOrder(null)
    setSummaryRefreshKey(k => k + 1)
    fetchOrders()
  }

  function handleItemRemoved(orderId) {
    setToast(`Item removed from Order #${orderId}`)
    fetchOrders()
  }

  function handleGoToPayment(order) {
    setSummaryOrderId(null)
    setCheckoutOrder(order)
  }

  function handlePaymentSuccess(orderId) {
    setCheckoutOrder(null)
    setOrders(prev => prev.filter(o => o.id !== orderId))
    setToast(`Payment processed for Order #${orderId}`)
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

      {/* Order Summary Modal (HU024) */}
      {summaryOrderId && (
        <OrderSummaryModal
          key={summaryOrderId}
          orderId={summaryOrderId}
          authHeaders={authHeaders}
          refreshKey={summaryRefreshKey}
          canPay={canPay}
          onAddMore={() => {
            const order = orders.find(o => o.id === summaryOrderId)
            if (order) setAddItemOrder(order)
          }}
          onGoToPayment={handleGoToPayment}
          onItemRemoved={() => handleItemRemoved(summaryOrderId)}
          onClose={() => setSummaryOrderId(null)}
        />
      )}

      {/* Checkout Modal (HU025) */}
      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          authHeaders={authHeaders}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutOrder(null)}
        />
      )}

      {/* Add Item Modal (HU023) */}
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
              canAddItems={canAddItems}
              onCancel={handleCancel}
              onAddItem={() => setAddItemOrder(order)}
              onViewSummary={() => setSummaryOrderId(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, canAddItems, onCancel, onAddItem, onViewSummary }) {
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
          onClick={onViewSummary}
          className="w-full py-2 rounded-lg text-sm font-semibold border transition-colors duration-150"
          style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', backgroundColor: 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--color-brand-primary)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--color-brand-primary)'
          }}
        >
          View Summary
        </button>
        {canAddItems && (
          <button
            onClick={onAddItem}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + Add Item
          </button>
        )}
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

// ─── OrderSummaryModal (HU024) ────────────────────────────────────────────────

function OrderSummaryModal({ orderId, authHeaders, refreshKey, canPay, onAddMore, onGoToPayment, onItemRemoved, onClose }) {
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`${API}/orders/${orderId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setOrder(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [orderId, refreshKey])

  const items    = order?.items ?? []
  const isOpen   = order?.estado === 'abierto'
  const grandTotal = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0)

  async function handleRemove(itemId) {
    setRemoving(itemId)
    setError('')
    try {
      const res = await fetch(`${API}/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove item')
      setOrder(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }))
      onItemRemoved()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-2xl rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Order Summary — #{orderId}
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

        {loading ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : error ? (
          <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
        ) : order && (
          <>
            {/* Order meta */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Waiter: </span>
                {order.usuario?.nombre ?? order.usuario?.username ?? '—'}
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Location: </span>
                {order.sede?.nombre ?? '—'}
              </span>
            </div>

            {/* Items table */}
            {items.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                No items yet. Use "Add More Items" to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Product</th>
                      <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Quantity</th>
                      <th className="text-right px-4 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Unit Price</th>
                      <th className="text-right px-4 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Subtotal</th>
                      {isOpen && <th className="px-4 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{ borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none' }}
                      >
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>
                          {item.producto?.nombre ?? `Product #${item.producto_id}`}
                          {item.notas && (
                            <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {item.notas}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: 'var(--color-text-primary)' }}>
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-primary)' }}>
                          {formatCurrency(item.precio_unitario)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {formatCurrency(item.precio_unitario * item.cantidad)}
                        </td>
                        {isOpen && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemove(item.id)}
                              disabled={removing === item.id}
                              className="text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-40"
                              style={{ color: '#dc2626', border: '1px solid #dc2626', backgroundColor: 'transparent' }}
                              onMouseEnter={e => {
                                if (removing !== item.id) {
                                  e.currentTarget.style.backgroundColor = '#dc2626'
                                  e.currentTarget.style.color = '#fff'
                                }
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = '#dc2626'
                              }}
                            >
                              {removing === item.id ? '…' : 'Remove'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grand Total */}
            <div
              className="flex justify-end items-center gap-3 pt-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Total Amount:
              </span>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* Remove error */}
            {error && (
              <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onAddMore}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-alt)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Add More Items
              </button>
              <button
                onClick={() => canPay && onGoToPayment(order)}
                disabled={!canPay || items.length === 0}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#16a34a', color: '#fff', cursor: canPay && items.length > 0 ? 'pointer' : 'not-allowed' }}
                title={!canPay ? 'Only cashiers and admins can process payments' : items.length === 0 ? 'Add items before paying' : 'Process payment'}
              >
                Go to Payment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── CheckoutModal (HU025) ───────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: 'efectivo',        label: 'Cash' },
  { key: 'tarjeta_debito',  label: 'Debit Card' },
  { key: 'tarjeta_credito', label: 'Credit Card' },
]

const METHOD_LABEL = {
  efectivo:        'Cash',
  tarjeta_debito:  'Debit Card',
  tarjeta_credito: 'Credit Card',
}

function CheckoutModal({ order, authHeaders, onSuccess, onClose }) {
  const [method, setMethod]           = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [paymentData, setPaymentData] = useState(null)

  const items      = order?.items ?? []
  const grandTotal = items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)

  async function handleFinalize() {
    if (!method || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/orders/${order.id}/finalize`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodo_pago: method }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Payment failed')
      setPaymentData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── HU027: Success confirmation screen ──────────────────────────────────────
  if (paymentData) {
    const fecha = paymentData.fecha
      ? new Date(paymentData.fecha).toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
      : '—'

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <div
          className="w-full max-w-sm rounded-xl overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Green header */}
          <div className="flex flex-col items-center gap-2 px-8 py-7" style={{ backgroundColor: '#16a34a' }}>
            <div className="text-5xl font-bold text-white">✓</div>
            <h2 className="text-lg font-bold text-white text-center">Success! Payment Received.</h2>
            <p className="text-white/80 text-sm text-center">Transaction Completed Successfully</p>
          </div>

          {/* Details box */}
          <div className="flex flex-col gap-3 px-6 py-5">
            {[
              { label: 'Order',   value: `#${order.id}` },
              { label: 'Total',   value: formatCurrency(paymentData.total ?? grandTotal) },
              { label: 'Method',  value: METHOD_LABEL[paymentData.metodo_pago] ?? paymentData.metodo_pago },
              { label: 'Date',    value: fecha },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          <div className="px-6 pb-6">
            <button
              onClick={() => onSuccess(order.id)}
              className="w-full py-3 rounded-lg text-sm font-bold"
              style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Checkout — Order #{order.id}
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

        {/* Total */}
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Total to Pay
          </span>
          <span className="text-2xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>
            {formatCurrency(grandTotal)}
          </span>
        </div>

        {/* Payment method selection */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Select Payment Method
          </p>
          {PAYMENT_METHODS.map(({ key, label }) => {
            const selected = method === key
            return (
              <button
                key={key}
                onClick={() => { setMethod(key); setError('') }}
                className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-left transition-all duration-150"
                style={{
                  border: `2px solid ${selected ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                  backgroundColor: selected ? 'var(--color-brand-primary)' : 'transparent',
                  color: selected ? '#fff' : 'var(--color-text-primary)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
        )}

        {/* Finalize */}
        <button
          onClick={handleFinalize}
          disabled={!method || submitting}
          className="w-full py-3 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#16a34a', color: '#fff', cursor: method && !submitting ? 'pointer' : 'not-allowed' }}
        >
          {submitting ? 'Processing…' : 'Finalize Transaction'}
        </button>
      </div>
    </div>
  )
}

// ─── AddItemModal (HU023) ─────────────────────────────────────────────────────

function AddItemModal({ order, authHeaders, onSuccess, onClose }) {
  const [inventory, setInventory] = useState([])
  const [loadingInv, setLoadingInv] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity]     = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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

  const qty       = parseInt(quantity, 10)
  const qtyValid  = !isNaN(qty) && qty > 0
  const stockOk   = available === null || (qtyValid && qty <= available)
  const canSubmit = selectedId && qtyValid && stockOk && !submitting

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
        body: JSON.stringify({ product_id: Number(selectedId), cantidad: qty, notas: notes }),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
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
                  <option key={inv.producto_id} value={inv.producto_id} disabled={inv.stock_actual === 0}>
                    {inv.producto?.nombre ?? `Product #${inv.producto_id}`}
                    {' — '}
                    {inv.stock_actual === 0 ? 'Out of Stock' : `Available: ${inv.stock_actual}`}
                  </option>
                ))}
              </select>
              {selectedItem && available > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Available: <span className="font-semibold">{available}</span> unit{available !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Quantity
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={e => { setQuantity(e.target.value.replace(/[^\d]/g, '')); setSubmitError('') }}
                onKeyDown={e => {
                  const passThrough = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter']
                  if (!passThrough.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault()
                }}
                onPaste={e => {
                  const text = e.clipboardData.getData('text')
                  if (!/^\d+$/.test(text.trim())) e.preventDefault()
                }}
                className="input-field w-full"
                style={stockMsg ? { borderColor: '#dc2626' } : {}}
                placeholder="e.g. 2"
                disabled={!selectedId || available === 0}
                required
              />
              {stockMsg && (
                <p className="text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{stockMsg}</p>
              )}
            </div>

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

            {submitError && (
              <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{submitError}</p>
            )}

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
