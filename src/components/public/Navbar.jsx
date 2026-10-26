import React, { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Opportunities', href: '#opportunities' },
    { label: 'Contact', href: '#contact' },
  ]

  const handleNav = (href) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      background: scrolled ? 'rgba(26,45,66,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      transition: 'all 0.3s',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>

        {/* Logo + Name */}
        <a href="#home" onClick={(e) => { e.preventDefault(); handleNav('#home') }}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SEA Logo" style={{ height: 44, width: 44, objectFit: 'contain' }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>SPATIAL EDGE</div>
            <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em' }}>ANALYTICS</div>
          </div>
        </a>

        {/* Desktop links */}
        <ul style={{ display: 'flex', gap: 8, listStyle: 'none', alignItems: 'center' }}
          className="nav-desktop">
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => { e.preventDefault(); handleNav(l.href) }}
                style={{ color: '#fff', fontWeight: 600, fontSize: 15, padding: '6px 14px', borderRadius: 6, transition: 'background 0.2s', display: 'block' }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href={`${import.meta.env.BASE_URL}admin`} onClick={(e) => { e.preventDefault(); window.location.href = `${import.meta.env.BASE_URL}admin` }}
              className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
              Admin
            </a>
          </li>
        </ul>

        {/* Hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', color: '#fff', fontSize: 26, padding: 4 }}
          className="nav-hamburger" aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: 'rgba(26,45,66,0.98)', padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); handleNav(l.href) }}
              style={{ display: 'block', color: '#fff', fontWeight: 600, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 16 }}>
              {l.label}
            </a>
          ))}
          <a href={`${import.meta.env.BASE_URL}admin`} onClick={(e) => { e.preventDefault(); window.location.href = `${import.meta.env.BASE_URL}admin` }}
            className="btn btn-primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
            Admin Portal
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
