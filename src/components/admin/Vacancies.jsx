import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

export default function Vacancies() {
  const { user } = useAuth()
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', department: '', description: '', requirements: '', deadline: '', is_active: true })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('job_vacancies')
      .select('*, posted_by_profile:admin_profiles!posted_by(full_name)')
      .order('created_at', { ascending: false })
    setVacancies(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('job_vacancies').insert({ ...form, posted_by: user.id })
    setShowForm(false)
    setForm({ title: '', department: '', description: '', requirements: '', deadline: '', is_active: true })
    load(); setSaving(false)
  }

  const toggle = async (v) => {
    await supabase.from('job_vacancies').update({ is_active: !v.is_active }).eq('id', v.id)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this vacancy? This cannot be undone.')) return
    await supabase.from('job_vacancies').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Job Vacancies</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage job postings shown on the public website</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Post Vacancy</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {vacancies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p>No vacancies posted yet.</p>
            </div>
          ) : vacancies.map(v => (
            <div key={v.id} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', padding: '24px 28px', borderLeft: `4px solid ${v.is_active ? 'var(--orange)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{v.title}</h3>
                    {v.department && <span style={{ background: 'var(--bg-light)', color: 'var(--navy)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{v.department}</span>}
                    <span className={v.is_active ? 'badge badge-done' : 'badge badge-todo'}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Posted by {v.posted_by_profile?.full_name} · {format(parseISO(v.created_at), 'dd MMM yyyy')}
                    {v.deadline && ` · Deadline: ${format(parseISO(v.deadline), 'dd MMM yyyy')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggle(v)} className="btn btn-sm btn-outline">
                    {v.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => del(v.id)} className="btn btn-sm btn-danger">Delete</button>
                </div>
              </div>
              {v.description && <p style={{ fontSize: 14, color: 'var(--navy)', lineHeight: 1.65, marginBottom: 8 }}>{v.description}</p>}
              {v.requirements && (
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--orange)', userSelect: 'none' }}>Requirements</summary>
                  <pre style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--navy)', lineHeight: 1.6 }}>{v.requirements}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Post New Vacancy</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., GIS Analyst" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g., Remote Sensing" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Role overview and responsibilities..." rows={4} />
                </div>
                <div className="form-group">
                  <label className="form-label">Requirements</label>
                  <textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Qualifications, experience, skills..." rows={4} />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Posting...' : 'Post Vacancy'}
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
