import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Decommissioned']

export default function Inventory() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    item_name: '', serial_number: '', value: '', purchase_date: new Date().toISOString().split('T')[0],
    location: '', condition: 'Good', notes: '',
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('inventory')
      .select('*, purchased_by_profile:admin_profiles!purchased_by(full_name,admin_code), confirmed_by_profile:admin_profiles!confirmed_by(full_name,admin_code)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generateId = async () => {
    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true })
    return `SEA${String((count || 0) + 1).padStart(2, '0')}`
  }

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    const seaId = await generateId()
    await supabase.from('inventory').insert({
      sea_id: seaId,
      item_name: form.item_name, serial_number: form.serial_number,
      value: parseFloat(form.value) || 0, purchase_date: form.purchase_date,
      location: form.location, condition: form.condition, notes: form.notes,
      purchased_by: user.id, is_confirmed: false,
    })
    setShowForm(false)
    setForm({ item_name: '', serial_number: '', value: '', purchase_date: new Date().toISOString().split('T')[0], location: '', condition: 'Good', notes: '' })
    load(); setSaving(false)
  }

  const confirm = async (item) => {
    if (item.purchased_by === user.id) return alert("You cannot confirm your own inventory entry.")
    if (item.is_confirmed) return
    const enteredByTreasurer = item.purchased_by_profile?.admin_code === 'SEA-A02'
    const isTreasurer = profile?.admin_code === 'SEA-A02'
    if (!isTreasurer && !enteredByTreasurer) {
      return alert("Only the Treasurer (SEA-A02) can confirm this entry.")
    }
    await supabase.from('inventory').update({ is_confirmed: true, confirmed_by: user.id }).eq('id', item.id)
    load()
  }

  const filtered = items.filter(i =>
    i.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.sea_id?.toLowerCase().includes(search.toLowerCase()) ||
    i.serial_number?.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = items.reduce((s, i) => s + Number(i.value || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Inventory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Equipment, assets and tools</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add Item</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Items', value: items.length, color: 'var(--navy)', bg: '#e8eaf0' },
          { label: 'Total Value', value: `$${totalValue.toFixed(2)}`, color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'Pending Confirm', value: items.filter(i => !i.is_confirmed).length, color: '#f57c00', bg: '#fff3e0' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '18px 22px' }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SEA ID, or serial number..." style={{ marginBottom: 20, maxWidth: 400 }} />

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SEA ID</th>
                <th>Item Name</th>
                <th>Serial #</th>
                <th>Value (USD)</th>
                <th>Condition</th>
                <th>Location</th>
                <th>Purchased By</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No items found</td></tr>
              ) : filtered.map(item => {
                const enteredByTreasurer = item.purchased_by_profile?.admin_code === 'SEA-A02'
                const isTreasurer = profile?.admin_code === 'SEA-A02'
                const canConfirm = !item.is_confirmed && item.purchased_by !== user?.id && (isTreasurer || enteredByTreasurer)
                return (
                <tr key={item.id}>
                  <td><span style={{ background: 'var(--navy-dark)', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{item.sea_id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                    {item.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.notes}</div>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{item.serial_number || '—'}</td>
                  <td style={{ fontWeight: 700 }}>${Number(item.value).toFixed(2)}</td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: item.condition === 'Excellent' || item.condition === 'Good' ? '#e8f5e9' : item.condition === 'Fair' ? '#fff3e0' : '#fde8e8',
                      color: item.condition === 'Excellent' || item.condition === 'Good' ? '#2e7d32' : item.condition === 'Fair' ? '#f57c00' : '#c62828',
                    }}>
                      {item.condition}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{item.location || '—'}</td>
                  <td style={{ fontSize: 13 }}>
                    <div>{item.purchased_by_profile?.full_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.purchased_by_profile?.admin_code}</div>
                  </td>
                  <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{item.purchase_date ? format(parseISO(item.purchase_date), 'dd MMM yyyy') : '—'}</td>
                  <td>
                    {item.is_confirmed ? <span className="badge badge-done">Confirmed</span> : <span className="badge badge-pending">Pending</span>}
                    {item.is_confirmed && item.confirmed_by_profile && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>by {item.confirmed_by_profile.full_name}</div>
                    )}
                  </td>
                  <td>
                    {canConfirm && (
                      <button onClick={() => confirm(item)} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}>Confirm</button>
                    )}
                    {!item.is_confirmed && !canConfirm && item.purchased_by !== user?.id && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Treasurer approval needed</span>
                    )}
                    {!item.is_confirmed && item.purchased_by === user?.id && (
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

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Inventory Item</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--navy)' }}>
                  A unique SEA ID will be automatically assigned (e.g., SEA01).
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g., DJI Phantom 4 Drone" />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="Manufacturer serial" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Value (USD)</label>
                    <input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                      {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Stored At</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Office, Field Kit Bag" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." rows={3} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving...' : 'Add Item'}
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
