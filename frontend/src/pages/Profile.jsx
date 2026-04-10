import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  admin:  'Administrator',
  cajero: 'Cashier',
  mesero: 'Waiter',
}

/**
 * Profile — HU010: User Profile Management.
 *
 * Allows any authenticated user to change their own password.
 * Displays read-only user info (username, role) and a password change form.
 */
export default function Profile() {
  const { user } = useAuth()

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors,     setErrors]     = useState({})
  const [serverErr,  setServerErr]  = useState('')
  const [success,    setSuccess]    = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSuccess('')
  }

  function validate() {
    const next = {}
    if (!form.newPassword) {
      next.newPassword = 'New password is required'
    } else if (form.newPassword.length < 8) {
      next.newPassword = 'Password must be at least 8 characters long'
    }
    if (!form.confirmPassword) {
      next.confirmPassword = 'Please confirm your password'
    } else if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerErr('')
    setSuccess('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${user?.token ?? ''}`,
        },
        body: JSON.stringify({
          new_password:     form.newPassword,
          confirm_password: form.confirmPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerErr(data.error || 'Could not update password')
        return
      }
      setSuccess(data.message || 'Password updated successfully')
      setForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      setServerErr(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center">
      <div
        className="w-full max-w-lg rounded-xl p-6 sm:p-8"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border:          '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          My Profile Settings
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Manage your account credentials.
        </p>

        {/* Read-only user info */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border:          '1px solid var(--color-border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Username
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {user?.username ?? '—'}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Role
              </p>
              <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
                {ROLE_LABELS[user?.rol] ?? user?.rol ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div
            className="mb-4 px-4 py-3 rounded-md text-sm font-medium"
            style={{
              backgroundColor: 'rgba(76,175,80,0.12)',
              border:          '1px solid var(--color-success)',
              color:           'var(--color-success)',
            }}
          >
            {success}
          </div>
        )}

        {/* Server error */}
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

        {/* Password change form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="mb-4">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={form.newPassword}
              onChange={(e) => update('newPassword', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border:          errors.newPassword
                  ? '1px solid var(--color-error)'
                  : '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => { if (!errors.newPassword) e.target.style.borderColor = 'var(--color-brand-primary)' }}
              onBlur={(e)  => { if (!errors.newPassword) e.target.style.borderColor = 'var(--color-border)' }}
            />
            {errors.newPassword && <FieldError message={errors.newPassword} />}
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border:          errors.confirmPassword
                  ? '1px solid var(--color-error)'
                  : '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => { if (!errors.confirmPassword) e.target.style.borderColor = 'var(--color-brand-primary)' }}
              onBlur={(e)  => { if (!errors.confirmPassword) e.target.style.borderColor = 'var(--color-border)' }}
            />
            {errors.confirmPassword && <FieldError message={errors.confirmPassword} />}
          </div>

          {/* Hint */}
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Passwords must be at least 8 characters long.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md font-semibold text-sm transition-colors duration-150"
            style={{
              backgroundColor: submitting ? 'var(--color-border)' : 'var(--color-success)',
              color:           '#fff',
              cursor:          submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Change Password'}
          </button>
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
