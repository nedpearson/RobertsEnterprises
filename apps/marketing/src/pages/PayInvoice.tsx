import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Gem, Loader2, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CardPaymentForm, { CardPaymentResult } from '@/components/vowos/CardPaymentForm';
import { LocationId, locationById, formatCents, formatDate } from '@/data/vowosData';

interface PayableInvoice {
  id: string;
  customer: string;
  description: string;
  amountCents: number;
  paidCents: number;
  dueDate: string;
  status: string;
  location: LocationId;
}

const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100';

export default function PayInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';

  const [invoice, setInvoice] = useState<PayableInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<CardPaymentResult | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId || !token) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('pay_token', token)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        const inv: PayableInvoice = {
          id: data.id,
          customer: data.customer,
          description: data.description,
          amountCents: data.amount_cents,
          paidCents: data.paid_cents,
          dueDate: data.due_date,
          status: data.status,
          location: (data.location ?? 'ido-br') as LocationId,
        };
        setInvoice(inv);
        setPayerName(inv.customer);
        setAmount(((inv.amountCents - inv.paidCents) / 100).toFixed(2));
      }
      setLoading(false);
    };
    load();
  }, [invoiceId, token]);

  const loc = useMemo(() => (invoice ? locationById(invoice.location) : null), [invoice]);
  const balance = invoice ? invoice.amountCents - invoice.paidCents : 0;

  // The amount being applied to the invoice (surcharge is added on top by the card form)
  const payCents = Math.round(parseFloat(amount || '0') * 100);
  const amountValid = Number.isFinite(payCents) && payCents > 0 && payCents <= balance;

  /** Runs AFTER Stripe has actually charged the card. */
  const recordPayment = async (payment: CardPaymentResult) => {
    if (!invoice) return;
    setError('');
    const cents = payment.baseCents; // the invoice portion (surcharge is the card fee)

    const newPaid = invoice.paidCents + cents;
    const newStatus = newPaid >= invoice.amountCents ? 'Paid' : 'Partial';
    const { error: upErr } = await supabase
      .from('invoices')
      .update({ paid_cents: newPaid, status: newStatus })
      .eq('id', invoice.id)
      .eq('pay_token', token);

    if (upErr) {
      setError(
        `Your card was charged (ref ${payment.paymentIntentId}) but the invoice could not be updated — please call the boutique so we can post it by hand.`,
      );
      return;
    }

    // Keep the bride's lifetime spend in sync
    const { data: brideRow } = await supabase
      .from('brides')
      .select('id, spend_cents')
      .eq('name', invoice.customer)
      .maybeSingle();
    if (brideRow) {
      await supabase
        .from('brides')
        .update({ spend_cents: (brideRow.spend_cents ?? 0) + cents })
        .eq('id', brideRow.id);
    }

    // Log the payment to the communications timeline
    await supabase.from('messages').insert({
      customer: invoice.customer,
      channel: 'email',
      to_address: payerEmail || 'online payment',
      subject: `Payment received — ${invoice.id}`,
      body: `${formatCents(payment.totalCents)} charged to ${payment.brandLabel} toward invoice ${invoice.id} (${invoice.description}): ${formatCents(cents)} applied to the balance${payment.surchargeCents > 0 ? ` + ${formatCents(payment.surchargeCents)} ${payment.surchargePct}% card processing fee` : ''}. Stripe ref ${payment.paymentIntentId}. New balance: ${formatCents(invoice.amountCents - newPaid)}.`,
      kind: 'payment',
      status: 'sent',
    });

    // Add the payer to the boutique's CRM list
    if (payerEmail) {
      try {
        await fetch('https://famous.ai/api/crm/6a5d5dc9d84ad34d886e72c1/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payerEmail,
            name: payerName || undefined,
            source: 'checkout',
            tags: ['payment', 'invoice'],
          }),
        });
      } catch {
        // non-blocking
      }
    }

    setInvoice({ ...invoice, paidCents: newPaid, status: newStatus });
    setReceipt(payment);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-10">
      <div className="mx-auto max-w-lg">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-200">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-rose-500">
            The Boutique Bridal
          </p>
          <h1 className="font-serif text-2xl text-stone-900">{loc ? loc.business : 'Secure Payment'}</h1>
          {loc && <p className="mt-1 text-xs text-stone-500">{loc.address} · {loc.phone}</p>}
        </div>

        {loading && (
          <div className="rounded-3xl border border-stone-200 bg-white py-16 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-rose-400" />
            <p className="mt-3 text-sm text-stone-500">Loading your invoice…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
            <h2 className="mt-4 font-serif text-xl text-stone-900">Payment link not found</h2>
            <p className="mt-2 text-sm text-stone-500">
              This link may have expired or been mistyped. Please contact the boutique for a fresh
              payment link.
            </p>
          </div>
        )}

        {!loading && invoice && receipt && (
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-4 font-serif text-2xl text-stone-900">Thank you, {payerName || invoice.customer}!</h2>
            <p className="mt-2 text-sm text-stone-600">
              Your {receipt.brandLabel} card was charged{' '}
              <span className="font-semibold">{formatCents(receipt.totalCents)}</span> toward invoice {invoice.id}.
            </p>
            <div className="mx-auto mt-6 max-w-xs rounded-2xl bg-stone-50 p-4 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Applied to invoice</span>
                <span>{formatCents(receipt.baseCents)}</span>
              </div>
              {receipt.surchargeCents > 0 && (
                <div className="mt-1 flex justify-between text-stone-500">
                  <span>Card fee ({receipt.surchargePct}%)</span>
                  <span>{formatCents(receipt.surchargeCents)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-stone-500">
                <span>Paid to date</span>
                <span>{formatCents(invoice.paidCents)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-900">
                <span>Remaining balance</span>
                <span>{formatCents(invoice.amountCents - invoice.paidCents)}</span>
              </div>
            </div>
            <p className="mt-6 text-xs text-stone-400">
              Stripe reference {receipt.paymentIntentId}. A record of this payment has been sent to the
              boutique. Questions? Call {loc?.phone}.
            </p>
          </div>
        )}

        {!loading && invoice && !receipt && (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 bg-stone-50/60 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Invoice {invoice.id}</p>
                  <p className="mt-0.5 text-sm text-stone-700">{invoice.description}</p>
                  <p className="text-xs text-stone-400">For {invoice.customer} · Due {formatDate(invoice.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-3xl text-stone-900">{formatCents(balance)}</p>
                  <p className="text-[11px] text-stone-400">balance due</p>
                </div>
              </div>
            </div>

            {balance <= 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-3 font-serif text-lg text-stone-900">This invoice is paid in full</p>
                <p className="mt-1 text-sm text-stone-500">No payment is due. Thank you!</p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">Payment amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`${inputCls} pl-7`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmount((balance / 100).toFixed(2))}
                      className="mt-1 text-[11px] font-medium text-rose-500 hover:text-rose-600"
                    >
                      Pay full balance ({formatCents(balance)})
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">Your name</label>
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">Email for receipt</label>
                  <input
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>

                {!amountValid && amount !== '' && (
                  <p className="text-xs text-rose-600">
                    Please enter an amount between $0.01 and {formatCents(balance)}.
                  </p>
                )}
                {error && <p className="text-sm text-rose-600">{error}</p>}

                {amountValid ? (
                  <CardPaymentForm
                    key={payCents /* re-quote when the amount changes */}
                    baseCents={payCents}
                    baseLabel="invoice payment"
                    description={`Invoice ${invoice.id} — ${invoice.customer}`}
                    metadata={{ kind: 'invoice', invoice_id: invoice.id, customer: invoice.customer }}
                    onSuccess={recordPayment}
                  />
                ) : (
                  <div className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-400 ring-1 ring-stone-200">
                    Enter a payment amount above to continue to card details.
                  </div>
                )}

                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
                  <Lock className="h-3 w-3" /> Payments post directly to your boutique account. Prefer to
                  pay by phone? Call {loc?.phone}.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-stone-400">
          VowOS · The Boutique · I Do Bridal Couture + Proper &amp; Company
        </p>
      </div>
    </div>
  );
}
