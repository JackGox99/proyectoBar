import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import CreateUserModal from '../components/users/CreateUserModal'
import EditUserModal from '../components/users/EditUserModal'

// Map Spanish roles to English display labels
const ROLE_LABELS = {
  admin:   'Admin',
  cajero:  'Cashier',
  mesero:  'Waiter',
}

// Badge style per role
const ROLE_BADGE = {
  admin:  { bg: 'rgba(212,150,26,0.15)', color: 'var(--color-brand-primary)' },
  cajero: { bg: 'rgba(76,175,80,0.15)',  color: 'var(--color-success)' },
  mesero: { bg: 'rgba(224,112,48,0.15)', color: 'var(--color-accent)' },
}

/**
 * Users — User Management List (HU007) + Create New User (HU008).
 * Only accessible by admin role; others see "Access Denied".
 */
export default function Users() {
  const { user: currentUser } = useAuth()

  const [users,    setUsers]    = useState([])
  const [search,   setSearch]   = useState('')
  const [sortBy,   setSortBy]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser,      setEditUser]      = useState(null)
  const [deactivateUser, setDeactivateUser] = useState(null)
  const [deactivating,   setDeactivating]   = useState(false)
  const [toast,          setToast]          = useState('')

  // Security: block non-admin users on the frontend
  const isAdmin = currentUser?.rol === 'admin'

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const url = sortBy ? `/api/v1/users?sort_by=${sortBy}` : '/api/v1/users'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, currentUser?.token, sortBy])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Auto-dismiss the success toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function handleDeactivate() {
    if (!deactivateUser) return
    setDeactivating(true)
    try {
      const res = await fetch(`/api/v1/users/${deactivateUser.id}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to deactivate user')
      }
      setToast('User deactivated successfully')
      setDeactivateUser(null)
      fetchUsers()
    } catch (err) {
      setError(err.message)
      setDeactivateUser(null)
    } finally {
      setDeactivating(false)
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

  // Filter by name or username (case-insensitive)
  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Success toast (HU008) */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium shadow-lg"
          style={{
            backgroundColor: 'var(--color-success)',
            color:           '#fff',
          }}
        >
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            User Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            All registered staff members and their assignments.
          </p>
        </div>

        {/* Add New User button */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm
                     transition-colors duration-150 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          onClick={() => setModalOpen(true)}
        >
          + Add New User
        </button>
      </div>

      {/* Search bar + Sort selector */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border:          '1px solid var(--color-border)',
            color:           'var(--color-text-primary)',
          }}
          onFocus={(e)  => (e.target.style.borderColor = 'var(--color-brand-primary)')}
          onBlur={(e)   => (e.target.style.borderColor = 'var(--color-border)')}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-md text-sm outline-none transition-colors duration-150"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border:          '1px solid var(--color-border)',
            color:           'var(--color-text-primary)',
          }}
        >
          <option value="">Sort: Default</option>
          <option value="username">Sort by Username (QuickSort)</option>
          <option value="nombre">Sort by Full Name (MergeSort)</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'rgba(239,83,80,0.12)',
            border:          '1px solid var(--color-error)',
            color:           'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Table card */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* Horizontal scroll wrapper for mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['ID', 'Username', 'Full Name', 'Role', 'Location', 'Status', 'Actions'].map((col) => (
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
                  <td colSpan={7} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      backgroundColor: idx % 2 === 0
                        ? 'var(--color-bg-surface)'
                        : 'var(--color-bg-elevated)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 font-mono text-xs"
                      style={{ color: 'var(--color-text-muted)' }}>
                      {String(u.id).padStart(2, '0')}
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {u.username ?? '—'}
                    </td>

                    {/* Full Name */}
                    <td className="px-4 py-3"
                      style={{ color: 'var(--color-text-primary)' }}>
                      {u.nombre}
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={ROLE_BADGE[u.rol] ?? {
                          backgroundColor: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {ROLE_LABELS[u.rol] ?? u.rol}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3"
                      style={{ color: u.sede ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {u.sede ? u.sede.nombre : '—'}
                    </td>

                    {/* Status (HU011) */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={u.activo
                          ? { backgroundColor: 'rgba(76,175,80,0.15)', color: 'var(--color-success)' }
                          : { backgroundColor: 'rgba(239,83,80,0.15)', color: 'var(--color-error)' }
                        }
                      >
                        {u.activo ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions (HU009 / HU011) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditUser(u)}
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150"
                          style={{
                            backgroundColor: 'rgba(37,99,235,0.12)',
                            color:           '#2563eb',
                            border:          '1px solid rgba(37,99,235,0.3)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.25)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.12)')}
                        >
                          Edit
                        </button>
                        {u.activo && (
                          <button
                            onClick={() => setDeactivateUser(u)}
                            className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150"
                            style={{
                              backgroundColor: 'rgba(239,83,80,0.12)',
                              color:           'var(--color-error)',
                              border:          '1px solid rgba(239,83,80,0.3)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,83,80,0.25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,83,80,0.12)')}
                            title="Deactivate user"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer: total count */}
        {!loading && !error && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              color:           'var(--color-text-muted)',
              borderTop:       '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
          >
            {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create user modal (HU008) */}
      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setToast('User created successfully')
          fetchUsers()
        }}
      />

      {/* Edit user permissions modal (HU009) */}
      <EditUserModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={() => {
          setToast('User permissions updated successfully')
          fetchUsers()
        }}
      />

      {/* Deactivate confirmation modal (HU011) */}
      {deactivateUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDeactivateUser(null)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border:          '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Deactivate User
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              You are about to deactivate <strong style={{ color: 'var(--color-text-primary)' }}>{deactivateUser.username}</strong>.
              This user will no longer be able to access the system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivateUser(null)}
                disabled={deactivating}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  color:           'var(--color-text-primary)',
                  border:          '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150"
                style={{
                  backgroundColor: deactivating ? 'var(--color-border)' : 'var(--color-error)',
                  color:           '#fff',
                  cursor:          deactivating ? 'not-allowed' : 'pointer',
                }}
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
