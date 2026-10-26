import React, { useState } from 'react'
import AdminNav from '../components/admin/AdminNav'
import Dashboard from '../components/admin/Dashboard'
import Accounts from '../components/admin/Accounts'
import Deductions from '../components/admin/Deductions'
import Inventory from '../components/admin/Inventory'
import Quotations from '../components/admin/Quotations'
import Gallery from '../components/admin/Gallery'
import Documents from '../components/admin/Documents'
import Chat from '../components/admin/Chat'
import Tasks from '../components/admin/Tasks'
import Leave from '../components/admin/Leave'
import Vacancies from '../components/admin/Vacancies'
import Profile from '../components/admin/Profile'
import AuditTrail from '../components/admin/AuditTrail'
import { useAuth } from '../contexts/AuthContext'

const COMPONENTS = {
  dashboard: Dashboard,
  accounts: Accounts,
  deductions: Deductions,
  inventory: Inventory,
  quotations: Quotations,
  gallery: Gallery,
  documents: Documents,
  chat: Chat,
  tasks: Tasks,
  leave: Leave,
  vacancies: Vacancies,
  audit: AuditTrail,
  profile: Profile,
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { profile } = useAuth()
  const ActiveComponent = COMPONENTS[activeTab] || Dashboard

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-light)', fontFamily: 'var(--font)' }}>
      <AdminNav active={activeTab} setActive={setActiveTab} />

      {/* Main content — offset by sidebar width */}
      <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh', transition: 'margin-left 0.25s' }}>
        {/* Top bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid var(--border)',
          padding: '0 32px', height: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-light)', padding: '6px 14px', borderRadius: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {profile.full_name?.charAt(0)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{profile.full_name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({profile.admin_code})</span>
              </div>
            )}
            <a href={import.meta.env.BASE_URL} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 20, background: 'var(--bg-light)', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--orange)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
              ← Public Site
            </a>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '32px' }}>
          <ActiveComponent setActive={setActiveTab} />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 64px !important; }
        }
      `}</style>
    </div>
  )
}
