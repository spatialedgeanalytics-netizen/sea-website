import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, parseISO, isToday, isYesterday } from 'date-fns'

function formatMsgTime(ts) {
  const d = parseISO(ts)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
  return format(d, 'dd MMM HH:mm')
}

export default function Chat() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [admins, setAdmins] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = async () => {
    const { data } = await supabase.from('chat_messages')
      .select('*, sender:admin_profiles!sender_id(full_name,admin_code)')
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
  }

  useEffect(() => {
    load()
    supabase.from('admin_profiles').select('*').then(({ data }) => setAdmins(data || []))

    const channel = supabase.channel('sea-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          supabase.from('chat_messages')
            .select('*, sender:admin_profiles!sender_id(full_name,admin_code)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => { if (data) setMessages(prev => [...prev, data]) })
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({ sender_id: user.id, message: text.trim() })
    setText('')
    setSending(false)
  }

  const getAvatar = (name) => name?.charAt(0)?.toUpperCase() || '?'
  const getColor = (code) => {
    const colors = ['#D97746', '#2B435D', '#8C3B1A', '#C29F62']
    const idx = ['SEA-A01', 'SEA-A02', 'SEA-A03', 'SEA-A04'].indexOf(code)
    return colors[idx >= 0 ? idx : 0]
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 20 }}>
      {/* Sidebar: online users */}
      <div style={{ width: 220, background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', padding: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16 }}>Team Members</div>
        {admins.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: getColor(a.admin_code), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
                {getAvatar(a.full_name)}
              </div>
              <div style={{
                position: 'absolute', bottom: 1, right: 1, width: 9, height: 9,
                borderRadius: '50%', background: a.is_online ? '#4caf50' : '#9e9e9e',
                border: '2px solid #fff',
              }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.full_name?.split(' ')[0]}</div>
              <div style={{ fontSize: 11, color: a.is_online ? '#4caf50' : 'var(--text-muted)' }}>
                {a.is_online ? '● Online' : '○ Offline'}
              </div>
            </div>
          </div>
        ))}
        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Group chat — text only. No calls or video.
        </div>
      </div>

      {/* Chat main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--navy-dark)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>SEA Chat</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{admins.filter(a => a.is_online).length} online · {admins.length} members</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : messages.map((msg, idx) => {
            // Website enquiry — special card
            if (!msg.sender_id) {
              const lines = msg.message.split('\n')
              const header = lines[0]
              const details = lines.slice(1).join('\n')
              return (
                <div key={msg.id} style={{ alignSelf: 'stretch' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1A2D42, #2B435D)',
                    borderRadius: 14, padding: '14px 18px',
                    border: '1px solid rgba(217,119,70,0.4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>📩</span>
                      <span style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Website Enquiry
                      </span>
                    </div>
                    <pre style={{
                      color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.7,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                      fontFamily: 'var(--font)',
                    }}>
                      {details.trim()}
                    </pre>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>
                      {formatMsgTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            }

            // Normal admin message
            const isMe = msg.sender_id === user?.id
            const prevMsg = messages[idx - 1]
            const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                {!isMe && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: showAvatar ? getColor(msg.sender?.admin_code) : 'transparent',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {showAvatar ? getAvatar(msg.sender?.full_name) : ''}
                  </div>
                )}
                <div style={{ maxWidth: '65%' }}>
                  {showAvatar && !isMe && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                      {msg.sender?.full_name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({msg.sender?.admin_code})</span>
                    </div>
                  )}
                  <div style={{
                    background: isMe ? 'var(--orange)' : 'var(--bg-light)',
                    color: isMe ? '#fff' : 'var(--navy-dark)',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 16px', lineHeight: 1.5, fontSize: 15,
                    wordBreak: 'break-word',
                  }}>
                    {msg.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                    {formatMsgTime(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <input
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, borderRadius: 24, padding: '10px 18px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
          />
          <button type="submit" disabled={sending || !text.trim()}
            style={{
              background: 'var(--orange)', color: '#fff', border: 'none',
              borderRadius: '50%', width: 44, height: 44, fontSize: 18,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              opacity: text.trim() ? 1 : 0.5, transition: 'opacity 0.2s',
              fontFamily: 'var(--font)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
