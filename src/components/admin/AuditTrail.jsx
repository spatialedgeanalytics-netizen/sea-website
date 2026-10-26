import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

const PAGE_SIZE = 100

const MODULES = {
  ledger_entries: 'Accounts Ledger',
  deductions: 'Payroll',
  inventory: 'Inventory',
  quotations: 'Quotations',
  documents: 'Documents',
  gallery: 'Gallery',
  chat_messages: 'SEA Chat',
  tasks: 'Tasks',
  task_comments: 'Task Comments',
  leave_requests: 'Leave',
  job_vacancies: 'Vacancies',
  job_applications: 'Job Applications',
  contact_enquiries: 'Enquiries',
  admin_profiles: 'Admin Profiles',
}

// Must match the exclusions in sat_request_restore()
const NOT_RESTORABLE = ['admin_profiles', 'chat_messages']

const ACTION_STYLES = {
  INSERT:            { label: 'Created',            bg: '#e8f5e9', color: '#2e7d32' },
  UPDATE:            { label: 'Edited',             bg: '#e3f2fd', color: '#1565c0' },
  DELETE:            { label: 'Deleted',            bg: '#fde8e8', color: '#c62828' },
  RESTORE:           { label: 'Restored',           bg: '#ede7f6', color: '#5e35b1' },
  RESTORE_REQUESTED: { label: 'Restore requested',  bg: '#fff3e0', color: '#e65100' },
  RESTORE_APPROVED:  { label: 'Restore approved',   bg: '#e8f5e9', color: '#2e7d32' },
  RESTORE_REJECTED:  { label: 'Restore rejected',   bg: '#fde8e8', color: '#c62828' },
  LOGIN:             { label: 'Signed in',          bg: '#e8eaf0', color: 'var(--navy)' },
  LOGOUT:            { label: 'Signed out',         bg: '#e8eaf0', color: 'var(--navy)' },
}

const LABEL_FIELDS = ['document_name', 'description', 'item_name', 'quotation_ref', 'title',
  'employee_name', 'client_name', 'full_name', 'name', 'subject', 'message', 'comment']

function recordLabel(entry) {
  const d = entry.new_data || entry.old_data
  if (!d) return entry.note || ''
  const field = LABEL_FIELDS.find(f => d[f])
  let label = field ? String(d[field]) : `#${entry.record_id?.slice(0, 8) || ''}`
  if (label.length > 60) label = label.slice(0, 60) + '…'
  const money = d.amount ?? d.grand_total ?? d.value
  if (money !== undefined && money !== null) label += ` · $${Number(money).toFixed(2)}`
  return label
}

