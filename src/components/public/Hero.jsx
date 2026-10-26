import React, { useEffect, useRef } from 'react'

const SLIDES = [
  {
    bg: 'linear-gradient(135deg, #1A2D42 0%, #2B435D 60%, #1A2D42 100%)',
    tag: 'Geospatial Intelligence',
    title: 'Innovation Through Location',
    subtitle: 'Empowering agriculture, environment, mining and planning sectors with precision geospatial analytics and cutting-edge spatial technology.',
    cta1: { label: 'Explore Services', href: '#services' },
    cta2: { label: 'Contact Us', href: '#contact' },
    overlay: true,
  },
  {
    bg: 'linear-gradient(135deg, #2B435D 0%, #1A2D42 100%)',
    tag: 'Agricultural Intelligence',
    title: 'Smarter Farming Starts with Data',
    subtitle: 'From crop health monitoring to yield prediction — we turn satellite and drone imagery into actionable farm intelligence.',
    cta1: { label: 'View Ag Services', href: '#services' },
    cta2: { label: 'Get a Quote', href: '#contact' },
    overlay: true,
  },
  {
    bg: 'linear-gradient(135deg, #1A2D42 0%, #8C3B1A 100%)',
    tag: 'Environmental Compliance',
    title: 'Protecting Natural Resources Through Science',
    subtitle: 'EIAs, environmental monitoring, water surveys, and forest tracking — all backed by satellite data and rigorous field methodology.',
    cta1: { label: 'Our Solutions', href: '#services' },
    cta2: { label: 'Learn More', href: '#about' },
    overlay: true,
  },
]

export default function Hero() {
  const [current, setCurrent] = React.useState(0)
  const timer = useRef(null)

  useEffect(() => {
    timer.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 6000)
    return () => clearInterval(timer.current)
  }, [])

  const slide = SLIDES[current]

  const handleScroll = (href) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="home" style={{
      minHeight: '100vh',
      background: slide.bg,
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 1s',
    }}>
      {/* Decorative globe grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 70% 50%, rgba(217,119,70,0.12) 0%, transparent 60%),
          url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='39' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cline x1='0' y1='40' x2='80' y2='40' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cline x1='40' y1='0' x2='40' y2='80' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: 'auto, 80px 80px',
        pointerEvents: 'none',
      }} />

      {/* Constellation dots */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            background: 'rgba(194,159,98,0.6)',
            borderRadius: '50%',
            left: `${5 + (i * 47 % 90)}%`,
            top: `${10 + (i * 37 % 80)}%`,
            animation: `pulse ${2 + i % 3}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 80px', position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ maxWidth: 700 }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(217,119,70,0.2)', border: '1px solid rgba(217,119,70,0.4)',
            color: 'var(--orange-light)', padding: '6px 16px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 24,
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--orange)', borderRadius: '50%' }} />
            {slide.tag}
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            {slide.title.includes('Location') ? (
              <>
                {slide.title.split('Location')[0]}
                <span style={{ color: 'var(--orange)' }}>Location</span>
                {slide.title.split('Location')[1]}
              </>
            ) : slide.title}
          </h1>

          {/* Sub */}
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 1.7, marginBottom: 40, maxWidth: 580 }}>
            {slide.subtitle}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button onClick={() => handleScroll(slide.cta1.href)}
              className="btn btn-primary btn-lg">
              {slide.cta1.label}
            </button>
            <button onClick={() => handleScroll(slide.cta2.href)}
              className="btn btn-secondary btn-lg">
              {slide.cta2.label}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap' }}>
            {[['19+', 'Service Offerings'], ['Multiple', 'Economic Sectors'], ['100%', 'Data-Driven']].map(([num, label]) => (
              <div key={label}>
                <div style={{ color: 'var(--orange)', fontSize: 28, fontWeight: 900 }}>{num}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logo watermark right */}
      <div style={{
        position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)',
        opacity: 0.06, pointerEvents: 'none', display: 'none',
      }} className="hero-logo-watermark">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ width: 500 }} />
      </div>

      {/* Slide dots */}
      <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => { clearInterval(timer.current); setCurrent(i) }}
            style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 4, border: 'none', transition: 'all 0.3s', background: i === current ? 'var(--orange)' : 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 36, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.6 }}>
        <span style={{ color: '#fff', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>Scroll</span>
        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.4)' }} />
      </div>

      <style>{`
        @keyframes pulse { from { opacity: 0.3 } to { opacity: 1 } }
        @media (min-width: 1024px) { .hero-logo-watermark { display: block !important; } }
      `}</style>
    </section>
  )
}
