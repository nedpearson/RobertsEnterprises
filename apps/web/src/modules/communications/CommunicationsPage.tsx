import { useState } from 'react';
import { useToast, EmptyState, PageHeader } from '../../design-system';
import { API_BASE } from '../../shared/AppContext';

export function CommunicationsPage({ leads }: { leads: any[] }) {
  const { toast } = useToast();
  const [msg, setMsg] = useState('');

  const handleSendSMS = async () => {
    if (!msg) return;
    try {
      const res = await fetch(`${API_BASE}/communications/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+15550000000', message: msg }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.mock ? 'SMS queued (mock mode).' : `SMS sent. SID: ${data.sid}`, 'success');
        setMsg('');
      } else {
        toast('SMS failed: ' + data.error, 'error');
      }
    } catch (e: any) {
      toast('Network error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Communication Hub"
        description="Unified Twilio SMS, automated sequences, and follow-ups"
        actions={
          <button className="btn btn-primary" onClick={() => toast('Broadcast composer coming in Stage 3.', 'info')}>
            + Compose Broadcast
          </button>
        }
      />
      <div className="dashboard-scroll" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: 16, background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              Active SMS Threads
            </div>
            {leads.length === 0 && <EmptyState icon="💬" title="No threads yet" />}
            {leads.slice(0, 8).map((l: any) => (
              <div key={l.id} style={{ padding: 14, borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover-row">
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.first_name} {l.last_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Tap to view conversation…
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Compose Message</h3>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 240, marginBottom: 16 }}>
              <div style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', maxWidth: '80%', fontSize: 14 }}>
                VowOS confirms your appointment for tomorrow at 10 AM. Reply C to confirm.
              </div>
              <div style={{ alignSelf: 'flex-end', background: 'var(--accent)', color: 'white', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', maxWidth: '80%', fontSize: 14 }}>
                C. Thank you!
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text" placeholder="Type a message…" value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendSMS()}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
              <button className="btn btn-primary" onClick={handleSendSMS} style={{ borderRadius: 24, padding: '0 20px' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
