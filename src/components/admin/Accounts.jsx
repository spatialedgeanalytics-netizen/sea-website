import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

const CATEGORIES = ['Revenue', 'Transport', 'Equipment', 'Salaries', 'Office', 'Field Operations', 'Marketing', 'Software', 'Other']

export default function Accounts() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [admins, setAdmins] = useState([])
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'income', category: 'Revenue', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('ledger_entries')
      .select('*, entered_by_profile:admin_profiles!entered_by(full_name,admin_code), confirmed_by_profile:admin_profiles!confirmed_by(full_name,admin_code)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setEntries(data || [])
    const { data: ad } = await supabase.from('admin_profiles').select('id,full_name,admin_code')
    setAdmins(ad || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('ledger_entries').insert({
      date: form.date, description: form.description,
      amount: parseFloat(form.amount), type: form.type,
      category: form.category, notes: form.notes,
      entered_by: user.id, is_confirmed: false,
    })
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'income', category: 'Revenue', notes: '' })
    load(); setSaving(false)
  }

  const confirm = async (entry) => {
    if (entry.entered_by === user.id) return alert("You cannot confirm your own entry.")
    if (entry.is_confirmed) return
    const enteredByTreasurer = entry.entered_by_profile?.admin_code === 'SEA-A02'
    const isTreasurer = profile?.admin_code === 'SEA-A02'
    if (!isTreasurer && !enteredByTreasurer) {
      return alert("Only the Treasurer (SEA-A02) can confirm this entry.")
    }
    await supabase.from('ledger_entries').update({ is_confirmed: true, confirmed_by: user.id }).eq('id', entry.id)
    load()
  }

  const filtered = filter === 'all' ? entries : filter === 'pending' ? entries.filter(e => !e.is_confirmed) : entries.filter(e => e.type === filter)
  const totalIncome = entries.filter(e => e.type === 'income' && e.is_confirmed).reduce((s, e) => s + Number(e.amount), 0)
  const totalExpense = entries.filter(e => e.type === 'expense' && e.is_confirmed).reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalIncome - totalExpense

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-dark)' }}>Accounts Ledger</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track all financial transactions</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Entry</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Income', value: totalIncome, color: '#2e7d32', bg: '#e8f5e9', icon: '↑' },
          { label: 'Total Expenses', value: totalExpense, color: '#c62828', bg: '#fde8e8', icon: '↓' },
          { label: 'Net Balance', value: balance, color: balance >= 0 ? '#1565c0' : '#c62828', bg: balance >= 0 ? '#e3f2fd' : '#fde8e8', icon: '≈' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>${Math.abs(s.value).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all', 'All'], ['income', 'Income'], ['expense', 'Expenses'], ['pending', 'Pending Confirmation']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-outline'}`}>{lbl}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount (USD)</th>
                <th>Entered By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No entries found</td></tr>
              ) : filtered.map(e => {
                const enteredByTreasurer = e.entered_by_profile?.admin_code === 'SEA-A02'
                const isTreasurer = profile?.admin_code === 'SEA-A02'
                const canConfirm = !e.is_confirmed && e.entered_by !== user?.id && (isTreasurer || enteredByTreasurer)
                return (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{format(parseISO(e.date), 'dd MMM yyyy')}</td>
                  <td style={{ maxWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.description}</div>
                    {e.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.notes}</div>}
                  </td>
                  <td><span style={{ background: 'var(--bg-light)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{e.category}</span></td>
                  <td><span className={`badge badge-${e.type}`}>{e.type.toUpperCase()}</span></td>
                  <td style={{ fontWeight: 700, color: e.type === 'income' ? '#2e7d32' : '#c62828' }}>
                    {e.type === 'income' ? '+' : '-'}${Number(e.amount).toFixed(2)}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{e.entered_by_profile?.full_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{e.entered_by_profile?.admin_code}</div>
                  </td>
                  <td>
                    {e.is_confirmed ? (
                      <span className="badge badge-done">Confirmed</span>
                    ) : (
                      <span className="badge badge-pending">Pending</span>
                    )}
                    {e.is_confirmed && e.confirmed_by_profile && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>by {e.confirmed_by_profile.full_name}</div>
                    )}
                  </td>
                  <td>
                    {canConfirm && (
                      <button onClick={() => confirm(e)} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}>
                        Confirm
                      </button>
                    )}
                    {!e.is_confirmed && !canConfirm && e.entered_by !== user?.id && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Treasurer approval needed</span>
                    )}
                    {!e.is_confirmed && e.entered_by === user?.id && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Awaiting {enteredByTreasurer ? 'peer' : 'Treasurer'}</span>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add entry modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Ledger Entry</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this transaction for?" />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Amount (USD) *</label>
                    <input type="number" required step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={3} />
                </div>
                <div style={{ background: 'rgba(217,119,70,0.08)', border: '1px solid rgba(217,119,70,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--orange-mid)' }}>
                  ⚠️ The Treasurer (SEA-A02) must confirm this entry. If SEA-A02 enters it, any other admin can confirm.
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
