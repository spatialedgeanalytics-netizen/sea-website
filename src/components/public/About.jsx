import React from 'react'

const PILLARS = [
  { icon: '⚖️', label: 'Ethical Practice', desc: 'Unwavering commitment to ethical conduct and integrity in every engagement.' },
  { icon: '🛰️', label: 'Cutting-Edge Tech', desc: 'Mastery of the latest geospatial tools, satellites, drones and AI analytics.' },
  { icon: '🤝', label: 'Collaborative Teams', desc: 'Strong interdisciplinary teamwork bridging science, technology, and business.' },
  { icon: '📈', label: 'Strategic Growth', desc: 'Smart contract sourcing and cash flow management for sustainable scale.' },
]

export default function About() {
  return (
    <section id="about" style={{ background: 'var(--navy-dark)', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(217,119,70,0.15)',
            color: 'var(--orange)', padding: '6px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            Who We Are
          </div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, marginBottom: 20 }}>
            Driving Decisions Through <span style={{ color: 'var(--orange)' }}>Spatial Intelligence</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17, maxWidth: 640, margin: '0 auto', lineHeight: 1.75 }}>
            Spatial Edge Analytics (SEA) is a geospatial consulting company serving agriculture, environment, mining, planning, and infrastructure sectors across Southern Africa and beyond.
          </p>
        </div>

        {/* Vision / Mission grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 64 }}>
          {[
            {
              icon: '🎯',
              label: 'Our Vision',
              color: 'var(--orange)',
              text: 'To establish a centre of excellence in geospatial science and technology that drives sustainable, innovative, and data-driven solutions for global industry challenges.',
            },
            {
              icon: '🚀',
              label: 'Our Mission',
              color: 'var(--gold)',
              text: 'To deliver precise, actionable geospatial intelligence that empowers organisations to make better decisions — faster, smarter, and with greater impact across every economic sector.',
            },
            {
              icon: '🏆',
              label: 'Our Goals',
              color: '#5ec4ff',
              text: 'Achieve operational excellence, secure major contracts, expand service offerings, build a brand reputation for reliability, and explore opportunities for regional and continental expansion.',
            },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: 32,
            }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ color: item.color, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{item.label}</div>
              <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: 15 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 64 }}>
          <h3 style={{ color: 'var(--gold)', textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 40, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Success Built On
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {PILLARS.map(p => (
              <div key={p.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                padding: '28px 20px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-lg)',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(217,119,70,0.4)'; e.currentTarget.style.background = 'rgba(217,119,70,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <div style={{ fontSize: 32, marginBottom: 14 }}>{p.icon}</div>
                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10, fontSize: 16 }}>{p.label}</div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.65 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Motto */}
        <div style={{ textAlign: 'center', marginTop: 72 }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, var(--orange-dark), var(--orange))',
            padding: '18px 40px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            boxShadow: '0 8px 32px rgba(217,119,70,0.35)',
          }}>
            INNOVATION THROUGH LOCATION &nbsp;|&nbsp; 📍
          </div>
        </div>
      </div>
    </section>
  )
}
