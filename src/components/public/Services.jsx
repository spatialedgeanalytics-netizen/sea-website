import React, { useEffect, useState } from 'react'
import { SERVICES, CATEGORIES } from '../../data/services'
import { supabase } from '../../lib/supabase'


export default function Services() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [modal, setModal] = useState(null)
  const [galleryMap, setGalleryMap] = useState({})

  useEffect(() => {
    supabase.from('gallery').select('service_id, image_url').not('service_id', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(item => { map[item.service_id] = item.image_url })
        setGalleryMap(map)
      })
  }, [])

  const categories = ['All', ...CATEGORIES]
  const filtered = activeCategory === 'All' ? SERVICES : SERVICES.filter(s => s.category === activeCategory)

  return (
    <section id="services" style={{ background: '#fff', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(217,119,70,0.12)',
            color: 'var(--orange-mid)', padding: '6px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            Our Services
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'var(--navy-dark)', marginBottom: 16 }}>
            Products & <span style={{ color: 'var(--orange)' }}>Services</span>
          </h2>
          <p style={{ color: 'var(--navy)', fontSize: 17, maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
            A comprehensive suite of geospatial and environmental services tailored to every economic sector.
          </p>
        </div>

        {/* Filter tabs */}
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

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {filtered.map(service => {
            const photo = galleryMap[service.id]
            return (
              <div key={service.id}
                onClick={() => setModal(service)}
                style={{
                  borderRadius: 14, overflow: 'hidden', background: '#fff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  cursor: 'pointer', transition: 'transform 0.25s, box-shadow 0.25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)' }}>

                {/* Visual area — photo if available, else plain icon */}
                <div style={{
                  width: '100%', paddingTop: '62.5%', position: 'relative',
                  overflow: 'hidden', background: photo ? '#e8edf2' : '#f4f6f9',
                }}>
                  {photo ? (
                    <img src={photo} alt={service.short}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span style={{ fontSize: 56 }}>{service.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#aab4c0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{service.category}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '20px 22px 22px' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 8, lineHeight: 1.3 }}>
                    {service.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>
                    {service.description.slice(0, 110)}…
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(26,45,66,0.08)', color: 'var(--navy)',
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {service.category}
                    </span>
                    {service.deliverables.slice(0, 2).map(d => (
                      <span key={d} style={{
                        background: 'rgba(217,119,70,0.1)', color: 'var(--orange)',
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(10,20,35,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              height: 160,
              background: galleryMap[modal.id]
                ? `url(${galleryMap[modal.id]}) center/cover`
                : '#1A2D42',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 28px', position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,35,0.55)' }} />
              <span style={{ fontSize: 52, position: 'relative', zIndex: 1 }}>{modal.icon}</span>
              <button onClick={() => setModal(null)} style={{
                position: 'absolute', top: 16, right: 16, zIndex: 2,
                background: 'rgba(255,255,255,0.2)', border: 'none',
                color: '#fff', width: 32, height: 32, borderRadius: '50%',
                fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
              <span style={{
                position: 'relative', zIndex: 1,
                background: 'rgba(217,119,70,0.9)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '4px 12px',
                borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {modal.category}
              </span>
            </div>

            <div style={{ padding: '28px 32px 32px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy-dark)', marginBottom: 14 }}>{modal.title}</h2>
              <p style={{ color: 'var(--navy)', fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>{modal.description}</p>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--orange)', marginBottom: 12 }}>
                Deliverables
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 28 }}>
                {modal.deliverables.map(d => (
                  <li key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--navy-dark)' }}>
                    <span style={{ color: 'var(--orange)', fontSize: 16, flexShrink: 0 }}>✓</span> {d}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => { setModal(null); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px' }}>
                Enquire About This Service →
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
