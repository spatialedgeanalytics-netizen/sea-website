import React from 'react'
import { SERVICES } from '../../data/services'

const PHONE = '0780874212'
const EMAIL = 'admin@sea.co.zw'
const WA = '263780874212'

export default function Footer() {
  const scroll = (id) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer style={{ background: '#0f1e2e', color: 'rgba(255,255,255,0.7)', paddingTop: 64 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 48, paddingBottom: 56, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SEA" style={{ height: 48, width: 48, objectFit: 'contain' }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>SPATIAL EDGE</div>
                <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em' }}>ANALYTICS</div>
              </div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, marginBottom: 24 }}>
              Geospatial consulting for agriculture, environment, mining, planning and beyond. Innovation through location.
            </p>
            <div style={{
              display: 'inline-block',
              background: 'rgba(217,119,70,0.15)',
              border: '1px solid rgba(217,119,70,0.3)',
              color: 'var(--orange)', padding: '7px 18px', borderRadius: 20,
              fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            }}>
              INNOVATION THROUGH LOCATION | 📍
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Navigation</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Home', '#home'], ['About', '#about'], ['Services', '#services'], ['Opportunities', '#opportunities'], ['Contact', '#contact']].map(([label, href]) => (
                <li key={href}>
                  <a href={href} onClick={(e) => { e.preventDefault(); scroll(href) }}
                    style={{ fontSize: 14, transition: 'color 0.2s', display: 'inline-block' }}
                    onMouseEnter={e => e.target.style.color = 'var(--orange)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services sample */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Services</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SERVICES.slice(0, 8).map(s => (
                <li key={s.id}>
                  <a href="#services" onClick={(e) => { e.preventDefault(); scroll('#services') }}
                    style={{ fontSize: 14, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--orange)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>
                    {s.icon} {s.short}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <a href={`mailto:${EMAIL}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--orange)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                <span>✉️</span> {EMAIL}
              </a>
              <a href={`tel:${PHONE}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--orange)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                <span>📞</span> {PHONE}
              </a>
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#25d366', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <span>💬</span> WhatsApp
              </a>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <a href="https://x.com/SEA_Pvt_Ltd" target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  𝕏
                </a>
                <a href="https://www.instagram.com/spatial_edge_analytics" target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  📷
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13 }}>© {new Date().getFullYear()} Spatial Edge Analytics Pvt Ltd. All rights reserved.</div>
          <div style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600, letterSpacing: '0.05em' }}>INNOVATION THROUGH LOCATION | 📍</div>
        </div>
      </div>
    </footer>
  )
}
