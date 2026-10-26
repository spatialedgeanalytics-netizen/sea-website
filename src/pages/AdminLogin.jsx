import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message || 'Invalid credentials. Please check your email and password.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--navy-dark) 0%, #0f1e2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* BG pattern */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 20% 80%, rgba(217,119,70,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(43,67,93,0.5) 0%, transparent 50%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SEA" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }} />
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '0.05em' }}>SPATIAL EDGE ANALYTICS</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>Admin Portal</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          padding: '40px 36px',
        }}>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Authorised personnel only</p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@sea.co.zw"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: 10, padding: '12px 16px',
                    fontSize: 15,
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Password
                </label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: 10, padding: '12px 16px',
                    fontSize: 15,
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(198,40,40,0.2)', border: '1px solid rgba(198,40,40,0.4)', color: '#ff8a80', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  background: loading ? 'rgba(217,119,70,0.5)' : 'var(--orange)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '14px', fontSize: 16, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', marginTop: 8,
                  fontFamily: 'var(--font)',
                }}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a href={import.meta.env.BASE_URL} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
            ← Back to Website
          </a>
        </div>
      </div>
    </div>
  )
}
