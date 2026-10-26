import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, parseISO } from 'date-fns'

export default function JobOpportunities() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [applyForm, setApplyForm] = useState({ name: '', email: '', phone: '', coverletter: '' })
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    supabase.from('job_vacancies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setJobs(data || []); setLoading(false) })
  }, [])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplying(true)
    await supabase.from('job_applications').insert({
      vacancy_id: selected.id,
      vacancy_title: selected.title,
      ...applyForm,
    })
    setApplied(true)
    setApplying(false)
  }

  return (
    <section id="opportunities" style={{ background: 'var(--navy-dark)', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(217,119,70,0.15)',
            color: 'var(--orange)', padding: '6px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            Careers
          </div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, marginBottom: 16 }}>
            Job <span style={{ color: 'var(--orange)' }}>Opportunities</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
            Join the Spatial Edge Analytics team and help drive geospatial innovation across Southern Africa.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: 60 }}>Loading vacancies...</div>
        ) : jobs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3 style={{ color: '#fff', marginBottom: 10 }}>No Open Positions</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              We don't have open vacancies at the moment, but we're always growing.<br />
              Send your CV to <a href="mailto:admin@sea.co.zw" style={{ color: 'var(--orange)' }}>admin@sea.co.zw</a>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {jobs.map(job => (
              <div key={job.id} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 32px',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(217,119,70,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{job.title}</h3>
                      {job.department && (
                        <span style={{ background: 'rgba(217,119,70,0.2)', color: 'var(--orange)', padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          {job.department}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
                        {job.description}
                      </p>
                    )}
                    {job.deadline && (
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                        📅 Deadline: {format(parseISO(job.deadline), 'dd MMM yyyy')}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setSelected(job); setApplied(false); setApplyForm({ name: '', email: '', phone: '', coverletter: '' }) }}
                    className="btn btn-primary">
                    Apply Now
                  </button>
                </div>

                {job.requirements && (
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ color: 'var(--gold)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>View Requirements</summary>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Apply: {selected.title}</div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            {applied ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ marginBottom: 10 }}>Application Submitted!</h3>
                <p style={{ color: 'var(--text-muted)' }}>We'll review your application and be in touch shortly.</p>
                <button onClick={() => setSelected(null)} className="btn btn-primary" style={{ marginTop: 24 }}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleApply}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input required value={applyForm.name} onChange={e => setApplyForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input required type="email" value={applyForm.email} onChange={e => setApplyForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input value={applyForm.phone} onChange={e => setApplyForm(f => ({ ...f, phone: e.target.value }))} placeholder="+263..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cover Letter / Message *</label>
                    <textarea required value={applyForm.coverletter} onChange={e => setApplyForm(f => ({ ...f, coverletter: e.target.value }))} placeholder="Tell us why you're a great fit..." rows={5} />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>* Attach your CV by emailing <a href="mailto:admin@sea.co.zw" style={{ color: 'var(--orange)' }}>admin@sea.co.zw</a> with your application reference.</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={() => setSelected(null)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button type="submit" disabled={applying} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      {applying ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
