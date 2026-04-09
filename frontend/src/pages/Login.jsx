import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Login — full-page centered login card (HU006).
 *
 * Behavior after successful login:
 *  - admin   → /users  (user management panel)
 *  - cajero / mesero → /dashboard (venue panel)
 */
export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/v1/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError('Invalid username or password')
        return
      }

      login(data)

      // Navigate based on role (HU006)
      if (data.rol === 'admin') {
        navigate('/users', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      {/* Login card */}
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border:          '1px solid var(--color-border)',
        }}
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          >
            <span className="text-2xl font-bold" style={{ color: 'var(--color-brand-dark)' }}>
              B
            </span>
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-center text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Bar Inventory System
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Login
        </p>

        {/* Error message */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(239, 83, 80, 0.12)',
              border:          '1px solid var(--color-error)',
              color:           'var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border:          '1px solid var(--color-border)',
                color:           'var(--color-text-primary)',
              }}
              onFocus={(e)  => (e.target.style.borderColor = 'var(--color-brand-primary)')}
              onBlur={(e)   => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border:          '1px solid var(--color-border)',
                color:           'var(--color-text-primary)',
              }}
              onFocus={(e)  => (e.target.style.borderColor = 'var(--color-brand-primary)')}
              onBlur={(e)   => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md font-semibold text-sm transition-all duration-150"
            style={{
              backgroundColor: loading ? 'var(--color-border)' : 'var(--color-brand-primary)',
              color:           'var(--color-brand-dark)',
              cursor:          loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Language: English&nbsp;&nbsp;|&nbsp;&nbsp;Optimized for Chrome
      </p>
    </div>
  )
}
