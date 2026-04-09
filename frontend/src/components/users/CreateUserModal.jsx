import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/**
 * CreateUserModal — HU008: Register New Staff Member.
 *
 * Responsive modal with an English-only form. Performs client-side validation
 * (required fields + role/location rule) and delegates creation to
 * POST /api/v1/users.
 *
 * Props:
 *  - open:     boolean — whether the modal is visible
 *  - onClose:  () => void
 *  - onCreated: (user) => void — called after a successful creation
 */
export default function CreateUserModal({ open, onClose, onCreated }) {
  const { user: currentUser } = useAuth()

  const [venues, setVenues] = useState([])
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    password: '',
    role:     '',
    sedeId:   '',
  })
  const [errors,     setErrors]     = useState({})
  const [serverErr,  setServerErr]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form whenever the modal opens.
  useEffect(() => {
    if (open) {
      setForm({ username: '', fullName: '', password: '', role: '', sedeId: '' })
      setErrors({})
      setServerErr('')
    }
  }, [open])

  // Load venues for the Location selector (HU008).
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

  // Backend role values (enum).
  const needsLocation = form.role === 'cajero' || form.role === 'mesero'

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.username.trim())  next.username = 'Username is required'
    if (!form.fullName.trim())  next.fullName = 'Full name is required'
    if (!form.password)         next.password = 'Password is required'
    else if (form.password.length < 6) next.password = 'Password must be at least 6 characters'
    if (!form.role)             next.role     = 'Role is required'
    if (needsLocation && !form.sedeId) next.sedeId = 'Location is required for Cashier and Waiter'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerErr('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        username:  form.username.trim(),
        full_name: form.fullName.trim(),
        password:  form.password,
        role:      form.role,
        sede_id:   needsLocation ? Number(form.sedeId) : null,
      }
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${currentUser?.token ?? ''}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerErr(data.error || 'Could not create user')
        return
      }
      onCreated?.(data.user)
      onClose?.()
    } catch (err) {
      setServerErr(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

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
          Create New Staff Member
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
          Register a new user and assign their role and location.
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
          <Field
            id="username"
            label="Username"
            placeholder="e.g. jdoe123"
            value={form.username}
            onChange={(v) => update('username', v)}
            error={errors.username}
          />

          <Field
            id="fullName"
            label="Full Name"
            placeholder="e.g. John Doe"
            value={form.fullName}
            onChange={(v) => update('fullName', v)}
            error={errors.fullName}
          />

          <Field
            id="password"
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(v) => update('password', v)}
            error={errors.password}
          />

          {/* Role selector */}
          <div className="mb-4">
            <label
              htmlFor="role"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Role
            </label>
            <select
              id="role"
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
              <option value="admin">Administrator</option>
              <option value="cajero">Cashier</option>
              <option value="mesero">Waiter</option>
            </select>
            {errors.role && <FieldError message={errors.role} />}
          </div>

          {/* Location selector (only for Cashier/Waiter) */}
          {needsLocation && (
            <div className="mb-4">
              <label
                htmlFor="sedeId"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Location
              </label>
              <select
                id="sedeId"
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
                backgroundColor: submitting ? 'var(--color-border)' : 'var(--color-success)',
                color:           '#fff',
                cursor:          submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────── small helpers ────────────────────────────── */

function Field({ id, label, type = 'text', placeholder, value, onChange, error }) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1.5"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border:          '1px solid var(--color-border)',
          color:           'var(--color-text-primary)',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-primary)')}
        onBlur={(e)  => (e.target.style.borderColor = 'var(--color-border)')}
      />
      {error && <FieldError message={error} />}
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
