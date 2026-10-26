import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'accounts', icon: '💰', label: 'Accounts' },
  { id: 'deductions', icon: '💸', label: 'Payroll' },
  { id: 'inventory', icon: '📦', label: 'Inventory' },
  { id: 'quotations', icon: '📄', label: 'Quotations' },
  { id: 'gallery', icon: '🖼️', label: 'Gallery' },
  { id: 'documents', icon: '🗂️', label: 'Documents' },
  { id: 'tasks', icon: '✅', label: 'Tasks' },
  { id: 'chat', icon: '💬', label: 'SEA Chat' },
  { id: 'leave', icon: '🏖️', label: 'Leave' },
  { id: 'vacancies', icon: '📋', label: 'Vacancies' },
  { id: 'audit', icon: '🛡️', label: 'Audit Trail' },
  { id: 'profile', icon: '👤', label: 'My Profile' },
]

export default function AdminNav({ active, setActive }) {
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      minHeight: '100vh',
      background: 'var(--navy-dark)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s',
      flexShrink: 0,
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 200,
      overflowX: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 14px' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 68,
      }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SEA" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.1 }}>SPATIAL EDGE</div>
            <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em' }}>ANALYTICS</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px 12px' : '10px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              marginBottom: 4, textAlign: 'left', fontFamily: 'var(--font)',
              background: active === item.id ? 'var(--orange)' : 'transparent',
              color: active === item.id ? '#fff' : 'rgba(255,255,255,0.65)',
              fontWeight: active === item.id ? 700 : 500,
              fontSize: 14, transition: 'all 0.15s',
              position: 'relative',
            }}
            title={collapsed ? item.label : ''}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User / Signout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {profile && !collapsed && (
          <div style={{ padding: '10px 14px', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {profile.full_name?.charAt(0) || '?'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{profile.admin_code}</div>
              </div>
            </div>
          </div>
        )}
        <button onClick={signOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: collapsed ? '10px 12px' : '10px 14px',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,100,100,0.8)',
            fontWeight: 600, fontSize: 14, fontFamily: 'var(--font)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,50,50,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}
