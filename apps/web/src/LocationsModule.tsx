import { useState, useEffect } from 'react';

// Phase 2-4 command center: multi-brand / multi-location directory,
// alterations kanban, and inter-location transfers (create + receive) — live API.

const ALTERATION_LANES = ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup'];

export function LocationsModule({ API_BASE }: { API_BASE: string }) {
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [alterations, setAlterations] = useState<any>({ kanban: {}, count: 0 });
  const [transfers, setTransfers] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<any>({ from_boutique_id: '', to_boutique_id: '', inventory_variant_id: '', qty: 1, notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/boutiques`).then((r) => r.json()).catch(() => ({ boutiques: [] })),
      fetch(`${API_BASE}/alterations`).then((r) => r.json()).catch(() => ({ kanban: {}, count: 0 })),
      fetch(`${API_BASE}/transfers`).then((r) => r.json()).catch(() => ({ transfers: [] })),
      fetch(`${API_BASE}/inventory`).then((r) => r.json()).catch(() => []),
    ])
      .then(([b, a, t, inv]) => {
        setBoutiques(b.boutiques || []);
        setAlterations(a || { kanban: {}, count: 0 });
        setTransfers(t.transfers || []);
        const flat: any[] = [];
        (Array.isArray(inv) ? inv : []).forEach((item: any) => {
          (item.variants || []).forEach((v: any) => {
            if ((v.stock_quantity || 0) > 0) {
              flat.push({
                id: v.id,
                boutique_id: item.boutique_id,
                label: `${item.vendor_name} ${item.style_number} — ${v.size}/${v.color} (${v.sku}) · stock ${v.stock_quantity}`,
              });
            }
          });
        });
        setVariants(flat);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const brandLabel = (brand: string) =>
    brand === 'ido' ? 'I Do Bridal Couture' : brand === 'proper' ? 'Proper & Co.' : (brand || '—');

  const submitTransfer = async () => {
    if (!form.from_boutique_id || !form.to_boutique_id || !form.inventory_variant_id) {
      setMessage('Select a source, destination, and item.');
      return;
    }
    if (form.from_boutique_id === form.to_boutique_id) {
      setMessage('Source and destination must differ.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qty: Number(form.qty) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Transfer failed.');
      } else {
        setMessage('✓ Transfer created and stock reserved.');
        setForm({ from_boutique_id: '', to_boutique_id: '', inventory_variant_id: '', qty: 1, notes: '' });
        load();
      }
    } catch {
      setMessage('Network error creating transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const receiveTransfer = async (id: number) => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/transfers/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) { setMessage(`✓ Transfer #${id} received into destination.`); load(); }
      else { const d = await res.json(); setMessage(d.error || 'Receive failed.'); }
    } catch {
      setMessage('Network error receiving transfer.');
    }
  };

  const inputStyle: any = { padding: 9, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading locations, alterations &amp; transfers…</div>;
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Locations &amp; Operations</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
            Multi-brand, multi-location command center — boutiques, alterations, and inter-location transfers.
          </p>
        </div>
        <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
      </div>

      {message && (
        <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 8, background: '#f0f7ff', border: '1px solid #cfe3ff', fontSize: 14 }}>{message}</div>
      )}

      {/* Boutiques directory */}
      <h2 style={{ marginTop: 24 }}>Boutiques ({boutiques.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {boutiques.map((b) => (
          <div key={b.id} className="kpi-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{b.name}</div>
            <div style={{ color: 'var(--accent)', fontSize: 13, margin: '4px 0' }}>
              {brandLabel(b.brand)}{b.city ? ` · ${b.city}` : ''}
            </div>
            {b.address && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.address}</div>}
            {b.phone && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.phone}</div>}
            {b.hours && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{b.hours}</div>}
          </div>
        ))}
      </div>

      {/* Alterations kanban */}
      <h2 style={{ marginTop: 40 }}>Alterations Board ({alterations.count || 0})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ALTERATION_LANES.length}, 1fr)`, gap: 12 }}>
        {ALTERATION_LANES.map((lane) => {
          const tickets: any[] = (alterations.kanban && alterations.kanban[lane]) || [];
          return (
            <div key={lane} style={{ background: 'var(--sidebar, #f7f7f9)', borderRadius: 10, padding: 12, minHeight: 120 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{lane} ({tickets.length})</div>
              {tickets.map((t) => (
                <div key={t.id} style={{ background: 'white', borderRadius: 8, padding: 10, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.item_description}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.customer_name || 'Customer'}{t.due_date ? ` · due ${String(t.due_date).slice(0, 10)}` : ''}</div>
                </div>
              ))}
              {tickets.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</div>}
            </div>
          );
        })}
      </div>

      {/* New transfer form */}
      <h2 style={{ marginTop: 40 }}>New Inter-location Transfer</h2>
      <div className="kpi-card" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto auto', gap: 10, alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          From
          <select style={inputStyle} value={form.from_boutique_id} onChange={(e) => setForm({ ...form, from_boutique_id: e.target.value })}>
            <option value="">Source…</option>
            {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          To
          <select style={inputStyle} value={form.to_boutique_id} onChange={(e) => setForm({ ...form, to_boutique_id: e.target.value })}>
            <option value="">Destination…</option>
            {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          Item (in stock)
          <select style={inputStyle} value={form.inventory_variant_id} onChange={(e) => setForm({ ...form, inventory_variant_id: e.target.value })}>
            <option value="">Select item…</option>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          Qty
          <input type="number" min={1} style={{ ...inputStyle, width: 70 }} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </label>
        <button className="btn btn-primary" disabled={submitting} onClick={submitTransfer} style={{ height: 38 }}>
          {submitting ? 'Sending…' : 'Initiate Transfer'}
        </button>
      </div>
      {variants.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No in-stock inventory variants found — seed inventory first.</div>
      )}

      {/* Transfers list */}
      <h2 style={{ marginTop: 32 }}>Inter-location Transfers ({transfers.length})</h2>
      <table className="customers-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13 }}>
            <th style={{ padding: 8 }}>Item</th>
            <th style={{ padding: 8 }}>From</th>
            <th style={{ padding: 8 }}>To</th>
            <th style={{ padding: 8 }}>Qty</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{t.vendor_name ? `${t.vendor_name} ${t.style_number || ''}` : (t.sku || `Variant ${t.inventory_variant_id}`)}</td>
              <td style={{ padding: 8 }}>{t.from_location || t.from_boutique_id}</td>
              <td style={{ padding: 8 }}>{t.to_location || t.to_boutique_id}</td>
              <td style={{ padding: 8 }}>{t.qty}</td>
              <td style={{ padding: 8 }}>
                <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: t.status === 'Received' ? '#e6f4ea' : '#fef7e0', color: t.status === 'Received' ? '#1d6f42' : '#a06b00' }}>
                  {t.status}
                </span>
              </td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                {t.status === 'In_Transit' && (
                  <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => receiveTransfer(t.id)}>Receive</button>
                )}
              </td>
            </tr>
          ))}
          {transfers.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 12, color: 'var(--text-muted)' }}>No transfers yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
