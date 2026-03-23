import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'bar_auth'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * AuthProvider — wraps the app and exposes auth state + actions.
 *
 * Stored shape in localStorage:
 * { token, nombre, rol, sede_id }
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadFromStorage())

  function login(data) {
    // data comes from POST /api/v1/auth/login response
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setUser(data)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
