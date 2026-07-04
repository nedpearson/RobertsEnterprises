import { useState, useEffect } from 'react';

// Phase 6 UI: live team chat — channels + message threads with author selection.

export function TeamChatModule({ API_BASE }: { API_BASE: string }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [note, setNote] = useState('');

  const loadChannels = () => {
    fetch(`${API_BASE}/chat/channels`)
      .then((r) => r.json())
      .then((d) => {
        const chs = d.channels || [];
        setChannels(chs);
        setActiveChannel((cur) => (cur == null && chs.length ? chs[0].id : cur));
      })
      .catch(() => {});
  };

  const loadMessages = (id: number) => {
    fetch(`${API_BASE}/chat/channels/${id}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadChannels();
    fetch(`${API_BASE}/payroll/staff`).then((r) => r.json()).then((d) => setStaff(d.staff || [])).catch(() => {});
  }, []);

  useEffect(() => { if (activeChannel != null) loadMessages(activeChannel); }, [activeChannel]);

  const send = async () => {
    if (!body.trim() || activeChannel == null) return;
    setNote('');
    try {
      const res = await fetch(`${API_BASE}/chat/channels/${activeChannel}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_id: authorId || null, body }),
      });
      if (res.ok) { setBody(''); loadMessages(activeChannel); loadChannels(); }
      else { const d = await res.json(); setNote(d.error || 'Failed to send.'); }
    } catch { setNote('Network error.'); }
  };

  const createChannel = async () => {
    if (!newChannel.trim()) return;
    setNote('');
    try {
      const res = await fetch(`${API_BASE}/chat/channels`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannel }),
      });
      if (res.ok) { const c = await res.json(); setNewChannel(''); loadChannels(); setActiveChannel(c.id); }
      else { const d = await res.json(); setNote(d.error || 'Failed to create channel.'); }
    } catch { setNote('Network error.'); }
  };

  const inputStyle: any = { padding: 9, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 };
  const activeName = (channels.find((c) => c.id === activeChannel) || {}).name || '';

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Team Chat</h1>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Internal channels for the team — live.</p>
      </div>
      {note && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fef7e0', border: '1px solid #f5e2a3', fontSize: 14 }}>{note}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Channels */}
        <div className="kpi-card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Channels</div>
          {channels.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveChannel(c.id)}
              style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4, background: c.id === activeChannel ? 'var(--accent, #efe9dd)' : 'transparent', color: c.id === activeChannel ? 'white' : 'inherit', display: 'flex', justifyContent: 'space-between' }}
            >
              <span># {c.name}</span>
              <span style={{ opacity: 0.7, fontSize: 12 }}>{c.message_count}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="New channel…" value={newChannel} onChange={(e) => setNewChannel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createChannel(); }} />
            <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={createChannel}>+</button>
          </div>
        </div>

        {/* Thread */}
        <div className="kpi-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <div style={{ padding: 14, borderBottom: '1px solid #eee', fontWeight: 700 }}># {activeName || 'Select a channel'}</div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', maxHeight: 420 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{m.author_name || 'Someone'}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>{String(m.created_at).replace('T', ' ').slice(0, 16)}</span>
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{m.body}</div>
              </div>
            ))}
            {messages.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No messages yet — say hello.</div>}
          </div>
          <div style={{ borderTop: '1px solid #eee', padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <select style={{ ...inputStyle, width: 150 }} value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
              <option value="">As…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder={activeChannel == null ? 'Select a channel first' : `Message #${activeName}`}
              value={body}
              disabled={activeChannel == null}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button className="btn btn-primary" disabled={activeChannel == null} onClick={send}>Send ➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
