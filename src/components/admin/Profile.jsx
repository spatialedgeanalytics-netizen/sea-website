import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function Profile() {
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    if (profile) setData({ ...profile })
  }, [profile])

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    const { error } = await supabase.from('admin_profiles').update({
      full_name: data.full_name, phone: data.phone, dob: data.dob || null,
    }).eq('id', user.id)
    setMsg(error ? 'Failed to save: ' + error.message : 'Profile updated successfully.')
    setSaving(false)
  }

  const changePassword = async (e) => {
    e.preventDefault(); setPwMsg('')
    if (pwForm.next !== pwForm.confirm) { setPwMsg('New passwords do not match.'); return }
    if (pwForm.next.length < 6) { setPwMsg('Password must be at least 6 characters.'); return }
    setPwSaving(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: authUser.email, password: pwForm.current })
    if (verifyErr) { setPwMsg('Current password is incorrect.'); setPwSaving(false); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwMsg(error ? 'Failed: ' + error.message : 'Password changed successfully.')
    if (!error) setPwForm({ current: '', next: '', confirm: '' })
    setPwSaving(false)
  }

  const uploadFile = async (file, field, bucket = 'sea-documents') => {
    if (!file) return
    setUploading(field)
    const ext = file.name.split('.').pop()
    const path = `${field}/${user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(''); return }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    await supabase.from('admin_profiles').update({ [field]: publicUrl }).eq('id', user.id)
    setData(d => ({ ...d, [field]: publicUrl }))
    setUploading('')
  }

  if (!data) return <div style={{ padding: 60, textAlign: 'center' }}>Loading...</div>

  const initials = data.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>My Profile</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{data.admin_code} · {data.role_title}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Avatar + signature row */}
        <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 120 }}>
            {data.avatar_url
              ? <img src={data.avatar_url} alt="avatar" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--orange)' }} />
              : <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, border: '3px solid var(--orange)' }}>{initials}</div>
            }
            <label style={{ cursor: 'pointer', fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
              {uploading === 'avatar_url' ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0], 'avatar_url')} />
            </label>
          </div>

          {/* Signature */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-dark)', marginBottom: 10 }}>
              My Signature
            </div>
            {data.signature_url
              ? <img src={data.signature_url} alt="signature" style={{ maxHeight: 60, maxWidth: 200, border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#fff', display: 'block', marginBottom: 8 }} />
              : <div style={{ height: 60, width: 200, border: '2px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>No signature uploaded</div>
            }
            <label style={{ cursor: 'pointer', fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
              {uploading === 'signature_url' ? 'Uploading...' : data.signature_url ? 'Replace Signature' : 'Upload Signature'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0], 'signature_url')} />
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Upload a clear image of your handwritten signature (PNG with transparent background preferred).
            </p>
          </div>

          {/* ID Document */}
          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-dark)', marginBottom: 10 }}>
              ID Document
            </div>
            {data.id_document_url
              ? <a href={data.id_document_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ marginBottom: 8, display: 'inline-block' }}>View ID</a>
              : <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>No ID uploaded</div>
            }
            <div style={{ display: 'block' }}>
              <label style={{ cursor: 'pointer', fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
                {uploading === 'id_document_url' ? 'Uploading...' : data.id_document_url ? 'Replace ID' : 'Upload ID'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0], 'id_document_url')} />
              </label>
            </div>
          </div>
        </div>

        {/* Personal details */}
        <form onSubmit={save} className="card">
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Personal Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input value={data.full_name || ''} onChange={e => setData(d => ({ ...d, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Code</label>
                <input value={data.admin_code || ''} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input value={data.phone || ''} onChange={e => setData(d => ({ ...d, phone: e.target.value }))} placeholder="+263..." />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" value={data.dob || ''} onChange={e => setData(d => ({ ...d, dob: e.target.value }))} />
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Role / Title</label>
                <input value={data.role_title || ''} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            {msg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 14, background: msg.includes('success') ? '#e8f5e9' : '#fde8e8', color: msg.includes('success') ? '#2e7d32' : '#c62828' }}>
                {msg}
              </div>
            )}
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change password */}
        <form onSubmit={changePassword} className="card">
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Change Password</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" />
              </div>
            </div>
            {pwMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 14, background: pwMsg.includes('success') ? '#e8f5e9' : '#fde8e8', color: pwMsg.includes('success') ? '#2e7d32' : '#c62828' }}>
                {pwMsg}
              </div>
            )}
            <button type="submit" disabled={pwSaving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
