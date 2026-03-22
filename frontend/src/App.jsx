import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'

/**
 * App — router root.
 * All protected routes are wrapped by Layout (Header + Sidebar + main area).
 * Future routes (inventory, orders, users, reports) are added inside Layout's Routes.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          {/* Future module routes go here:
            <Route path="inventory"  element={<Inventory />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="users"      element={<Users />} />
            <Route path="reports"    element={<Reports />} />
          */}
        </Route>

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
