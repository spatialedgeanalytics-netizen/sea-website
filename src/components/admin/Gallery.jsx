import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SERVICES } from '../../data/services'

export default function Gallery() {
  const { user } = useAuth()
  const [photoMap, setPhotoMap] = useState({})   // { [service_id]: { id, image_url, storage_path } }
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)  // service_id currently uploading
  const fileRefs = useRef({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('gallery')
      .select('id, service_id, image_url')
      .not('service_id', 'is', null)
    const map = {}
    if (data) data.forEach(row => { map[row.service_id] = row })
    setPhotoMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (service, file) => {
    if (!file) return
    setUploading(service.id)

    const ext = file.name.split('.').pop()
    // Unique path per upload: old photos stay in storage so the Audit Trail can restore them
    const path = `gallery/service_${service.id}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('sea-documents').upload(path, file)
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(null); return }

    const existing = photoMap[service.id]
    if (existing) await supabase.from('gallery').delete().eq('id', existing.id)

    const { data: { publicUrl } } = supabase.storage.from('sea-documents').getPublicUrl(path)
    await supabase.from('gallery').insert({
      service_id: service.id,
      category: service.category,
      title: service.short,
      image_url: publicUrl,
      uploaded_by: user.id,
    })

    setUploading(null)
    load()
  }

  const handleDelete = async (service) => {
    const existing = photoMap[service.id]
    if (!existing) return
    if (!confirm(`Remove photo for "${service.short}"?`)) return
    await supabase.from('gallery').delete().eq('id', existing.id)
    load()
  }

  // Group services by category for display
  const byCategory = {}
  SERVICES.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = []
    byCategory[s.category].push(s)
  })

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Service Photos</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Upload one photo per service. It will appear as the card image on the public website.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        Object.entries(byCategory).map(([category, services]) => (
          <div key={category} style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--orange)',
              marginBottom: 16, paddingBottom: 8,
              borderBottom: '2px solid var(--border)',
            }}>
              {category}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {services.map(service => {
                const photo = photoMap[service.id]
                const isUploading = uploading === service.id

                return (
                  <div key={service.id} style={{
                    borderRadius: 12, overflow: 'hidden', background: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: photo ? '2px solid #c8e6c9' : '2px solid var(--border)',
                  }}>
                    {/* Image area */}
                    <div style={{ height: 150, position: 'relative', background: 'var(--bg-light)', overflow: 'hidden' }}>
                      {photo ? (
                        <>
                          <img src={photo.image_url} alt={service.short}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center', padding: '0 12px' }}>
                              {service.icon} {service.short}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ fontSize: 36 }}>{service.icon}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>No photo yet</span>
                        </div>
                      )}
                    </div>

                    {/* Info + actions */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 10, lineHeight: 1.3 }}>
                        {service.short}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* Hidden file input */}
                        <input
                          type="file" accept="image/*"
                          ref={el => fileRefs.current[service.id] = el}
                          style={{ display: 'none' }}
                          onChange={e => { handleUpload(service, e.target.files[0]); e.target.value = '' }}
                        />
                        <button
                          onClick={() => fileRefs.current[service.id]?.click()}
                          disabled={isUploading}
                          style={{
                            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                            background: 'var(--orange)', color: '#fff',
                            fontSize: 12, fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer',
                            opacity: isUploading ? 0.7 : 1,
                          }}>
                          {isUploading ? 'Uploading…' : photo ? 'Replace' : 'Upload'}
                        </button>
                        {photo && (
                          <button
                            onClick={() => handleDelete(service)}
                            style={{
                              padding: '7px 10px', borderRadius: 8, border: 'none',
                              background: '#fde8e8', color: '#c62828',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
