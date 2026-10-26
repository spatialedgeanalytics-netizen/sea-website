import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO, isPast } from 'date-fns'

const STATUSES = ['TO DO', 'IN PROGRESS', 'DONE']
const STATUS_COLORS = { 'TO DO': 'badge-todo', 'IN PROGRESS': 'badge-inprogress', 'DONE': 'badge-done' }

export default function Tasks() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentFile, setCommentFile] = useState(null)
  const [sendingComment, setSendingComment] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', deadline: '', definition_of_done: '' })

  const load = async () => {
    setLoading(true)
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('tasks')
        .select('*, assigned_to_profile:admin_profiles!assigned_to(full_name,admin_code), assigned_by_profile:admin_profiles!assigned_by(full_name,admin_code)')
        .order('created_at', { ascending: false }),
      supabase.from('admin_profiles').select('id,full_name,admin_code'),
    ])
    setTasks(t || [])
    setAdmins(a || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openTask = async (task) => {
    setSelectedTask(task)
    const { data } = await supabase.from('task_comments')
      .select('*, user_profile:admin_profiles!user_id(full_name,admin_code)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const updateStatus = async (task, status) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', task.id)
    load()
    if (selectedTask?.id === task.id) setSelectedTask({ ...selectedTask, status })
  }

  const saveTask = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('tasks').insert({
      title: form.title, description: form.description,
      assigned_to: form.assigned_to || null, assigned_by: user.id,
      deadline: form.deadline || null, definition_of_done: form.definition_of_done,
      status: 'TO DO',
    })
    setShowForm(false)
    setForm({ title: '', description: '', assigned_to: '', deadline: '', definition_of_done: '' })
    load(); setSaving(false)
  }

  const addComment = async (e) => {
    e.preventDefault(); if (!commentText.trim() && !commentFile) return
    setSendingComment(true)
    let attachUrl = null
    if (commentFile) {
      const path = `task-attachments/${selectedTask.id}/${Date.now()}_${commentFile.name}`
      const { error } = await supabase.storage.from('sea-documents').upload(path, commentFile)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('sea-documents').getPublicUrl(path)
        attachUrl = publicUrl
      }
    }
    await supabase.from('task_comments').insert({
      task_id: selectedTask.id, user_id: user.id,
      comment: commentText.trim(), attachment_url: attachUrl,
    })
    setCommentText(''); setCommentFile(null)
    const { data } = await supabase.from('task_comments')
      .select('*, user_profile:admin_profiles!user_id(full_name,admin_code)')
      .eq('task_id', selectedTask.id).order('created_at', { ascending: true })
    setComments(data || [])
    setSendingComment(false)
  }

  const filtered = tasks.filter(t => filterStatus === 'all' ? true : t.status === filterStatus)
  const myTasks = filtered.filter(t => t.assigned_to === user?.id)
  const otherTasks = filtered.filter(t => t.assigned_to !== user?.id)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Tasks</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Assign, track, and manage work items</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Create Task</button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['all', 'All'], ...STATUSES.map(s => [s, s])].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)} className={`btn btn-sm ${filterStatus === val ? 'btn-primary' : 'btn-outline'}`}>{lbl}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(task => {
            const overdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'DONE'
            return (
              <div key={task.id}
                onClick={() => openTask(task)}
                style={{
                  background: '#fff', borderRadius: 'var(--radius-lg)',
                  border: overdue ? '2px solid #e74c3c' : '2px solid transparent',
                  boxShadow: 'var(--shadow)', padding: 20, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = task.status === 'DONE' ? 'var(--shadow)' : 'var(--shadow)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span className={`badge ${STATUS_COLORS[task.status]}`}>{task.status}</span>
                  {overdue && <span style={{ fontSize: 12, color: '#e74c3c', fontWeight: 700 }}>⚠️ OVERDUE</span>}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--navy-dark)' }}>{task.title}</h3>

                {task.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {task.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {task.assigned_to_profile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {task.assigned_to_profile.full_name?.charAt(0)}
                      </div>
                      <span style={{ color: 'var(--navy)' }}>{task.assigned_to_profile.full_name}</span>
                    </div>
                  )}
                  {task.deadline && (
                    <div style={{ fontSize: 12, color: overdue ? '#e74c3c' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>
                      📅 {format(parseISO(task.deadline), 'dd MMM yyyy')}
                    </div>
                  )}
                  {task.assigned_by_profile && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned by {task.assigned_by_profile.full_name}</div>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p>No tasks found. {filterStatus !== 'all' ? 'Try a different filter.' : 'Create your first task!'}</p>
            </div>
          )}
        </div>
      )}

      {/* Create task modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Task</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={saveTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the task..." rows={4} />
                </div>
                <div className="form-group">
                  <label className="form-label">Definition of Done</label>
                  <textarea value={form.definition_of_done} onChange={e => setForm(f => ({ ...f, definition_of_done: e.target.value }))} placeholder="What does 'done' look like for this task?" rows={3} />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {admins.map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.admin_code})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                </div>
                <div style={{ background: 'rgba(26,45,66,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--navy)' }}>
                  The assigned person will be notified to check SEA Chat for new task assignments.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div className="modal-title">{selectedTask.title}</div>
                {selectedTask.assigned_to_profile && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Assigned to {selectedTask.assigned_to_profile.full_name} · by {selectedTask.assigned_by_profile?.full_name}
                  </div>
                )}
              </div>
              <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Status selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(selectedTask, s)}
                    className={`btn btn-sm ${selectedTask.status === s ? 'btn-primary' : 'btn-outline'}`}>
                    {s}
                  </button>
                ))}
                {selectedTask.deadline && (
                  <div style={{ marginLeft: 'auto', fontSize: 13, color: isPast(parseISO(selectedTask.deadline)) && selectedTask.status !== 'DONE' ? '#e74c3c' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    📅 Deadline: {format(parseISO(selectedTask.deadline), 'dd MMM yyyy HH:mm')}
                  </div>
                )}
              </div>

              {selectedTask.description && (
                <div style={{ background: 'var(--bg-light)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Description</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.definition_of_done && (
                <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2e7d32', marginBottom: 8 }}>Definition of Done</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedTask.definition_of_done}</p>
                </div>
              )}

              {/* Comments */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--navy-dark)' }}>Comments & Updates ({comments.length})</div>
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {c.user_profile?.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user_profile?.full_name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(parseISO(c.created_at), 'dd MMM HH:mm')}</span>
                      </div>
                      {c.comment && <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.comment}</p>}
                      {c.attachment_url && (
                        <a href={c.attachment_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--orange)', marginTop: 6, fontWeight: 600 }}>
                          📎 Attachment
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No comments yet.</p>}
              </div>
            </div>

            {/* Comment input */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
              <form onSubmit={addComment}>
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment or update..." rows={3} style={{ marginBottom: 10 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--navy)' }}>
                    <span>📎</span>
                    <span>{commentFile ? commentFile.name : 'Attach file'}</span>
                    <input type="file" style={{ display: 'none' }} onChange={e => setCommentFile(e.target.files[0])} />
                  </label>
                  <button type="submit" disabled={sendingComment || (!commentText.trim() && !commentFile)} className="btn btn-primary btn-sm">
                    {sendingComment ? 'Sending...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
