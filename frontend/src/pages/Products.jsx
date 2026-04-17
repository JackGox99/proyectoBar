import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Products — Product Registration & Management (HU013).
 * Admin-only: register new products linked to a category.
 */
export default function Products() {
  const { user: currentUser } = useAuth()

  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [toast, setToast]           = useState('')

  // Form state
  const [name, setName]               = useState('')
  const [categoryId, setCategoryId]   = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId]     = useState(null)
  const [saving, setSaving]           = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, currentUser?.token])

  const fetchCategories = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await fetch('/api/v1/categories', {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) throw new Error('Failed to load categories')
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      setError(err.message)
    }
  }, [isAdmin, currentUser?.token])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function resetForm() {
    setName('')
    setCategoryId('')
    setDescription('')
    setEditingId(null)
  }

  function startEdit(prod) {
    setEditingId(prod.id)
    setName(prod.nombre)
    setCategoryId(String(prod.categoria_id))
    setDescription(prod.descripcion || '')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !categoryId) return
    setSaving(true)
    setError('')

    const body = JSON.stringify({
      name: name.trim(),
      category_id: Number(categoryId),
      description: description.trim(),
    })
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentUser?.token ?? ''}`,
    }

    try {
      const url = editingId
        ? `/api/v1/products/${editingId}`
        : '/api/v1/products'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers, body })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to save product')

      setToast(data.message || 'Product saved successfully')
      resetForm()
      fetchProducts()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete product')
      setToast(data.message || 'Product removed from catalog')
      setDeleteTarget(null)
      if (editingId === deleteTarget.id) resetForm()
      fetchProducts()
    } catch (err) {
      setError(err.message)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
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
          {editingId ? 'Edit Product' : 'Add New Product to Catalog'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Register and manage products linked to categories.
        </p>
      </div>

      {/* Add / Edit form */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-lg p-4"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Row 1: Product Name + Category */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                className="block text-xs font-semibold mb-1 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Heineken 330ml"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={150}
                className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div className="flex-1">
              <label
                className="block text-xs font-semibold mb-1 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: categoryId ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <label
              className="block text-xs font-semibold mb-1 uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Description (Optional)
            </label>
            <textarea
              placeholder="Brief product details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150 resize-none"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Row 3: Buttons */}
          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !name.trim() || !categoryId}
              className="px-5 py-2 rounded-md font-semibold text-sm transition-colors duration-150"
              style={{
                backgroundColor: saving ? 'var(--color-border)' : '#2563eb',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.filter = 'brightness(1.1)' }}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              {editingId
                ? (saving ? 'Saving...' : 'Save Product')
                : (saving ? 'Saving...' : 'Save Product')}
            </button>
          </div>
        </div>
      </form>

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

      {/* Products table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['ID', 'Product Name', 'Category', 'Description', 'Actions'].map((col) => (
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
                  <td colSpan={5} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    No products found. Add one above.
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
                    <td className="px-4 py-3 font-mono text-xs"
                      style={{ color: 'var(--color-text-muted)' }}>
                      {String(prod.id).padStart(2, '0')}
                    </td>
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
                    <td className="px-4 py-3"
                      style={{ color: prod.descripcion ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {prod.descripcion || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(prod)}
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150"
                          style={{
                            backgroundColor: 'rgba(37,99,235,0.12)',
                            color: '#2563eb',
                            border: '1px solid rgba(37,99,235,0.3)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.25)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.12)')}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(prod)}
                          aria-label={`Delete ${prod.nombre}`}
                          title="Delete product"
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150"
                          style={{
                            backgroundColor: 'rgba(239,83,80,0.12)',
                            color: 'var(--color-error)',
                            border: '1px solid rgba(239,83,80,0.3)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,83,80,0.25)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,83,80,0.12)')}
                        >
                          🗑️
                        </button>
                      </div>
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
            {products.length} product{products.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Delete Product
            </h2>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Are you sure you want to remove{' '}
              <strong>{deleteTarget.nombre}</strong> from the catalog?
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Warning: This action will hide the product from all locations and menus.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                No, Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150"
                style={{
                  backgroundColor: deleting ? 'var(--color-border)' : 'var(--color-error)',
                  color: '#fff',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