function fmtValue(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function ActionBadge({ action }) {
  const s = ACTION_STYLES[action] || { label: action, bg: '#eee', color: '#333' }
  return <span className="badge" style={{ background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

function Location({ entry }) {
  if (entry.client_location) {
    const [lat, lon, acc] = entry.client_location.split(',')
    return (
      <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--orange)', fontWeight: 600 }}>
        📍 Map{acc ? ` (±${acc}m)` : ''}
      </a>
    )
  }
  if (entry.ip_address) {
    return (
      <a href={`https://ipinfo.io/${entry.ip_address}`} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--text-muted)' }} title="Approximate location from IP address">
        🌐 IP lookup
      </a>
    )
  }
  return <span style={{ color: 'var(--text-muted)' }}>—</span>
}

export default function AuditTrail() {
  const { user } = useAuth()
  const [tab, setTab] = useState('log')
  const [entries, setEntries] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [admins, setAdmins] = useState([])
  const [requests, setRequests] = useState([])
  const [votes, setVotes] = useState([])
  const [integrity, setIntegrity] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [restoreFor, setRestoreFor] = useState(null)
  const [voteFor, setVoteFor] = useState(null)
  const [filters, setFilters] = useState({ table: '', action: '', actor: '', from: '', to: '', search: '' })

  const loadEntries = async (append = false) => {
    setLoading(true)
    let q = supabase.from('audit_log').select('*').order('id', { ascending: false })
    if (filters.table) q = q.eq('table_name', filters.table)
    if (filters.action) q = q.eq('action', filters.action)
    if (filters.actor) q = filters.actor === 'public' ? q.is('actor_id', null) : q.eq('actor_id', filters.actor)
    if (filters.from) q = q.gte('occurred_at', new Date(filters.from).toISOString())
    if (filters.to) q = q.lte('occurred_at', new Date(filters.to + 'T23:59:59').toISOString())
    const offset = append ? entries.length : 0
    const { data } = await q.range(offset, offset + PAGE_SIZE - 1)
    const rows = data || []
    setEntries(prev => append ? [...prev, ...rows] : rows)
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  const loadRequests = async () => {
    const [{ data: reqs }, { data: vts }] = await Promise.all([
      supabase.from('audit_restore_requests')
        .select('*, entry:audit_log(*), requester:admin_profiles!requested_by(full_name,admin_code)')
        .order('created_at', { ascending: false }),
      supabase.from('audit_restore_votes').select('*'),
    ])
    setRequests(reqs || [])
    setVotes(vts || [])
  }

  useEffect(() => {
    supabase.from('admin_profiles').select('id,full_name,admin_code').order('admin_code')
      .then(({ data }) => setAdmins(data || []))
    loadRequests()
  }, [])

  useEffect(() => { loadEntries() }, [filters.table, filters.action, filters.actor, filters.from, filters.to])

  // Live updates (requires Realtime enabled on audit tables; harmless otherwise)
  useEffect(() => {
    const ch = supabase.channel('sat-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => { loadEntries(); loadRequests() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [filters.table, filters.action, filters.actor, filters.from, filters.to])

  const visible = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    if (!s) return entries
    return entries.filter(e =>
      [e.actor_name, e.actor_code, e.table_name, e.note, e.ip_address, JSON.stringify(e.old_data), JSON.stringify(e.new_data)]
        .some(v => v && v.toLowerCase().includes(s)))
  }, [entries, filters.search])

  const activeRequestFor = useMemo(() => {
    const m = {}
    requests.filter(r => r.status === 'PENDING' || r.status === 'EXECUTED').forEach(r => { m[r.audit_log_id] = r })
    return m
  }, [requests])

  const pendingCount = requests.filter(r => r.status === 'PENDING').length

  const verify = async () => {
    setVerifying(true)
    const { data, error } = await supabase.rpc('sat_verify_chain')
    setIntegrity(error ? { ok: false, detail: error.message } : data?.[0])
    setVerifying(false)
  }

  const canRestore = (e) =>
    (e.action === 'DELETE' || e.action === 'UPDATE') && e.old_data &&
    !NOT_RESTORABLE.includes(e.table_name) && !activeRequestFor[e.id]

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-dark)' }}>System Audit Trail</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 640 }}>
            Every change made in the admin portal is recorded here automatically. Entries are permanent and cannot be edited or deleted by anyone.
            Deleted or edited records can be restored only when every admin approves.
          </p>
        </div>
        <button onClick={verify} disabled={verifying} className="btn btn-outline btn-sm">
          {verifying ? 'Verifying…' : '🔒 Verify integrity'}
        </button>
      </div>

      {integrity && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 14,
          background: integrity.ok ? '#e8f5e9' : '#fde8e8', color: integrity.ok ? '#2e7d32' : '#c62828',
          border: `1px solid ${integrity.ok ? '#c8e6c9' : '#f5c6c6'}`,
        }}>
          {integrity.ok
            ? <>✅ <b>Audit trail intact.</b> All {integrity.total_rows} entries verified against their cryptographic hash chain.</>
            : <>⚠️ <b>Tampering detected</b>{integrity.first_bad_id ? ` at entry #${integrity.first_bad_id}` : ''}. {integrity.detail}</>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {[{ key: 'log', label: '📜 Activity Log' }, { key: 'requests', label: `♻️ Restore Requests${pendingCount ? ` (${pendingCount})` : ''}` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
              background: 'transparent', marginBottom: -2,
              borderBottom: tab === t.key ? '3px solid var(--orange)' : '3px solid transparent',
              color: tab === t.key ? 'var(--orange)' : 'var(--text-muted)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
            <input placeholder="Search…" value={filters.search} onChange={e => setFilter('search', e.target.value)} />
            <select value={filters.table} onChange={e => setFilter('table', e.target.value)}>
              <option value="">All modules</option>
              {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.action} onChange={e => setFilter('action', e.target.value)}>
              <option value="">All actions</option>
              {Object.entries(ACTION_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filters.actor} onChange={e => setFilter('actor', e.target.value)}>
              <option value="">All people</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.admin_code})</option>)}
              <option value="public">Public visitors</option>
            </select>
            <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} title="From" />
            <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} title="To" />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && !loading && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries match these filters</td></tr>
                )}
                {visible.map(e => (
                  <React.Fragment key={e.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{format(parseISO(e.occurred_at), 'dd MMM yyyy')}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(parseISO(e.occurred_at), 'HH:mm:ss')}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {e.actor_id ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{e.actor_name || 'Unknown admin'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.actor_code}</div>
                          </>
                        ) : <span style={{ color: 'var(--text-muted)' }}>Public visitor</span>}
                      </td>
                      <td><ActionBadge action={e.action} /></td>
                      <td style={{ fontSize: 13 }}>{MODULES[e.table_name] || e.table_name || '—'}</td>
                      <td style={{ fontSize: 13, maxWidth: 260 }}>
                        {recordLabel(e)}
                        {e.action === 'UPDATE' && e.changed_fields && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Changed: {e.changed_fields.join(', ')}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }} onClick={ev => ev.stopPropagation()}><Location entry={e} /></td>
                      <td onClick={ev => ev.stopPropagation()}>
                        {canRestore(e) && (
                          <button onClick={() => setRestoreFor(e)} className="btn btn-sm" style={{ background: '#ede7f6', color: '#5e35b1', border: 'none', whiteSpace: 'nowrap' }}>
                            ♻️ Restore
                          </button>
                        )}
                        {activeRequestFor[e.id] && (
                          <span className={`badge ${activeRequestFor[e.id].status === 'EXECUTED' ? 'badge-done' : 'badge-pending'}`}>
                            {activeRequestFor[e.id].status === 'EXECUTED' ? 'Restored' : 'Restore pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-light)', padding: 20 }}>
                          <EntryDetail entry={e} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {loading ? <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
              : hasMore && <button onClick={() => loadEntries(true)} className="btn btn-outline btn-sm">Load older entries</button>}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <RequestList requests={requests} votes={votes} admins={admins} userId={user?.id} onVote={setVoteFor} />
      )}

      {restoreFor && (
        <RestoreModal entry={restoreFor} adminCount={admins.length} onClose={() => setRestoreFor(null)}
          onDone={() => { setRestoreFor(null); loadEntries(); loadRequests(); setTab('requests') }} />
      )}

      {voteFor && (
        <VoteModal request={voteFor.request} approve={voteFor.approve} onClose={() => setVoteFor(null)}
          onDone={() => { setVoteFor(null); loadEntries(); loadRequests() }} />
      )}
    </div>
  )
}

