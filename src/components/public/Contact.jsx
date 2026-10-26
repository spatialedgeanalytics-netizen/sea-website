import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

const PHONE = '0780874212'
const EMAIL = 'admin@sea.co.zw'
const WA_NUMBER = '263780874212'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const { error: err } = await supabase.from('contact_enquiries').insert({
      name: form.name, email: form.email, phone: form.phone,
      subject: form.subject, message: form.message,
    })
    if (err) {
      setError('Failed to send message. Please email us directly at ' + EMAIL)
    } else {
      setSent(true)
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    }
    setSubmitting(false)
  }

  return (
    <section id="contact" style={{ background: 'var(--white)', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(217,119,70,0.12)',
            color: 'var(--orange-mid)', padding: '6px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            Get In Touch
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'var(--navy-dark)', marginBottom: 16 }}>
            Contact <span style={{ color: 'var(--orange)' }}>Us</span>
          </h2>
          <p style={{ color: 'var(--navy)', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
            Reach out for enquiries, quotes, or consultations. We respond within 24 hours.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>

          {/* Left: Info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <a href={`mailto:${EMAIL}`} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'var(--navy-dark)', borderRadius: 'var(--radius-lg)', padding: '22px 28px',
              transition: 'transform 0.2s, box-shadow 0.2s', color: '#fff',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 50, height: 50, background: 'var(--orange)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✉️</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{EMAIL}</div>
              </div>
            </a>

            {/* Phone */}
            <a href={`tel:${PHONE}`} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'var(--navy)', borderRadius: 'var(--radius-lg)', padding: '22px 28px',
              transition: 'transform 0.2s, box-shadow 0.2s', color: '#fff',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 50, height: 50, background: 'var(--gold-mid)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📞</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Phone</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{PHONE}</div>
              </div>
            </a>

            {/* WhatsApp */}
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: '#128c7e', borderRadius: 'var(--radius-lg)', padding: '22px 28px',
              transition: 'transform 0.2s, box-shadow 0.2s', color: '#fff',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 50, height: 50, background: '#25d366', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>💬</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>WhatsApp</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Chat with Us Directly</div>
              </div>
            </a>

            {/* Social */}
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="https://x.com/SEA_Pvt_Ltd" target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: '#000', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '18px', textAlign: 'center', fontWeight: 700, fontSize: 14, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                𝕏 Twitter
              </a>
              <a href="https://www.instagram.com/spatial_edge_analytics" target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '18px', textAlign: 'center', fontWeight: 700, fontSize: 14, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                📷 Instagram
              </a>
            </div>
          </div>

          {/* Right: Form */}
          <div className="card" style={{ boxShadow: 'var(--shadow-lg)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: 'var(--navy-dark)', marginBottom: 12, fontSize: 22 }}>Message Sent!</h3>
                <p style={{ color: 'var(--navy)', lineHeight: 1.7 }}>Thank you for reaching out. We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="btn btn-primary" style={{ marginTop: 24 }}>Send Another</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 24 }}>Send a Message</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input name="name" value={form.name} onChange={handle} required placeholder="John Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                      <input name="email" type="email" value={form.email} onChange={handle} placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input name="phone" value={form.phone} onChange={handle} placeholder="+263..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject *</label>
                      <select name="subject" value={form.subject} onChange={handle} required>
                        <option value="">Select service...</option>
                        <option value="Crop Health & Monitoring">Crop Health & Monitoring</option>
                        <option value="Crop Yield Prediction">Crop Yield Prediction</option>
                        <option value="Pegging / Survey">Pegging / Survey</option>
                        <option value="EIA">Environmental Impact Assessment</option>
                        <option value="Topographical Analysis">Topographical Analysis</option>
                        <option value="Soil Analysis">Soil Analysis</option>
                        <option value="Land Use Planning">Land Use Planning</option>
                        <option value="General Enquiry">General Enquiry</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message *</label>
                    <textarea name="message" value={form.message} onChange={handle} required placeholder="Tell us about your project..." rows={5} />
                  </div>
                  {error && <div style={{ color: '#c62828', fontSize: 14, padding: '8px 12px', background: '#fde8e8', borderRadius: 8 }}>{error}</div>}
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}>
                    {submitting ? 'Sending...' : 'Send Message →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
