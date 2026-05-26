import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import { Spinner } from './components/ui'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Tables from './pages/Tables'
import Users from './pages/Users'
import Revenue from './pages/Revenue'
import POS from './pages/POS'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && user && user.role !== 'admin') return <Navigate to="/" replace />
  return <AppShell>{children}</AppShell>
}

function RootRedirect() {
  const { user } = useAuthStore()
  return user?.role === 'admin' ? <Navigate to="/dashboard" replace /> : <Navigate to="/pos" replace />
}

export default function App() {
  const { token, fetchMe, loading } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
    else useAuthStore.setState({ loading: false })
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brown-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl">☕</div>
          <Spinner />
          <p className="text-brown-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><RootRedirect /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute adminOnly><Dashboard /></PrivateRoute>} />
      <Route path="/pos" element={<PrivateRoute><POS /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
      <Route path="/tables" element={<PrivateRoute><Tables /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
      <Route path="/revenue" element={<PrivateRoute adminOnly><Revenue /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
