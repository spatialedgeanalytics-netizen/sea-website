import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

const DEDUCTION_TYPES = ['Salary', 'Bonus', 'Field T&S', 'Other']

export default function Deductions() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    employee_name: '', employee_code: '', type: 'Salary', amount: '', period: '', notes: '',
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('deductions')
      .select('*, entered_by_profile:admin_profiles!entered_by(full_name,admin_code), approved_by_profile:admin_profiles!approved_by(full_name,admin_code)')
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('deductions').insert({
      employee_name: form.employee_name,
      employee_code: form.employee_code || null,
      type: form.type,
      amount: parseFloat(form.amount),
      period: form.period || null,
      notes: form.notes || null,
      entered_by: user.id,
      is_approved: false,
    })
    setShowForm(false)
    setForm({ employee_name: '', employee_code: '', type: 'Salary', amount: '', period: '', notes: '' })
    load()
    setSaving(false)
  }

  const approve = async (entry) => {
    if (entry.entered_by === user.id) return alert("You cannot approve your own entry.")
    if (entry.is_approved) return
    const enteredByTreasurer = entry.entered_by_profile?.admin_code === 'SEA-A02'
    const isTreasurer = profile?.admin_code === 'SEA-A02'
    if (!isTreasurer && !enteredByTreasurer) {
      return alert("Only the Treasurer (SEA-A02) can approve deductions.")
    }
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: ledger } = await supabase.from('ledger_entries').insert({
      type: 'expense',
      amount: Number(entry.amount),
      description: `${entry.type} — ${entry.employee_name}${entry.period ? ` (${entry.period})` : ''}`,
      category: 'Salaries',
      date: today,
      entered_by: user.id,
      is_confirmed: true,
      confirmed_by: user.id,
    }).select('id').single()
    await supabase.from('deductions').update({
      is_approved: true,
      approved_by: user.id,
      ledger_entry_id: ledger?.id || null,
    }).eq('id', entry.id)
    load()
  }

  const remove = async (entry) => {
    if (entry.is_approved) return alert("Cannot delete an approved entry.")
    if (!confirm(`Delete deduction for ${entry.employee_name}?`)) return
    await supabase.from('deductions').delete().eq('id', entry.id)
    load()
  }

  const totalPending = entries.filter(e => !e.is_approved).reduce((s, e) => s + Number(e.amount), 0)
  const totalApproved = entries.filter(e => e.is_approved).reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-dark)' }}>Payroll & Deductions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Salaries, bonuses and field T&S — requires Treasurer (SEA-A02) approval</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Entry</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Pending Approval', value: `$${totalPending.toFixed(2)}`, color: '#f57c00', bg: '#fff3e0' },
          { label: 'Total Approved', value: `$${totalApproved.toFixed(2)}`, color: '#c62828', bg: '#fde8e8' },
          { label: 'Total Entries', value: entries.length, color: 'var(--navy)', bg: '#e8eaf0' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Amount (USD)</th>
                <th>Notes</th>
                <th>Entered By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No deduction entries yet</td></tr>
              ) : entries.map(e => {
                const enteredByTreasurer = e.entered_by_profile?.admin_code === 'SEA-A02'
                const isTreasurer = profile?.admin_code === 'SEA-A02'
                const canApprove = !e.is_approved && e.entered_by !== user?.id && (isTreasurer || enteredByTreasurer)
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.period || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.employee_name}</div>
                      {e.employee_code && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.employee_code}</div>}
                    </td>
                    <td><span style={{ background: 'var(--bg-light)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{e.type}</span></td>
                    <td style={{ fontWeight: 700, color: '#c62828' }}>-${Number(e.amount).toFixed(2)}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 160 }}>{e.notes || '—'}</td>
                    <td style={{ fontSize: 13 }}>
                      <div>{e.entered_by_profile?.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.entered_by_profile?.admin_code}</div>
                    </td>
                    <td>
                      {e.is_approved ? (
                        <>
                          <span className="badge badge-done">Approved</span>
                          {e.approved_by_profile && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>by {e.approved_by_profile.full_name}</div>
                          )}
                        </>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {canApprove && (
                          <button onClick={() => approve(e)} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}>
                            Approve
                          </button>
                        )}
                        {!e.is_approved && !canApprove && e.entered_by !== user?.id && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Treasurer approval needed</span>
                        )}
                        {!e.is_approved && e.entered_by === user?.id && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Awaiting {enteredByTreasurer ? 'peer' : 'Treasurer'}
                          </span>
                        )}
                        {!e.is_approved && (
                          <button onClick={() => remove(e)} className="btn btn-sm btn-danger">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Deduction / Payment</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Employee Name *</label>
                    <input required value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employee Code</label>
                    <input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))} placeholder="e.g. SEA-A01" />
                  </div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {DEDUCTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (USD) *</label>
                    <input type="number" required step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g. October 2026" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." rows={3} />
                </div>
                <div style={{ background: 'rgba(217,119,70,0.08)', border: '1px solid rgba(217,119,70,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--orange-mid)' }}>
                  ⚠️ The Treasurer (SEA-A02) must approve this entry. If SEA-A02 enters it, any other admin can approve. On approval, it is automatically logged as an expense.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving...' : 'Save Entry'}
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
