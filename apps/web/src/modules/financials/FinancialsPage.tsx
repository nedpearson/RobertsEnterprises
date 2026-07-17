import { useState } from 'react';
import { useToast, EmptyState, PageHeader, StatusBadge } from '../../design-system';
import { API_BASE } from '../../shared/AppContext';

export function FinancialsPage({ invoices, onRefresh }: { invoices: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const handlePayment = async (method: string) => {
    if (!activeInvoice || !payAmount) return;
    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: activeInvoice.id,
          amount_cents: Math.round(parseFloat(payAmount) * 100),
          method,
          reference_number: `REF-${Date.now()}`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Payment of $${payAmount} via ${method} recorded.`, 'success');
      setPayAmount('');
      setActiveInvoice(null);
      onRefresh();
    } catch (e: any) {
      toast('Payment failed: ' + e.message, 'error');
    }
  };

  const handleStripeCheckout = async (invoiceId: number) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: any) {
      toast('Stripe error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Orders & Payments" description="Invoice management and POS checkout" />
      <div className="dashboard-scroll" style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 24, border: '1px solid var(--border)', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Open Invoices</h3>
          {invoices.length === 0 && <EmptyState icon="🧾" title="No open invoices" />}
          {invoices.map((inv: any) => (
            <div
              key={inv.id}
              onClick={() => setActiveInvoice(inv)}
              style={{
                padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10,
                cursor: 'pointer',
                background: activeInvoice?.id === inv.id ? 'var(--color-surface-selected)' : 'white',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>Invoice #{inv.id} — {inv.first_name} {inv.last_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                <span>Total: ${(inv.total_amount_cents / 100).toLocaleString()}</span>
                <span style={{ color: inv.balance_due_cents > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                  Due: ${(inv.balance_due_cents / 100).toLocaleString()}
                </span>
              </div>
              <div style={{ marginTop: 4 }}><StatusBadge status={inv.status} size="sm" /></div>
            </div>
          ))}
        </div>

        {activeInvoice && (
          <div style={{ flex: 1, background: '#111', color: 'white', borderRadius: 12, padding: 32 }}>
            <h2 style={{ marginTop: 0, color: '#9CA3AF', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>POS Terminal</h2>
            <div style={{ fontSize: 48, fontWeight: 700, margin: '20px 0 6px' }}>
              ${(activeInvoice.balance_due_cents / 100).toLocaleString()}
            </div>
            <div style={{ color: '#6B7280', marginBottom: 28, fontSize: 14 }}>Remaining balance due</div>
            <label style={{ display: 'block', color: '#9CA3AF', marginBottom: 8, fontSize: 13 }}>Payment Amount ($)</label>
            <input
              type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              style={{ width: '100%', padding: 16, fontSize: 22, background: '#222', color: 'white', border: '1px solid #333', borderRadius: 8, marginBottom: 20 }}
              placeholder="0.00"
            />
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button disabled={!payAmount} onClick={() => handlePayment('credit_card')} style={{ flex: 1, padding: 18, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: payAmount ? 1 : 0.4 }}>Credit Card</button>
              <button disabled={!payAmount} onClick={() => handlePayment('cash')} style={{ flex: 1, padding: 18, background: '#1c8853', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: payAmount ? 1 : 0.4 }}>Cash</button>
            </div>
            <button
              disabled={activeInvoice.balance_due_cents <= 0}
              onClick={() => handleStripeCheckout(activeInvoice.id)}
              style={{ width: '100%', padding: 18, background: '#635BFF', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              Pay Full Balance via Stripe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
