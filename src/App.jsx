import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PublicPage from './pages/PublicPage'
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/AdminPage'

function ProtectedAdmin() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SEA" style={{ width: 60, marginBottom: 16 }} />
        <p style={{ opacity: 0.6 }}>Loading...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/admin/login" replace />
  return <AdminPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<PublicPage />} />
          <Route path="/admin/login" element={<AdminLoginRoute />} />
          <Route path="/admin" element={<ProtectedAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function AdminLoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/admin" replace />
  return <AdminLogin />
}
