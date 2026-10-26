import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO, differenceInDays } from 'date-fns'

export default function Leave() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' })

  const load = async () => {
    setLoading(true)
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('leave_requests')
        .select('*, admin_profile:admin_profiles!admin_id(full_name,admin_code), approved_by_profile:admin_profiles!approved_by(full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('admin_profiles').select('id,full_name,admin_code'),
    ])
    setLeaves(l || [])
    setAdmins(a || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('leave_requests').insert({
      admin_id: user.id, start_date: form.start_date,
      end_date: form.end_date, reason: form.reason, status: 'PENDING',
    })
    setShowForm(false)
    setForm({ start_date: '', end_date: '', reason: '' })
    load(); setSaving(false)
  }

  const updateStatus = async (leave, status) => {
    if (leave.admin_id === user.id) return alert("You cannot approve your own leave request.")
    await supabase.from('leave_requests').update({ status, approved_by: user.id }).eq('id', leave.id)
    load()
  }

  const myLeaves = leaves.filter(l => l.admin_id === user?.id)
  const teamLeaves = leaves.filter(l => l.admin_id !== user?.id)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Leave Requests</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Apply for leave and manage team requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Apply for Leave</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* My requests */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--navy-dark)' }}>My Leave Requests</h3>
            {myLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', color: 'var(--text-muted)' }}>
                No leave requests yet.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Start Date</th><th>End Date</th><th>Days</th><th>Reason</th><th>Status</th><th>Reviewed By</th></tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(l => (
                      <tr key={l.id}>
                        <td>{format(parseISO(l.start_date), 'dd MMM yyyy')}</td>
                        <td>{format(parseISO(l.end_date), 'dd MMM yyyy')}</td>
                        <td><strong>{differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1}</strong></td>
                        <td style={{ maxWidth: 200 }}>{l.reason}</td>
                        <td><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                        <td style={{ fontSize: 13 }}>{l.approved_by_profile?.full_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team requests */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--navy-dark)' }}>Team Leave Requests</h3>
            {teamLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', color: 'var(--text-muted)' }}>
                No team requests to review.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Team Member</th><th>Start Date</th><th>End Date</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {teamLeaves.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.admin_profile?.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.admin_profile?.admin_code}</div>
                        </td>
                        <td>{format(parseISO(l.start_date), 'dd MMM yyyy')}</td>
                        <td>{format(parseISO(l.end_date), 'dd MMM yyyy')}</td>
                        <td><strong>{differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1}</strong></td>
                        <td style={{ maxWidth: 180, fontSize: 13 }}>{l.reason}</td>
                        <td><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                        <td>
                          {l.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => updateStatus(l, 'APPROVED')} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}>Approve</button>
                              <button onClick={() => updateStatus(l, 'REJECTED')} className="btn btn-sm" style={{ background: '#fde8e8', color: '#c62828', border: 'none' }}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Apply for Leave</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" required value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input type="date" required value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} min={form.start_date || new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                {form.start_date && form.end_date && (
                  <div style={{ background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>
                    Duration: {differenceInDays(parseISO(form.end_date), parseISO(form.start_date)) + 1} day(s)
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason for leave..." rows={4} />
                </div>
                <div style={{ background: 'rgba(217,119,70,0.08)', border: '1px solid rgba(217,119,70,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--orange-mid)' }}>
                  ⚠️ Your request must be approved by another team member.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