function EntryDetail({ entry }) {
  const fields = entry.action === 'UPDATE'
    ? (entry.changed_fields || [])
    : Object.keys(entry.new_data || entry.old_data || {})

  return (
    <div style={{ fontSize: 13 }}>
      {fields.length > 0 && (
        <div className="table-wrap" style={{ background: '#fff', marginBottom: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                {entry.old_data && <th>{entry.action === 'UPDATE' ? 'Before' : 'Deleted value'}</th>}
                {entry.new_data && <th>{entry.action === 'UPDATE' ? 'After' : 'Value'}</th>}
              </tr>
            </thead>
            <tbody>
              {fields.map(f => (
                <tr key={f}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f}</td>
                  {entry.old_data && <td style={{ color: entry.action === 'UPDATE' ? '#c62828' : undefined, wordBreak: 'break-word' }}>{fmtValue(entry.old_data[f])}</td>}
                  {entry.new_data && <td style={{ color: entry.action === 'UPDATE' ? '#2e7d32' : undefined, wordBreak: 'break-word' }}>{fmtValue(entry.new_data[f])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, color: 'var(--text-muted)' }}>
        <div><b>Entry #</b> {entry.id}</div>
        <div><b>Exact time</b> {format(parseISO(entry.occurred_at), 'dd MMM yyyy HH:mm:ss.SSS')}</div>
        <div><b>IP address</b> {entry.ip_address || '—'}</div>
        <div><b>GPS</b> {entry.client_location || 'Not shared'}</div>
        {entry.record_id && <div><b>Record ID</b> {entry.record_id}</div>}
        {entry.note && <div style={{ gridColumn: '1 / -1' }}><b>Note</b> {entry.note}</div>}
        {entry.user_agent && <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all' }}><b>Device</b> {entry.user_agent}</div>}
        <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11 }}><b>Hash</b> {entry.row_hash}</div>
      </div>
    </div>
  )
}

function RequestList({ requests, votes, admins, userId, onVote }) {
  if (requests.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No restore requests yet. Use ♻️ Restore on a deleted or edited record in the Activity Log.</div>
  }

  const STATUS_CLASS = { PENDING: 'badge-pending', EXECUTED: 'badge-done', REJECTED: 'badge-rejected', FAILED: 'badge-rejected' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {requests.map(r => {
        const rVotes = votes.filter(v => v.request_id === r.id)
        const myVote = rVotes.find(v => v.admin_id === userId)
        const e = r.entry
        return (
          <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Restore {e?.action === 'DELETE' ? 'deleted' : 'previous version of'} {MODULES[e?.table_name] || e?.table_name} record
                </div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{e && recordLabel(e)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Originally {e?.action === 'DELETE' ? 'deleted' : 'edited'} by {e?.actor_name || 'unknown'} on {e && format(parseISO(e.occurred_at), 'dd MMM yyyy HH:mm')}
                  {' · '}Requested by {r.requester?.full_name} on {format(parseISO(r.created_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
              <span className={`badge ${STATUS_CLASS[r.status]}`} style={{ alignSelf: 'flex-start' }}>{r.status}</span>
            </div>

            <div style={{ fontSize: 13, background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <b>Reason:</b> {r.reason}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: r.status === 'PENDING' && !myVote ? 12 : 0 }}>
              {admins.map(a => {
                const v = rVotes.find(x => x.admin_id === a.id)
                const style = !v ? { bg: '#f5f5f5', color: 'var(--text-muted)', icon: '⏳' }
                  : v.approve ? { bg: '#e8f5e9', color: '#2e7d32', icon: '✔' } : { bg: '#fde8e8', color: '#c62828', icon: '✖' }
                return (
                  <span key={a.id} title={v?.comment || ''}
                    style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    {style.icon} {a.full_name} ({a.admin_code})
                  </span>
                )
              })}
            </div>

            {r.status === 'PENDING' && !myVote && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onVote({ request: r, approve: true })} className="btn btn-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}>Approve</button>
                <button onClick={() => onVote({ request: r, approve: false })} className="btn btn-sm btn-danger">Reject</button>
              </div>
            )}
            {r.result_note && r.status !== 'PENDING' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{r.result_note}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RestoreModal({ entry, adminCount, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (ev) => {
    ev.preventDefault()
    setSaving(true); setError('')
    const { error: err } = await supabase.rpc('sat_request_restore', { p_audit_id: entry.id, p_reason: reason })
    setSaving(false)
    if (err) setError(err.message)
    else onDone()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">Request Restore</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14 }}>
            {entry.action === 'DELETE' ? 'Bring back the deleted' : 'Revert to the previous version of the'} <b>{MODULES[entry.table_name] || entry.table_name}</b> record:
            <div style={{ marginTop: 6, fontWeight: 600 }}>{recordLabel(entry)}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why should this record be restored?" />
          </div>
          <div style={{ background: 'rgba(217,119,70,0.08)', border: '1px solid rgba(217,119,70,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--orange-mid)' }}>
            ⚠️ All {adminCount} admins must approve. Your request counts as your approval. A single rejection cancels it.
          </div>
          {error && <div style={{ color: '#c62828', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VoteModal({ request, approve, onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (ev) => {
    ev.preventDefault()
    setSaving(true); setError('')
    const { data, error: err } = await supabase.rpc('sat_vote_restore', { p_request: request.id, p_approve: approve, p_comment: comment })
    setSaving(false)
    if (err) return setError(err.message)
    if (typeof data === 'string' && data.startsWith('FAILED')) return setError(`Approved, but the restore could not be applied: ${data.slice(8)}`)
    onDone()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">{approve ? 'Approve Restore' : 'Reject Restore'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14 }}>
            {approve
              ? 'If you are the last admin to approve, the record will be restored immediately.'
              : 'Rejecting cancels this request permanently. A new request can be made later.'}
          </div>
          <div className="form-group">
            <label className="form-label">Comment {approve ? '(optional)' : '*'}</label>
            <textarea required={!approve} rows={2} value={comment} onChange={e => setComment(e.target.value)} />
          </div>
          {error && <div style={{ color: '#c62828', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" disabled={saving} className={`btn ${approve ? 'btn-primary' : 'btn-danger'}`} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Saving…' : approve ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
