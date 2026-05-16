import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API = '/api/v1'

const METHOD_LABEL = {
  efectivo:        'Cash',
  tarjeta_debito:  'Debit Card',
  tarjeta_credito: 'Credit Card',
}

function formatCurrency(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function Reports() {
  const { user } = useAuth()
  const token    = user?.token ?? ''
  const isAdmin  = user?.rol === 'admin'

  const [venues,   setVenues]   = useState([])
  const [venueId,  setVenueId]  = useState('')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [csvBusy,  setCsvBusy]  = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${API}/venues`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVenues(data) })
      .catch(() => {})
  }, [token])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (venueId) params.set('venue_id', venueId)
      if (from)    params.set('from', from)
      if (to)      params.set('to', to)

      const res  = await fetch(`${API}/reports/sales?${params}`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load report')
      setReport(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [venueId, from, to, token])

  useEffect(() => { fetchReport() }, [fetchReport])

  async function handleCSV() {
    setCsvBusy(true)
    try {
      const params = new URLSearchParams()
      if (venueId) params.set('venue_id', venueId)
      if (from)    params.set('from', from)
      if (to)      params.set('to', to)

      const res  = await fetch(`${API}/reports/sales/csv?${params}`, { headers: authHeaders })
      if (!res.ok) throw new Error('Failed to generate CSV')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'sales_report.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setCsvBusy(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--color-text-muted)' }}>Access restricted to administrators.</p>
      </div>
    )
  }

  const rows        = report?.rows        ?? []
  const topProducts = report?.top_products ?? []
  const kpis        = report?.kpis        ?? { total_revenue: 0, transaction_count: 0 }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Sales Report
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Consolidated sales and product rotation — admin only
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-opacity disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={handleCSV}
            disabled={csvBusy || rows.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
          >
            {csvBusy ? 'Generating…' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-4 items-end"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Location
          </label>
          <select
            value={venueId}
            onChange={e => setVenueId(e.target.value)}
            className="input-field text-sm"
            style={{ minWidth: '160px' }}
          >
            <option value="">All Locations</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="input-field text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="input-field text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Total Revenue',      value: formatCurrency(kpis.total_revenue),   color: 'var(--color-brand-primary)' },
          { label: 'Transaction Count',  value: kpis.transaction_count,               color: 'var(--color-accent)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-5 flex flex-col gap-2"
            style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </span>
            <span className="text-3xl font-bold" style={{ color }}>
              {loading ? '—' : value}
            </span>
          </div>
        ))}
      </div>

      {/* Top Selling Products */}
      {topProducts.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Top Selling Products
          </h2>
          <ol className="flex flex-col gap-2">
            {topProducts.map((p, i) => (
              <li key={p.producto_id} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <span className="font-bold mr-2" style={{ color: 'var(--color-text-muted)' }}>{i + 1}.</span>
                  {p.nombre}
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                  {p.total_quantity} units
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Detail table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Transaction Detail
          </h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex justify-center py-12" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>No records for the selected filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Date', 'Order', 'Code', 'Product', 'Qty', 'Sale Price', 'Purchase Cost', 'Profit', 'Location', 'Method'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const profitNegative = row.ganancia < 0
                  return (
                    <tr
                      key={`${row.order_id}-${row.producto_id}-${idx}`}
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(row.fecha)}
                      </td>
                      <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        #{row.order_id}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>
                        {row.producto_id}
                      </td>
                      <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {row.producto}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {row.cantidad_vendida}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(row.precio_venta)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>
                        {formatCurrency(row.costo_compra)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold" style={{ color: profitNegative ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(row.ganancia)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {row.sede}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {METHOD_LABEL[row.metodo_pago] ?? row.metodo_pago}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
