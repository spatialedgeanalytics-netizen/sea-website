import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import {
  DEFAULT_TERMS, KM_PER_LITRE, calcQuote, defaultSummary, downloadQuotationPdf,
  fillTerm, formatRef, money, num, parseNumber, r2,
} from '../../lib/quotationPdf'
import { downloadLegacyQuotationPdf } from '../../lib/quotationPdfLegacy'

const SELECT = '*, created_by_profile:admin_profiles!created_by(full_name, signature_url), signed_by_profile:admin_profiles!signed_by(full_name, signature_url)'

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)

// Quotations made before SEAQT numbering have no quote_no and keep their old layout
const isLegacy = (q) => q.quote_no == null

const blankForm = () => ({
  client_name: '', farm_name: '', farm_size: '', farm_location: '',
  date_issued: format(new Date(), 'd MMMM yyyy'),
  summaryMode: 'auto', summary: '',
  services: [{ desc: '', qty: '1', unit_price: '' }],
  distance_km: '', fuel_rate: '',
  deliverables: [''],
  terms: [...DEFAULT_TERMS],
})

const sectionTitle = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--orange)', marginBottom: 12 }
const colHead = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const removeBtn = { background: '#fde8e8', color: '#c62828', border: 'none', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', flexShrink: 0 }
const addon = { padding: '10px 12px', background: 'var(--bg-light)', border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }

export default function Quotations() {
  const { user, profile } = useAuth()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [nextNo, setNextNo] = useState(null)
  const [viewQuote, setViewQuote] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [receiptModal, setReceiptModal] = useState(null)
  const [receiptForm, setReceiptForm] = useState({ amount: '', payment_method: 'EcoCash', notes: '' })
  const [receipting, setReceipting] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('quotations').select(SELECT).order('created_at', { ascending: false })
    setQuotations(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const setListItem = (list, i, val) => setForm(f => ({ ...f, [list]: f[list].map((x, idx) => idx === i ? val : x) }))
  const addListItem = (list, val) => setForm(f => ({ ...f, [list]: [...f[list], val] }))
  const removeListItem = (list, i) => setForm(f => ({ ...f, [list]: f[list].filter((_, idx) => idx !== i) }))

  // Typed values -> numbers (blank/invalid count as 0 for the live totals)
  const services = form.services.map(s => {
    const qty = parseNumber(s.qty), unit_price = parseNumber(s.unit_price)
    const q = isNaN(qty) ? 0 : qty, p = isNaN(unit_price) ? 0 : unit_price
    return { desc: s.desc.trim(), qty: q, unit_price: p, line_total: r2(q * p) }
  })
  const distance = parseNumber(form.distance_km)
  const fuelRate = parseNumber(form.fuel_rate)
  const calc = calcQuote({ services, distance_km: distance || 0, fuel_rate: fuelRate || 0 })
  const hectares = parseNumber(form.farm_size)
  const autoSummary = defaultSummary({
    name: form.client_name.trim() || '[client]', farm: form.farm_name.trim(),
    hectares: hectares || 0, location: form.farm_location.trim() || '[location]',
  })
  const summaryText = form.summaryMode === 'auto' ? autoSummary : form.summaryMode === 'custom' ? form.summary.trim() : ''

  const openNew = async () => {
    setForm(blankForm()); setEditing(null); setFormError(''); setNextNo(null)
    setShowForm(true)
    const { data } = await supabase.from('quotation_counter').select('last_no').eq('id', 1).maybeSingle()
    setNextNo(data ? data.last_no + 1 : 1)
  }

  const openEdit = (q) => {
    const transport = parse(q.transport_data) || {}
    const client = { name: q.client_name, farm: q.farm_name || '', hectares: Number(q.farm_size) || 0, location: q.farm_location || '' }
    const summary = q.description || ''
    const svc = parse(q.services) || []
    const deliverables = parse(q.deliverables) || []
    setForm({
      client_name: q.client_name || '', farm_name: q.farm_name || '',
      farm_size: q.farm_size || '', farm_location: q.farm_location || '',
      date_issued: q.date_issued || '',
      summaryMode: !summary ? 'none' : summary === defaultSummary(client) ? 'auto' : 'custom',
      summary,
      services: svc.length ? svc.map(s => ({ desc: s.desc, qty: String(s.qty), unit_price: String(s.unit_price) })) : blankForm().services,
      distance_km: transport.distance_km != null ? String(transport.distance_km) : '',
      fuel_rate: transport.fuel_rate != null ? String(transport.fuel_rate) : '',
      deliverables: deliverables.length ? deliverables : [''],
      terms: parse(q.terms) || [],
    })
    setEditing(q); setFormError('')
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(blankForm()); setFormError('') }

  const signatureFor = (q) => (q.signed_by_profile || q.created_by_profile)?.signature_url

  const generatePDF = async (q) => {
    if (isLegacy(q)) return downloadLegacyQuotationPdf(q)
    const missing = await downloadQuotationPdf(q, signatureFor(q))
    if (missing.length) console.warn('Quotation PDF made without:', missing.join(', '))
  }

  const validate = () => {
    if (!(hectares > 0)) return 'Farm size must be a number more than 0.'
    for (const [i, s] of form.services.entries()) {
      if (!s.desc.trim()) return `Service ${i + 1}: the service cannot be blank.`
      if (!(parseNumber(s.qty) > 0)) return `Service ${i + 1}: quantity must be more than 0.`
      if (isNaN(parseNumber(s.unit_price))) return `Service ${i + 1}: type the amount per unit, e.g. 150 or 87.50`
    }
    if (!form.services.length) return 'You need at least one service.'
    if (!(distance > 0)) return 'Travel distance must be more than 0 km.'
    if (!(fuelRate > 0)) return 'Fuel rate must be more than 0.'
    if (!form.date_issued.trim()) return 'Date issued cannot be blank.'
    return ''
  }

  const save = async (e) => {
    e.preventDefault()
    const err = validate()
    setFormError(err)
    if (err) return
    setSaving(true)
    const payload = {
      client_name: form.client_name.trim(), farm_name: form.farm_name.trim(),
      farm_size: num(hectares), farm_location: form.farm_location.trim(),
      date_issued: form.date_issued.trim(), description: summaryText,
      services, transport_data: { distance_km: distance, fuel_rate: fuelRate },
      deliverables: form.deliverables.map(d => d.trim()).filter(Boolean),
      terms: form.terms.map(t => t.trim()).filter(Boolean),
      pkg_total: calc.servicesTotal, tax_total: calc.tax, transport_total: calc.fuel,
      soil_total: 0, grand_total: calc.grand,
    }

    let result
    if (editing) {
      result = await supabase.from('quotations').update(payload).eq('id', editing.id).select(SELECT).single()
    } else {
      // Reference number is assigned by the database (see supabase/update_quotations_seaqt.sql)
      result = await supabase.from('quotations').insert({
        ...payload, created_by: user.id, signed_by: user.id,
        signer_role: profile?.role_title || '', status: 'draft',
      }).select(SELECT).single()
    }
    setSaving(false)
    if (result.error) { setFormError('Could not save: ' + result.error.message); return }
    closeForm(); load()
    if (!editing) generatePDF(result.data)
  }

  const deleteQuotation = async (q) => {
    if (!confirm(`Delete quotation ${q.quotation_ref} for ${q.client_name}? This cannot be undone.`)) return
    await supabase.from('quotations').delete().eq('id', q.id)
    load()
  }

  const openReceiptModal = (q) => {
    setReceiptForm({ amount: Number(q.grand_total).toFixed(2), payment_method: 'EcoCash', notes: '' })
    setReceiptModal(q)
  }

  const confirmReceipt = async () => {
    if (!receiptModal) return
    setReceipting(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
      type: 'income',
      amount: Number(receiptForm.amount),
      description: `Payment received — ${receiptModal.quotation_ref} — ${receiptModal.client_name} (${receiptForm.payment_method})`,
      category: 'Revenue',
      date: today,
      entered_by: user.id,
      is_confirmed: false,
      notes: receiptForm.notes || null,
    })
    if (ledgerErr) { alert('Failed to add ledger entry: ' + ledgerErr.message); setReceipting(false); return }
    await supabase.from('quotations').update({ status: 'paid' }).eq('id', receiptModal.id)
    setReceiptModal(null)
    setReceipting(false)
    load()
  }

  const filtered = quotations.filter(q =>
    q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.farm_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.client_phone?.includes(search) ||
    q.quotation_ref?.toLowerCase().includes(search.toLowerCase())
  )

  const signer = editing ? (editing.signed_by_profile || editing.created_by_profile) : profile

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Quotations</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Create, manage and retrieve client quotations</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">+ New Quotation</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client, farm, or reference..." style={{ marginBottom: 20, maxWidth: 440 }} />

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Farm</th>
                <th>Location</th>
                <th>Total (USD)</th>
                <th>Status</th>
                <th>Date</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No quotations found</td></tr>
              ) : filtered.map(q => (
                <tr key={q.id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--orange)' }}>{q.quotation_ref}</span></td>
                  <td style={{ fontWeight: 600 }}>{q.client_name}</td>
                  <td>{q.farm_name || '—'}</td>
                  <td>{q.farm_location || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#2e7d32' }}>{money(q.grand_total)}</td>
                  <td>
                    {q.status === 'paid'
                      ? <span style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PAID</span>
                      : <span style={{ background: '#fff8e1', color: '#f57f17', fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Draft</span>
                    }
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{q.date_issued || format(parseISO(q.created_at), 'dd MMM yyyy')}</td>
                  <td style={{ fontSize: 13 }}>{q.created_by_profile?.full_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => setViewQuote(q)} className="btn btn-sm btn-outline">View</button>
                      {!isLegacy(q) && (
                        <button onClick={() => openEdit(q)} className="btn btn-sm" style={{ background: '#e3f2fd', color: '#1565c0', border: 'none' }}>Edit</button>
                      )}
                      <button onClick={() => generatePDF(q)} className="btn btn-sm btn-primary">PDF</button>
                      {q.status !== 'paid' && (
                        <button onClick={() => openReceiptModal(q)} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', fontWeight: 700 }}>Receipt</button>
                      )}
                      <button onClick={() => deleteQuotation(q)} className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New / edit quotation modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
              <div className="modal-title">{editing ? `Edit Quotation ${editing.quotation_ref}` : 'New Quotation'}</div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Prepared for */}
                <div>
                  <div style={sectionTitle}>Prepared For</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Client Name *</label>
                      <input required value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Mr. Douglas Danje" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Farm Name *</label>
                      <input required value={form.farm_name} onChange={e => set('farm_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Farm Size *</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input required inputMode="decimal" value={form.farm_size} onChange={e => set('farm_size', e.target.value)} placeholder="e.g. 10" style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }} />
                        <span style={{ ...addon, borderLeft: 'none', borderRadius: '0 10px 10px 0' }}>Hectares</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Farm Location / Area *</label>
                      <input required value={form.farm_location} onChange={e => set('farm_location', e.target.value)} placeholder="e.g. Mutare Area" />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* Reference & date */}
                <div>
                  <div style={sectionTitle}>Reference & Date</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Reference</label>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--orange)', padding: '10px 0' }}>
                        {editing ? editing.quotation_ref : nextNo ? formatRef(nextNo) : '…'}
                      </div>
                      {!editing && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned automatically when saved — never repeated.</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Issued *</label>
                      <input required value={form.date_issued} onChange={e => set('date_issued', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* Intro statement */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ ...sectionTitle, marginBottom: 0 }}>Intro Statement</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['auto', 'Keep'], ['custom', 'Edit'], ['none', 'Delete']].map(([mode, label]) => (
                        <button key={mode} type="button"
                          onClick={() => setForm(f => ({ ...f, summaryMode: mode, summary: mode === 'custom' && f.summaryMode !== 'custom' ? autoSummary : f.summary }))}
                          className={`btn btn-sm ${form.summaryMode === mode ? 'btn-primary' : 'btn-outline'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  {form.summaryMode === 'auto' && (
                    <div style={{ fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px' }}>{autoSummary}</div>
                  )}
                  {form.summaryMode === 'custom' && (
                    <textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} />
                  )}
                  {form.summaryMode === 'none' && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No intro statement on this quotation.</div>
                  )}
                </div>

                <div className="divider" />

                {/* Services */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ ...sectionTitle, marginBottom: 0 }}>Services</div>
                    <button type="button" onClick={() => addListItem('services', { desc: '', qty: '1', unit_price: '' })} className="btn btn-sm btn-outline">+ Add Service</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 140px 100px 36px', gap: 10, marginBottom: 6 }}>
                    <span style={colHead}>Service</span>
                    <span style={colHead}>Qty</span>
                    <span style={colHead}>Per Unit (USD)</span>
                    <span style={colHead}>Amount</span>
                    <span />
                  </div>
                  {form.services.map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 140px 100px 36px', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                      <input value={s.desc} onChange={e => setListItem('services', i, { ...s, desc: e.target.value })} placeholder="Service" />
                      <input inputMode="decimal" value={s.qty} onChange={e => setListItem('services', i, { ...s, qty: e.target.value })} placeholder="1" />
                      <input inputMode="decimal" value={s.unit_price} onChange={e => setListItem('services', i, { ...s, unit_price: e.target.value })} placeholder="0.00" />
                      <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 14, textAlign: 'right', paddingRight: 4 }}>{money(services[i].line_total)}</div>
                      <button type="button" onClick={() => removeListItem('services', i)} disabled={form.services.length === 1} style={removeBtn}>×</button>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, fontSize: 14, color: 'var(--navy)' }}>
                    <span style={{ textAlign: 'right', paddingRight: 16 }}>Total</span><strong style={{ textAlign: 'right' }}>{money(calc.servicesTotal)}</strong>
                    <span style={{ textAlign: 'right', paddingRight: 16 }}>Tax (15%)</span><strong style={{ textAlign: 'right' }}>{money(calc.tax)}</strong>
                    <span style={{ textAlign: 'right', paddingRight: 16, fontWeight: 700 }}>SUB TOTAL</span><strong style={{ textAlign: 'right', color: '#2e7d32' }}>{money(calc.subTotal)}</strong>
                  </div>
                </div>

                <div className="divider" />

                {/* Transport */}
                <div>
                  <div style={sectionTitle}>Transport</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Total Travel Distance *</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input required inputMode="decimal" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} placeholder="e.g. 240.5" style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }} />
                        <span style={{ ...addon, borderLeft: 'none', borderRadius: '0 10px 10px 0' }}>km</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fuel Rate — price per litre *</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ ...addon, borderRight: 'none', borderRadius: '10px 0 0 10px' }}>$</span>
                        <input required inputMode="decimal" value={form.fuel_rate} onChange={e => set('fuel_rate', e.target.value)} placeholder="e.g. 1.60" style={{ borderRadius: '0 10px 10px 0', borderLeft: 'none' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--navy)', marginTop: 10 }}>
                    {num(distance || 0)} km ÷ {KM_PER_LITRE} = {num(r2(calc.litres))} L × {money(fuelRate || 0)} = <strong style={{ color: '#2e7d32' }}>{money(calc.fuel)}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Only “1 L = {KM_PER_LITRE} km” and the fuel amount appear on the quotation.</div>
                </div>

                <div className="divider" />

                {/* Final deliverables */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ ...sectionTitle, marginBottom: 0 }}>Final Deliverables</div>
                    <button type="button" onClick={() => addListItem('deliverables', '')} className="btn btn-sm btn-outline">+ Add Deliverable</button>
                  </div>
                  {form.deliverables.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                      <input value={d} onChange={e => setListItem('deliverables', i, e.target.value)} placeholder={`Deliverable ${i + 1}`} />
                      <button type="button" onClick={() => removeListItem('deliverables', i)} style={removeBtn}>×</button>
                    </div>
                  ))}
                  {form.deliverables.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No deliverables — this section is left off the quotation.</div>
                  )}
                </div>

                <div className="divider" />

                {/* Terms & conditions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ ...sectionTitle, marginBottom: 0 }}>Terms & Conditions</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => set('terms', [...DEFAULT_TERMS])} className="btn btn-sm btn-outline">Reset to Default</button>
                      <button type="button" onClick={() => addListItem('terms', '')} className="btn btn-sm btn-outline">+ Add Term</button>
                    </div>
                  </div>
                  {form.terms.map((t, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input value={t} onChange={e => setListItem('terms', i, e.target.value)} placeholder="New term" />
                        <button type="button" onClick={() => removeListItem('terms', i)} style={removeBtn}>×</button>
                      </div>
                      {t.includes('{TRANSPORT}') && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Shows as: {fillTerm(t, calc.fuel)}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#f0f4f8', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--navy)' }}>Sub Total (incl. 15% tax)</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{money(calc.subTotal)}</span>
                  </div>
                  <div style={{ background: '#e8edf2', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--navy)' }}>Transport</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{money(calc.fuel)}</span>
                  </div>
                  <div style={{ background: 'var(--navy-dark)', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>GRAND TOTAL</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--orange)' }}>{money(calc.grand)}</span>
                  </div>
                </div>

                {/* Signature */}
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--navy-dark)', marginBottom: 12 }}>
                    Authorised Signature
                  </div>
                  {signer?.signature_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src={signer.signature_url} alt="signature" style={{ maxHeight: 50, maxWidth: 160, border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: '#fff' }} />
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Signed by <strong>{signer.full_name}</strong></div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {editing ? <><strong>{signer?.full_name}</strong> has</> : 'You have'} not uploaded a signature, so the signature line will be left blank.
                      {!editing && ' You can upload one under My Profile.'}
                    </div>
                  )}
                </div>

                {formError && <div style={{ color: '#c62828', fontSize: 14, background: '#fde8e8', borderRadius: 8, padding: '10px 14px' }}>{formError}</div>}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={closeForm} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Quotation & PDF'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptModal && (
        <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment Receipt</div>
              <button className="modal-close" onClick={() => setReceiptModal(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange)', fontSize: 14, marginBottom: 4 }}>{receiptModal.quotation_ref}</div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{receiptModal.client_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quoted: <strong style={{ color: '#2e7d32' }}>${Number(receiptModal.grand_total).toFixed(2)}</strong></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Amount Received (USD) *</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ padding: '10px 12px', background: 'var(--bg-light)', border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>$</span>
                  <input type="number" step="0.01" min="0" value={receiptForm.amount}
                    onChange={e => setReceiptForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ borderRadius: '0 10px 10px 0', borderLeft: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select value={receiptForm.payment_method} onChange={e => setReceiptForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option>EcoCash</option>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                <input value={receiptForm.notes} onChange={e => setReceiptForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Partial payment, transaction ref..." />
              </div>

              <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#2e7d32' }}>
                This will mark the quotation as <strong>PAID</strong> and add <strong>${receiptForm.amount || '0.00'}</strong> income to the Accounts ledger.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setReceiptModal(null)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="button" onClick={confirmReceipt} disabled={!receiptForm.amount || receipting}
                  className="btn" style={{ flex: 1, justifyContent: 'center', background: '#2e7d32', color: '#fff', border: 'none' }}>
                  {receipting ? 'Recording...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewQuote && (
        <div className="modal-overlay" onClick={() => setViewQuote(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{viewQuote.quotation_ref}</div>
              <button className="modal-close" onClick={() => setViewQuote(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                ['Client', viewQuote.client_name], ['Farm', viewQuote.farm_name], ['Location', viewQuote.farm_location],
                ['Size', viewQuote.farm_size && `${viewQuote.farm_size} Hectares`], ['Date Issued', viewQuote.date_issued],
                ['Phone', viewQuote.client_phone], ['Total', money(viewQuote.grand_total)],
                ['Signed By', (viewQuote.signed_by_profile || viewQuote.created_by_profile)?.full_name],
              ].map(([l, v]) => v ? (
                <div key={l}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                </div>
              ) : null)}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setViewQuote(null)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Close</button>
              <button onClick={() => generatePDF(viewQuote)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
