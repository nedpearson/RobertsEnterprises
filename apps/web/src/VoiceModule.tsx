import { useState, useEffect } from 'react';

// Phase 7 UI: voice assistant — speak or type a command, it interprets the intent
// via /api/voice/process and runs it via /api/voice/execute against live data.

const EXAMPLES = [
  'How many customers do we have?',
  'Find ivory gown size 10',
  'Payroll summary',
  "What's on the schedule today?",
  'Tell the team the Baton Rouge floor needs coverage Saturday',
];

export function VoiceModule({ API_BASE }: { API_BASE: string }) {
  const [transcript, setTranscript] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [authorId, setAuthorId] = useState('');
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/payroll/staff`).then((r) => r.json()).then((d) => setStaff(d.staff || [])).catch(() => {});
  }, []);

  const execute = async (pl: any) => {
    if (!pl) return;
    try {
      const res = await fetch(`${API_BASE}/voice/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: pl.intent, params: pl.params, author_id: authorId || null }),
      });
      const d = await res.json();
      if (!res.ok) { setNote(d.error || 'Execution failed.'); return; }
      setResult(d);
    } catch { setNote('Network error.'); }
  };

  const interpret = async (text?: string) => {
    const tr = (text != null ? text : transcript).trim();
    if (!tr) return;
    setResult(null); setNote(''); setPlan(null);
    try {
      const res = await fetch(`${API_BASE}/voice/process`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tr }),
      });
      const d = await res.json();
      if (!res.ok) { setNote(d.error || 'Could not interpret.'); return; }
      setPlan(d);
      if (!d.requires_confirmation && d.intent !== 'UNKNOWN') execute(d);
    } catch { setNote('Network error.'); }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setNote('Voice input is not supported in this browser — type your command instead.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    setListening(true); setNote('Listening…');
    rec.onresult = (e: any) => { const text = e.results[0][0].transcript; setTranscript(text); setNote(''); interpret(text); };
    rec.onerror = () => { setListening(false); setNote('Voice capture failed — type instead.'); };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const inputStyle: any = { padding: 11, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 };
  const money = (v: any) => `$${Number(v || 0).toFixed(2)}`;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Voice Assistant</h1>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Speak or type an operational command — it runs live against your data.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={startListening}
          title="Speak a command"
          style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white', fontSize: 18, background: listening ? '#d93025' : 'var(--accent, #b48a4e)' }}
        >
          🎤
        </button>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="e.g. How many transfers do we have?"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') interpret(); }}
        />
        <select style={{ ...inputStyle, width: 160 }} value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
          <option value="">As… (for clock/post)</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => interpret()} style={{ height: 46 }}>Ask</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {EXAMPLES.map((ex) => (
          <button key={ex} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setTranscript(ex); interpret(ex); }}>{ex}</button>
        ))}
      </div>

      {note && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: '#fef7e0', border: '1px solid #f5e2a3', fontSize: 14 }}>{note}</div>}

      {plan && (
        <div className="kpi-card" style={{ padding: 16, marginTop: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interpreted intent</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.intent}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{plan.summary}</div>
          {plan.requires_confirmation && (
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => execute(plan)}>Confirm &amp; Run</button>
          )}
        </div>
      )}

      {result && (
        <div className="kpi-card" style={{ padding: 16, marginTop: 16, borderLeft: '4px solid var(--accent, #b48a4e)' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>🔊 {result.spoken}</div>

          {Array.isArray(result.matches) && result.matches.length > 0 && (
            <table className="customers-rt" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
                <th style={{ padding: 6 }}>Item</th><th style={{ padding: 6 }}>SKU</th><th style={{ padding: 6 }}>Size/Color</th><th style={{ padding: 6 }}>Stock</th>
              </tr></thead>
              <tbody>
                {result.matches.map((m: any) => (
                  <tr key={m.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 6 }}>{m.vendor_name} {m.style_number}</td>
                    <td style={{ padding: 6 }}>{m.sku}</td>
                    <td style={{ padding: 6 }}>{m.size}/{m.color}</td>
                    <td style={{ padding: 6 }}>{m.stock_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {Array.isArray(result.appointments) && result.appointments.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              {result.appointments.map((a: any) => (
                <li key={a.id} style={{ fontSize: 13, marginBottom: 4 }}>{a.time_slot} · {a.type} · {a.customer_name || 'Customer'}{a.consultant_name ? ` (${a.consultant_name})` : ''}</li>
              ))}
            </ul>
          )}

          {result.estimated_pay != null && (
            <div style={{ marginTop: 10, fontSize: 14 }}>{result.approved_unpaid_hours} approved unpaid hours · ~{money(result.estimated_pay)} owed</div>
          )}

          {result.navigate && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>Navigation target: <b>{result.navigate}</b></div>}
        </div>
      )}
    </div>
  );
}
