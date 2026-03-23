import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute   from './components/ProtectedRoute'
import Layout           from './components/layout/Layout'
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import Users            from './pages/Users'

/**
 * App — router root.
 *
 * Public routes:  /login
 * Protected routes (require auth): everything under Layout
 *
 * Post-login navigation (HU006):
 *  - admin        → /users
 *  - cajero/mesero → /dashboard
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — wrapped by Layout (Header + Sidebar) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users"     element={<Users />} />
            {/* Future module routes:
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders"    element={<Orders />} />
              <Route path="reports"   element={<Reports />} />
            */}
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
