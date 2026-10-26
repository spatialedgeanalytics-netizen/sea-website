import React from 'react'
import Navbar from '../components/public/Navbar'
import Hero from '../components/public/Hero'
import About from '../components/public/About'
import Services from '../components/public/Services'
import Contact from '../components/public/Contact'
import JobOpportunities from '../components/public/JobOpportunities'
import Footer from '../components/public/Footer'

function ConsultationCTA() {
  return (
    <section style={{
      background: 'var(--navy-dark)',
      padding: '72px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(217,119,70,0.18)',
          color: 'var(--orange)', padding: '6px 18px', borderRadius: 20,
          fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 24,
        }}>
          Custom Solutions
        </div>
        <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
          Need a solution tailored to<br />your project?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17, marginBottom: 36, lineHeight: 1.7 }}>
          We tailor our geospatial services to the exact needs of your land, budget, and timeline. Get in touch and we'll put together a plan.
        </p>
        <button
          onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
          className="btn btn-primary btn-lg"
          style={{ fontSize: 16, padding: '14px 36px' }}>
          Request a Consultation →
        </button>
      </div>
    </section>
  )
}

export default function PublicPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <ConsultationCTA />
        <JobOpportunities />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
