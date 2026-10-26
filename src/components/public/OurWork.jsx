import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function OurWork() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    supabase.from('gallery').select('id, title, category, image_url').order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])

  const categories = ['All', ...new Set(items.map(i => i.category))]
  const displayed = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory)

  if (!loading && items.length === 0) return null

  return (
    <section id="our-work" style={{ background: 'var(--bg-light)', padding: '56px 24px 100px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(217,119,70,0.12)',
            color: 'var(--orange-mid)', padding: '6px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            Our Work
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'var(--navy-dark)', marginBottom: 16 }}>
            Evidence in the <span style={{ color: 'var(--orange)' }}>Field</span>
          </h2>
          <p style={{ color: 'var(--navy)', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
            A selection of real projects and field work carried out across Zimbabwe by our team.
          </p>
        </div>

        {/* Category filter */}
        {!loading && categories.length > 2 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 20px', borderRadius: 20, border: '2px solid',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: activeCategory === cat ? 'var(--orange)' : 'var(--border)',
                  background: activeCategory === cat ? 'var(--orange)' : '#fff',
                  color: activeCategory === cat ? '#fff' : 'var(--navy)',
                }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 220, background: '#d8e0e8', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ padding: '20px 22px 22px', background: '#fff' }}>
                  <div style={{ height: 16, background: '#e8ecf0', borderRadius: 6, marginBottom: 10, width: '70%' }} />
                  <div style={{ height: 12, background: '#e8ecf0', borderRadius: 6, width: '90%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {displayed.map(item => (
              <div key={item.id}
                onClick={() => setLightbox(item)}
                style={{
                  borderRadius: 14, overflow: 'hidden', background: '#fff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  cursor: 'pointer', transition: 'transform 0.25s, box-shadow 0.25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)' }}>

                {/* Image area */}
                <div style={{ height: 220, position: 'relative', overflow: 'hidden', background: '#d0d8e4' }}>
                  <img src={item.image_url} alt={item.title || item.category}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  {/* Hover overlay */}
                  <div className="work-overlay" style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(26,45,66,0.78)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.28s', padding: '0 20px', textAlign: 'center',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
                      {item.title || item.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '20px 22px 22px' }}>
                  {item.title && (
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 10, lineHeight: 1.3 }}>
                      {item.title}
                    </h3>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(26,45,66,0.08)', color: 'var(--navy)',
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {item.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.90)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={lightbox.image_url} alt={lightbox.title || lightbox.category}
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />
            {(lightbox.title || lightbox.category) && (
              <div style={{
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                padding: '12px 18px', borderRadius: '0 0 12px 12px',
              }}>
                {lightbox.title && <div style={{ fontWeight: 700, fontSize: 16 }}>{lightbox.title}</div>}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{lightbox.category}</div>
              </div>
            )}
            <button onClick={() => setLightbox(null)} style={{
              position: 'absolute', top: -14, right: -14,
              background: '#fff', border: 'none', borderRadius: '50%',
              width: 34, height: 34, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        div:hover .work-overlay { opacity: 1 !important; }
      `}</style>
    </section>
  )
}
