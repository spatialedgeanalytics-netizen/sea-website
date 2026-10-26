import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

const FIELD_SLOTS = [
  { key: 'landowner_permission',  label: 'Landowner Permission',   icon: '📝', requiresId: true },
  { key: 'preflight_checklist',   label: 'Pre-flight Checklist',   icon: '✅', requiresId: false },
  { key: 'postflight_checklist',  label: 'Post-flight Checklist',  icon: '✅', requiresId: false },
  { key: 'incident_report',       label: 'Incident Report',        icon: '⚠️', requiresId: false },
  { key: 'logbook',               label: 'Logbook Entry',          icon: '📒', requiresId: false },
  { key: 'risk_assessment',       label: 'Risk Assessment',        icon: '🛡️', requiresId: false },
]

const TABS = [
  { key: 'company',       label: '🏢 Company Documents' },
  { key: 'client_report', label: '📊 Client Reports' },
  { key: 'field',         label: '🌿 Field Documents' },
]

const BLANK_FORM = {
  document_name: '', notes: '', client_name: '', client_phone: '',
  client_email: '', work_id: '', slot_type: '',
}

function fileExt(name) { return name?.split('.').pop() || 'file' }

export default function Documents() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('company')
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [file, setFile] = useState(null)
  const [idFile, setIdFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef()
  const idFileRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('documents')
      .select('*, uploader:admin_profiles!uploaded_by(full_name,admin_code)')
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const tabDocs = docs.filter(d => (d.category || 'field') === activeTab)
    .filter(d => {
      const q = search.toLowerCase()
      return !q || d.document_name?.toLowerCase().includes(q) ||
        d.client_name?.toLowerCase().includes(q) ||
        d.work_id?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q)
    })

  const openAdd = (slotType = '') => {
    setEditDoc(null)
    setForm({ ...BLANK_FORM, slot_type: slotType })
    setFile(null); setIdFile(null)
    setShowForm(true)
  }

  const openEdit = (doc) => {
    setEditDoc(doc)
    setForm({
      document_name: doc.document_name || '',
      notes: doc.notes || '',
      client_name: doc.client_name || '',
      client_phone: doc.client_phone || '',
      client_email: doc.client_email || '',
      work_id: doc.work_id || '',
      slot_type: doc.slot_type || '',
    })
    setFile(null); setIdFile(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false); setEditDoc(null)
    setForm(BLANK_FORM); setFile(null); setIdFile(null)
  }

  const uploadFile = async (f, prefix) => {
    const ext = fileExt(f.name)
    const path = `documents/${prefix}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('sea-documents').upload(path, f, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('sea-documents').getPublicUrl(path)
    return { url: publicUrl, path }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!editDoc && !file) { alert('Please select a file.'); return }
    setUploading(true)
    try {
      const payload = {
        document_name: form.document_name || file?.name || 'Untitled',
        category: activeTab,
        notes: form.notes || null,
        slot_type: form.slot_type || null,
        client_name: form.client_name || null,
        client_phone: form.client_phone || null,
        client_email: form.client_email || null,
        work_id: form.work_id || null,
      }

      // Upload main file. Old files stay in storage so the Audit Trail can restore previous versions.
      if (file) {
        const { url, path } = await uploadFile(file, 'doc')
        payload.file_url = url
        payload.file_path = path
      }

      // Upload ID attachment
      if (idFile) {
        const { url, path } = await uploadFile(idFile, 'id')
        payload.id_document_url = url
        payload.id_document_path = path
      }

      if (editDoc) {
        await supabase.from('documents').update(payload).eq('id', editDoc.id)
      } else {
        await supabase.from('documents').insert({ ...payload, uploaded_by: user.id })
      }
      closeForm(); load()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
    setUploading(false)
  }

  const deleteDoc = async (doc) => {
    if (!confirm(`Delete "${doc.document_name}"? This will be recorded in the System Audit Trail and can only be restored with approval from all admins.`)) return
    // File is kept in storage so the Audit Trail can restore it
    await supabase.from('documents').delete().eq('id', doc.id)
    load()
  }

  // For field tab: which predefined slots are already uploaded?
  const uploadedSlots = new Set(tabDocs.map(d => d.slot_type).filter(Boolean))
  const customFieldDocs = tabDocs.filter(d => !d.slot_type || !FIELD_SLOTS.find(s => s.key === d.slot_type))
  const slot_name = (doc) => {
    const s = FIELD_SLOTS.find(f => f.key === doc.slot_type)
    return s ? s.label : doc.document_name
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Documents</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Company files, client reports, and field paperwork</p>
        </div>
        <button onClick={() => openAdd()} className="btn btn-primary">+ Upload Document</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch('') }}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
              background: 'transparent',
              borderBottom: activeTab === t.key ? '3px solid var(--orange)' : '3px solid transparent',
              color: activeTab === t.key ? 'var(--orange)' : 'var(--text-muted)',
              marginBottom: -2, transition: 'color 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${activeTab === 'company' ? 'company documents' : activeTab === 'client_report' ? 'client reports' : 'field documents'}...`}
        style={{ marginBottom: 24, maxWidth: 420 }} />

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (

        <>
          {/* ─── FIELD DOCUMENTS ─── */}
          {activeTab === 'field' && (
            <div>
              {/* Predefined slots */}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 14 }}>
                Standard Field Documents
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
                {FIELD_SLOTS.map(slot => {
                  const uploaded = tabDocs.filter(d => d.slot_type === slot.key)
                  return (
                    <div key={slot.key} style={{
                      background: '#fff', borderRadius: 12, border: uploaded.length ? '2px solid #c8e6c9' : '2px dashed var(--border)',
                      padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{slot.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{slot.label}</span>
                        </div>
                        {slot.requiresId && (
                          <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                            ID req.
                          </span>
                        )}
                      </div>

                      {uploaded.length === 0 ? (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>No document uploaded yet</div>
                          <button onClick={() => openAdd(slot.key)} className="btn btn-sm btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                            + Upload
                          </button>
                        </div>
                      ) : (
                        uploaded.map(doc => <DocCard key={doc.id} doc={doc} slotLabel={slot.label} onEdit={() => openEdit(doc)} onDelete={() => deleteDoc(doc)} />)
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Custom field docs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                  Custom Field Documents {customFieldDocs.length > 0 ? `(${customFieldDocs.length})` : ''}
                </div>
                <button onClick={() => openAdd('')} className="btn btn-sm btn-outline">+ Add Custom Slot</button>
              </div>
              {customFieldDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No custom field documents. Click "Add Custom Slot" to add one.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {customFieldDocs.map(doc => (
                    <div key={doc.id} style={{ background: '#fff', borderRadius: 12, border: '2px solid #c8e6c9', padding: '16px 18px' }}>
                      <DocCard doc={doc} slotLabel={doc.document_name} onEdit={() => openEdit(doc)} onDelete={() => deleteDoc(doc)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── COMPANY DOCUMENTS & CLIENT REPORTS ─── */}
          {activeTab !== 'field' && (
            <>
              {tabDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                  <p>No {activeTab === 'company' ? 'company documents' : 'client reports'} yet.</p>
                  <button onClick={() => openAdd()} className="btn btn-primary" style={{ marginTop: 16 }}>+ Upload First Document</button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Document</th>
                        {activeTab === 'client_report' && <><th>Client</th><th>Work ID</th></>}
                        <th>Notes</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabDocs.map(doc => (
                        <tr key={doc.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>📄</span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{doc.document_name}</span>
                            </div>
                          </td>
                          {activeTab === 'client_report' && (
                            <>
                              <td style={{ fontWeight: 600 }}>{doc.client_name || '—'}</td>
                              <td>{doc.work_id
                                ? <span style={{ background: 'var(--navy-dark)', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{doc.work_id}</span>
                                : '—'}
                              </td>
                            </>
                          )}
                          <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 200 }}>{doc.notes || '—'}</td>
                          <td style={{ fontSize: 13 }}>
                            <div>{doc.uploader?.full_name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{doc.uploader?.admin_code}</div>
                          </td>
                          <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{format(parseISO(doc.created_at), 'dd MMM yyyy')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">Open</a>}
                              {doc.file_url && <a href={doc.file_url} download className="btn btn-sm btn-outline">Download</a>}
                              <button onClick={() => openEdit(doc)} className="btn btn-sm" style={{ background: '#e3f2fd', color: '#1565c0', border: 'none' }}>Edit</button>
                              <button onClick={() => deleteDoc(doc)} className="btn btn-sm btn-danger">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── UPLOAD / EDIT MODAL ─── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editDoc ? 'Edit Document' : `Add ${activeTab === 'company' ? 'Company Document' : activeTab === 'client_report' ? 'Client Report' : 'Field Document'}`}
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Field: slot type selector */}
                {activeTab === 'field' && (
                  <div className="form-group">
                    <label className="form-label">Document Type *</label>
                    <select value={form.slot_type} onChange={e => {
                      const s = FIELD_SLOTS.find(f => f.key === e.target.value)
                      setForm(f => ({ ...f, slot_type: e.target.value, document_name: s ? s.label : f.document_name }))
                    }}>
                      <option value="">— Custom / Other —</option>
                      {FIELD_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Document name */}
                <div className="form-group">
                  <label className="form-label">Document Name *</label>
                  <input required value={form.document_name}
                    onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))}
                    placeholder={activeTab === 'company' ? 'e.g. Worker Contract — John Doe' : activeTab === 'client_report' ? 'e.g. Crop Health Report — Moyo Farm' : 'e.g. Landowner Permission — Farm XYZ'} />
                </div>

                {/* Client fields for client reports */}
                {activeTab === 'client_report' && (
                  <>
                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="form-label">Client Name</label>
                        <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Mr./Mrs. ..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Client Phone</label>
                        <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="077..." />
                      </div>
                    </div>
                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="form-label">Work ID / Project Ref</label>
                        <input value={form.work_id} onChange={e => setForm(f => ({ ...f, work_id: e.target.value }))} placeholder="e.g. SEA-001" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Client Email</label>
                        <input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="optional" />
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any relevant notes..." rows={2} />
                </div>

                {/* Main file */}
                <div className="form-group">
                  <label className="form-label">
                    {editDoc?.file_url ? 'Replace File' : 'File *'}
                    {editDoc?.file_url && <a href={editDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, fontSize: 12, color: 'var(--orange)' }}>View current ↗</a>}
                  </label>
                  <input ref={fileRef} type="file" required={!editDoc}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                    onChange={e => setFile(e.target.files[0])}
                    style={{ padding: '8px 12px', cursor: 'pointer' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, Word, Excel, Images accepted</div>
                </div>

                {/* ID attachment (field docs only) */}
                {activeTab === 'field' && (
                  <div className="form-group">
                    <label className="form-label">
                      Attach ID Document <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                      {editDoc?.id_document_url && <a href={editDoc.id_document_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, fontSize: 12, color: 'var(--orange)' }}>View current ↗</a>}
                    </label>
                    <input ref={idFileRef} type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setIdFile(e.target.files[0])}
                      style={{ padding: '8px 12px', cursor: 'pointer' }} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Attach landowner/operator ID if required</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={closeForm} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={uploading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {uploading ? 'Saving...' : editDoc ? 'Save Changes' : 'Upload'}
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

function DocCard({ doc, slotLabel, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {doc.document_name || slotLabel}
          </div>
          {doc.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{doc.notes}</div>}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {doc.uploader?.full_name} · {format(parseISO(doc.created_at), 'dd MMM yyyy')}
          </div>
          {doc.id_document_url && (
            <div style={{ marginTop: 4 }}>
              <a href={doc.id_document_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600 }}>🪪 ID attached ↗</a>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">Open</a>}
        {doc.file_url && <a href={doc.file_url} download className="btn btn-sm btn-outline">Download</a>}
        <button onClick={onEdit} className="btn btn-sm" style={{ background: '#e3f2fd', color: '#1565c0', border: 'none' }}>Edit</button>
        <button onClick={onDelete} className="btn btn-sm btn-danger">Delete</button>
      </div>
    </div>
  )
}
