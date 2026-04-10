import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/**
 * EditUserModal — HU009: Role and Location Assignment.
 *
 * Responsive modal with an English-only form. Lets an administrator change the
 * role and/or location of an existing user. Performs client-side validation of
 * the role/location rule (admin must NOT have a location; cashier/waiter MUST
 * have one) and delegates the update to PUT /api/v1/users/{id}.
 *
 * Props:
 *  - open:      boolean
 *  - onClose:   () => void
 *  - user:      the user object being edited (must include id, nombre, rol, sede_id)
 *  - onUpdated: (updatedUser) => void — called after a successful update
 */
export default function EditUserModal({ open, onClose, user, onUpdated }) {
  const { user: currentUser } = useAuth()

  const [venues, setVenues] = useState([])
  const [form, setForm] = useState({ role: '', sedeId: '' })
  const [errors,     setErrors]     = useState({})
  const [serverErr,  setServerErr]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Prefill the form with the current user's values whenever the modal opens.
  useEffect(() => {
    if (open && user) {
      setForm({
        role:   user.rol ?? '',
        sedeId: user.sede_id != null ? String(user.sede_id) : '',
      })
      setErrors({})
      setServerErr('')
    }
  }, [open, user])

  // Load venues for the Location selector.
  useEffect(() => {
    if (!open) return
    async function loadVenues() {
      try {
        const res = await fetch('/api/v1/venues', {
          headers: { Authorization: `Bearer ${currentUser?.token ?? ''}` },
        })
        if (!res.ok) throw new Error('Failed to load locations')
        setVenues(await res.json())
      } catch (err) {
        setServerErr(err.message)
      }
    }
    loadVenues()
  }, [open, currentUser?.token])

  const needsLocation = form.role === 'cajero' || form.role === 'mesero'

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.role) next.role = 'Role is required'
    if (needsLocation && !form.sedeId) {
      next.sedeId = 'Location is required for Cashier and Waiter'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerErr('')
    if (!user || !validate()) return

    setSubmitting(true)
    try {
      const payload = {
        role:    form.role,
        sede_id: needsLocation ? Number(form.sedeId) : null,
      }
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${currentUser?.token ?? ''}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerErr(data.error || 'Could not update user')
        return
      }
      onUpdated?.(data.user ?? data)
      onClose?.()
    } catch (err) {
      setServerErr(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !user) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 sm:p-8 max-h-full overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border:          '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Edit User Permissions
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
          Editing: <span style={{ color: 'var(--color-text-primary)' }}>{user.nombre}</span>
        </p>

        {serverErr && (
          <div
            className="mb-4 px-4 py-3 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(239,83,80,0.12)',
              border:          '1px solid var(--color-error)',
              color:           'var(--color-error)',
            }}
          >
            {serverErr}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="mb-4">
            <label
              htmlFor="edit-role"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Role
            </label>
            <select
              id="edit-role"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border:          '1px solid var(--color-border)',
                color:           'var(--color-text-primary)',
              }}
            >
              <option value="">-- Select a role --</option>
              <option value="admin">Admin</option>
              <option value="cajero">Cashier</option>
              <option value="mesero">Waiter</option>
            </select>
            {errors.role && <FieldError message={errors.role} />}
          </div>

          {/* Location selector (only for Cashier/Waiter) */}
          {needsLocation && (
            <div className="mb-4">
              <label
                htmlFor="edit-sedeId"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Location
              </label>
              <select
                id="edit-sedeId"
                value={form.sedeId}
                onChange={(e) => update('sedeId', e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border:          '1px solid var(--color-border)',
                  color:           'var(--color-text-primary)',
                }}
              >
                <option value="">-- Select a location --</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
              {errors.sedeId && <FieldError message={errors.sedeId} />}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-3 mt-6 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-md font-semibold text-sm transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                color:           'var(--color-text-primary)',
                border:          '1px solid var(--color-border)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-md font-semibold text-sm transition-colors duration-150"
              style={{
                backgroundColor: submitting ? 'var(--color-border)' : '#2563eb',
                color:           '#fff',
                cursor:          submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Update Assignments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldError({ message }) {
  return (
    <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
      {message}
    </p>
  )
}
