import { useState, useEffect } from 'react';

// Phase 5 UI: live payroll — time clock, timesheet approval, payroll run, paystubs.

export function PayrollModule({ API_BASE }: { API_BASE: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [paystubs, setPaystubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState<any>({ start: '', end: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/payroll/staff`).then((r) => r.json()).catch(() => ({ staff: [] })),
      fetch(`${API_BASE}/payroll/timesheets`).then((r) => r.json()).catch(() => ({ entries: [] })),
      fetch(`${API_BASE}/payroll/paystubs`).then((r) => r.json()).catch(() => ({ paystubs: [] })),
    ])
      .then(([s, t, p]) => {
        setStaff(s.staff || []);
        setTimesheets(t.entries || []);
        setPaystubs(p.paystubs || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const post = async (path: string, body: any): Promise<any> => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Action failed.'); return null; }
      load();
      return data;
    } catch {
      setMessage('Network error.');
      return null;
    }
  };

  const clockIn = async (id: number) => { const r = await post('/payroll/clock-in', { user_id: id }); if (r) setMessage('✓ Clocked in.'); };
  const clockOut = async (id: number) => { const r = await post('/payroll/clock-out', { user_id: id }); if (r) setMessage('✓ Clocked out — hours recorded.'); };
  const approve = async (id: number) => { const r = await post(`/payroll/timesheets/${id}/approve`, {}); if (r) setMessage('✓ Timesheet approved.'); };
  const runPayroll = async () => {
    if (!period.start || !period.end) { setMessage('Select a pay period start and end.'); return; }
    const r = await post('/payroll/run', { period_start: period.start, period_end: period.end });
    if (r) setMessage(`✓ Generated ${r.paystubs_created} paystub(s) — ${money(r.total_paid)} total.`);
  };

  const inputStyle: any = { padding: 9, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 };
  const money = (v: any) => `$${Number(v || 0).toFixed(2)}`;
  const fmt = (v: any) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');

  if (loading) return <div style={{ padding: 40 }}>Loading payroll…</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Payroll</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Time clock, timesheet approval, and pay runs — live.</p>
        </div>
        <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
      </div>

      {message && (
        <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 8, background: '#f0f7ff', border: '1px solid #cfe3ff', fontSize: 14 }}>{message}</div>
      )}

      {/* Run payroll */}
      <h2 style={{ marginTop: 24 }}>Run Pay Period</h2>
      <div className="kpi-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          Period start
          <input type="date" style={inputStyle} value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          Period end
          <input type="date" style={inputStyle} value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
        </label>
        <button className="btn btn-primary" onClick={runPayroll} style={{ height: 38 }}>Run Payroll</button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generates paystubs from approved, unpaid hours in the range.</span>
      </div>

      {/* Staff / time clock */}
      <h2 style={{ marginTop: 32 }}>Staff &amp; Time Clock ({staff.length})</h2>
      <table className="customers-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13 }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Wage</th>
            <th style={{ padding: 8 }}>Approved unpaid hrs</th>
            <th style={{ padding: 8 }}>Pending approvals</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8, fontWeight: 500 }}>{u.first_name} {u.last_name}</td>
              <td style={{ padding: 8 }}>{u.role}</td>
              <td style={{ padding: 8 }}>{money(u.hourly_wage)}/hr</td>
              <td style={{ padding: 8 }}>{Number(u.approved_unpaid_hours || 0).toFixed(2)}</td>
              <td style={{ padding: 8 }}>{u.unapproved_entries || 0}</td>
              <td style={{ padding: 8 }}>
                <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: u.clocked_in ? '#e6f4ea' : '#f1f1f1', color: u.clocked_in ? '#1d6f42' : '#666' }}>
                  {u.clocked_in ? 'Clocked in' : 'Off'}
                </span>
              </td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                {u.clocked_in
                  ? <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => clockOut(u.id)}>Clock Out</button>
                  : <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => clockIn(u.id)}>Clock In</button>}
              </td>
            </tr>
          ))}
          {staff.length === 0 && <tr><td colSpan={7} style={{ padding: 12, color: 'var(--text-muted)' }}>No staff found.</td></tr>}
        </tbody>
      </table>

      {/* Timesheets */}
      <h2 style={{ marginTop: 32 }}>Recent Timesheets ({timesheets.length})</h2>
      <table className="customers-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13 }}>
            <th style={{ padding: 8 }}>Staff</th>
            <th style={{ padding: 8 }}>Clock in</th>
            <th style={{ padding: 8 }}>Clock out</th>
            <th style={{ padding: 8 }}>Hours</th>
            <th style={{ padding: 8 }}>Pay status</th>
            <th style={{ padding: 8 }}>Approval</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {timesheets.slice(0, 25).map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{t.staff_name}</td>
              <td style={{ padding: 8 }}>{fmt(t.clock_in)}</td>
              <td style={{ padding: 8 }}>{fmt(t.clock_out)}</td>
              <td style={{ padding: 8 }}>{Number(t.total_hours || 0).toFixed(2)}</td>
              <td style={{ padding: 8 }}>{t.status}</td>
              <td style={{ padding: 8 }}>{t.approved ? '✓ Approved' : 'Pending'}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                {!t.approved && t.clock_out && (
                  <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => approve(t.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
          {timesheets.length === 0 && <tr><td colSpan={7} style={{ padding: 12, color: 'var(--text-muted)' }}>No time entries yet.</td></tr>}
        </tbody>
      </table>

      {/* Paystubs */}
      <h2 style={{ marginTop: 32 }}>Paystubs ({paystubs.length})</h2>
      <table className="customers-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13 }}>
            <th style={{ padding: 8 }}>Staff</th>
            <th style={{ padding: 8 }}>Period</th>
            <th style={{ padding: 8 }}>Hours</th>
            <th style={{ padding: 8 }}>Rate</th>
            <th style={{ padding: 8 }}>Total pay</th>
          </tr>
        </thead>
        <tbody>
          {paystubs.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{p.staff_name}</td>
              <td style={{ padding: 8 }}>{String(p.period_start).slice(0, 10)} → {String(p.period_end).slice(0, 10)}</td>
              <td style={{ padding: 8 }}>{Number(p.total_hours || 0).toFixed(2)}</td>
              <td style={{ padding: 8 }}>{money(p.hourly_rate)}/hr</td>
              <td style={{ padding: 8, fontWeight: 600 }}>{money(p.total_pay)}</td>
            </tr>
          ))}
          {paystubs.length === 0 && <tr><td colSpan={5} style={{ padding: 12, color: 'var(--text-muted)' }}>No paystubs yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
