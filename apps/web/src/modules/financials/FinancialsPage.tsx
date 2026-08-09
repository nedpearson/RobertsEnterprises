import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { useToast } from '../../design-system/ToastContext';

export default function FinancialsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/invoices');
      setInvoices(res.invoices || res || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handlePayment = async (method: string) => {
    if (!activeInvoice || !payAmount) return;
    try {
      const payload = {
        invoice_id: activeInvoice.id,
        amount_cents: Math.round(parseFloat(payAmount) * 100),
        method,
        reference_number: `REF-${Math.floor(Math.random() * 10000)}`
      };
      await api.post('/api/payments', payload);
      addToast(`Payment of $${payAmount} via ${method} successful!`, 'success');
      setPayAmount('');
      setActiveInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      addToast('Payment failed: ' + err.message, 'error');
    }
  };

  const handleStripeCheckout = async (invoiceId: number) => {
    try {
      const res = await api.post<any>(`/api/invoices/${invoiceId}/checkout`);
      window.location.href = res.url;
    } catch (err: any) {
      addToast('Stripe Gateway Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="POS Checkout & Invoices"
        subtitle="Manage open invoices, collect payments, and checkout via Stripe"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice List */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Open Invoices</h3>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setActiveInvoice(inv)}
                className={`p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeInvoice?.id === inv.id ? 'border-rose-500 bg-rose-50/10' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">
                    Invoice #{inv.id} — {inv.first_name} {inv.last_name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                      inv.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>

                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-gray-500">Total: ${(inv.total_amount_cents / 100).toFixed(2)}</span>
                  <span
                    className={`font-semibold ${
                      inv.balance_due_cents > 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    Due: ${(inv.balance_due_cents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {invoices.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No invoices found.</p>
            )}
          </div>
        </Card>

        {/* Payment Terminal */}
        {activeInvoice ? (
          <Card className="bg-gray-900 text-white p-8 rounded-2xl flex flex-col justify-between min-h-[400px]">
            <div>
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">POS Terminal</h3>
              <div className="text-5xl font-extrabold text-white mt-4">
                ${(activeInvoice.balance_due_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">Remaining Balance Due</span>
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase">Payment Amount ($)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-4 text-2xl font-bold bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-white"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="primary"
                  className="flex-1 min-h-[50px] text-lg font-bold"
                  disabled={!payAmount}
                  onClick={() => handlePayment('credit_card')}
                >
                  Credit Card
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 min-h-[50px] text-lg font-bold bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
                  disabled={!payAmount}
                  onClick={() => handlePayment('cash')}
                >
                  Cash
                </Button>
              </div>

              <button
                disabled={activeInvoice.balance_due_cents <= 0}
                onClick={() => handleStripeCheckout(activeInvoice.id)}
                className="w-full py-4 mt-2 bg-[#635BFF] hover:bg-[#5b54ec] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Pay Full Balance via Stripe
              </button>
            </div>
          </Card>
        ) : (
          <Card className="border border-dashed border-gray-200 flex items-center justify-center text-gray-400 min-h-[400px]">
            Select an open invoice to activate POS payment terminal
          </Card>
        )}
      </div>
    </div>
  );
}
