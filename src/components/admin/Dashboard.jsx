import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

export default function Dashboard({ setActive }) {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ ledger: 0, inventory: 0, quotations: 0, tasks: 0, pendingConfirm: 0 })
  const [recentTasks, setRecentTasks] = useState([])
  const [admins, setAdmins] = useState([])
  const [enquiries, setEnquiries] = useState([])

  const loadEnquiries = async () => {
    const { data } = await supabase.from('contact_enquiries')
      .select('*').eq('is_read', false).order('created_at', { ascending: false })
    setEnquiries(data || [])
  }

  useEffect(() => {
    Promise.all([
      supabase.from('ledger_entries').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('*', { count: 'exact', head: true }),
      supabase.from('quotations').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('ledger_entries').select('*', { count: 'exact', head: true }).eq('is_confirmed', false),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('admin_profiles').select('*'),
    ]).then(results => {
      setStats({
        ledger: results[0].count || 0,
        inventory: results[1].count || 0,
        quotations: results[2].count || 0,
        tasks: results[3].count || 0,
        pendingConfirm: results[4].count || 0,
      })
      setRecentTasks(results[5].data || [])
      setAdmins(results[6].data || [])
    })
    loadEnquiries()
  }, [])

  const markRead = async (id) => {
    await supabase.from('contact_enquiries').update({ is_read: true }).eq('id', id)
    setEnquiries(prev => prev.filter(e => e.id !== id))
  }

  const markAllRead = async () => {
    await supabase.from('contact_enquiries').update({ is_read: true }).eq('is_read', false)
    setEnquiries([])
  }

  const statCards = [
    { label: 'Ledger Entries', value: stats.ledger, icon: '💰', tab: 'accounts', color: 'var(--orange)' },
    { label: 'Inventory Items', value: stats.inventory, icon: '📦', tab: 'inventory', color: 'var(--navy)' },
    { label: 'Quotations', value: stats.quotations, icon: '📄', tab: 'quotations', color: '#2e7d32' },
    { label: 'Active Tasks', value: stats.tasks, icon: '✅', tab: 'tasks', color: '#1565c0' },
    { label: 'Awaiting Confirmation', value: stats.pendingConfirm, icon: '⏳', tab: 'accounts', color: '#f57c00', alert: true },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy-dark)' }}>
          Welcome back, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Enquiry notifications */}
      {enquiries.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1A2D42, #2B435D)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          marginBottom: 28, border: '1px solid rgba(217,119,70,0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📩</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                {enquiries.length} New Website {enquiries.length === 1 ? 'Enquiry' : 'Enquiries'}
              </span>
              <span style={{
                background: 'var(--orange)', color: '#fff',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
              }}>{enquiries.length}</span>
            </div>
            <button onClick={markAllRead} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '5px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Mark all read
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enquiries.map(eq => (
              <div key={eq.id} style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: 10,
                padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', background: 'var(--orange)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}>
                  {eq.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{eq.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {format(new Date(eq.created_at), 'dd MMM · HH:mm')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--orange)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{eq.subject}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {eq.message}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {eq.email && <span>✉ {eq.email}</span>}
                    {eq.phone && <span>📞 {eq.phone}</span>}
                  </div>
                </div>
                <button onClick={() => markRead(eq.id)} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: 'rgba(255,255,255,0.6)', borderRadius: 8,
                  padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, marginBottom: 36 }}>
        {statCards.map(s => (
          <button key={s.label} onClick={() => setActive(s.tab)}
            style={{
              background: '#fff', borderRadius: 'var(--radius-lg)', padding: '24px 20px',
              border: s.alert && s.value > 0 ? '2px solid var(--orange)' : '2px solid transparent',
              boxShadow: 'var(--shadow)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Recent Tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Recent Tasks</h3>
            <button onClick={() => setActive('tasks')} className="btn btn-outline btn-sm">View All</button>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state"><div>📋</div><p style={{ marginTop: 8 }}>No tasks yet</p></div>
          ) : recentTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, flex: 1, marginRight: 12 }}>{t.title}</div>
              <span className={`badge badge-${t.status === 'DONE' ? 'done' : t.status === 'IN PROGRESS' ? 'inprogress' : 'todo'}`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>

        {/* Team online status */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Team</h3>
            <button onClick={() => setActive('chat')} className="btn btn-outline btn-sm">Open Chat</button>
          </div>
          {admins.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--navy)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15,
                }}>
                  {a.full_name?.charAt(0)}
                </div>
                <div style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 10, height: 10, borderRadius: '50%',
                  background: a.is_online ? '#4caf50' : '#9e9e9e',
                  border: '2px solid #fff',
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.full_name}</div>
                <div style={{ fontSize: 12, color: a.is_online ? '#4caf50' : 'var(--text-muted)' }}>
                  {a.is_online ? '● Online' : '○ Offline'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{a.admin_code}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📄', label: 'New Quotation', tab: 'quotations' },
              { icon: '💰', label: 'Add Ledger Entry', tab: 'accounts' },
              { icon: '📦', label: 'Add Inventory Item', tab: 'inventory' },
              { icon: '✅', label: 'Create Task', tab: 'tasks' },
              { icon: '🗂️', label: 'Upload Document', tab: 'documents' },
            ].map(a => (
              <button key={a.label} onClick={() => setActive(a.tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: 'var(--bg-light)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
                  color: 'var(--navy-dark)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--navy-dark)' }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
