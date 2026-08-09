// ─── Reusable real-card payment form (Stripe Elements) ───
// Used by the public booking page ($75 fee) and the invoice pay page.
// Detects the card brand as the bride types, shows the boutique's configurable
// surcharge (3% credit / 4% Amex by default), then charges the card for real:
// create-payment edge function → PaymentIntent → stripe.confirmCardPayment.

import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase, getActiveDataPlane } from '@/lib/supabase';
import { formatCents } from '@/data/vowosData';
import {
  stripePromise,
  SurchargeSettings,
  DEFAULT_SURCHARGE,
  fetchSurchargeSettings,
  surchargePctFor,
  surchargeCentsFor,
  cardBrandLabel,
  isAmexBrand,
} from '@/lib/payments';

export interface CardPaymentResult {
  paymentIntentId: string;
  baseCents: number;
  surchargeCents: number;
  surchargePct: number;
  totalCents: number;
  brand: string;
  brandLabel: string;
}

interface Props {
  /** Amount before any card surcharge, in cents. */
  baseCents: number;
  /** Statement / gateway description for the charge. */
  description: string;
  metadata?: Record<string, string>;
  /** Label under the total row, e.g. "booking fee" or "payment". */
  baseLabel?: string;
  buttonLabel?: string;
  disabled?: boolean;
  onSuccess: (result: CardPaymentResult) => void | Promise<void>;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1c1917',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      '::placeholder': { color: '#a8a29e' },
    },
    invalid: { color: '#e11d48' },
  },
  hidePostalCode: false,
};

function InnerForm({ baseCents, description, metadata, baseLabel = 'amount', buttonLabel, disabled, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [settings, setSettings] = useState<SurchargeSettings>(DEFAULT_SURCHARGE);
  const [brand, setBrand] = useState<string>('unknown');
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchSurchargeSettings().then(setSettings);
  }, []);

  const pct = surchargePctFor(brand, settings);
  const surcharge = surchargeCentsFor(baseCents, brand, settings);
  const total = baseCents + surcharge;
  const brandKnown = brand !== 'unknown' && brand !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    if (!cardComplete) {
      setError('Please complete the card details.');
      return;
    }
    setError('');
    setPaying(true);

    try {
      // 1) Server computes the surcharge from saved settings + brand and creates the PaymentIntent
      
      if (getActiveDataPlane() === 'demo') {
        console.log('[DEMO MODE] Processing isolated Stripe payment.');
        await new Promise((res) => setTimeout(res, 800));
        const pct = surchargePctFor(brand, settings);
        const sc = surchargeCentsFor(baseCents, brand, settings);
        await onSuccess({
          paymentIntentId: 'pi_demo_123456789',
          baseCents,
          surchargeCents: sc,
          surchargePct: pct,
          totalCents: baseCents + sc,
          brand: brand,
          brandLabel: cardBrandLabel(brand),
        });
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke('create-payment', {
        body: { amount_cents: baseCents, card_brand: brand, description, metadata },
      });
      if (fnErr || !data?.clientSecret) {
        throw new Error(data?.error || fnErr?.message || 'Could not start the payment.');
      }

      // 2) Charge the card for real
      const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardEl },
      });
      if (confirmErr) {
        throw new Error(confirmErr.message || 'The card was declined.');
      }
      if (paymentIntent?.status !== 'succeeded') {
        throw new Error('The payment did not complete. Please try again.');
      }

      await onSuccess({
        paymentIntentId: paymentIntent.id,
        baseCents: data.baseCents,
        surchargeCents: data.surchargeCents,
        surchargePct: data.surchargePct,
        totalCents: data.totalCents,
        brand: data.brand,
        brandLabel: cardBrandLabel(data.brand),
      });
    } catch (err: any) {
      setError(err.message || 'The payment could not be processed.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
          Card details
        </label>
        <div className="rounded-lg border border-stone-300 bg-white px-3 py-3 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setBrand(e.brand ?? 'unknown');
              setCardComplete(e.complete);
              setError(e.error?.message ?? '');
            }}
          />
        </div>
        {brandKnown && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500">
            <CreditCard className="h-3.5 w-3.5 text-stone-400" />
            {cardBrandLabel(brand)} detected
            {settings.enabled && pct > 0 && (
              <span className={isAmexBrand(brand) ? 'font-medium text-amber-600' : 'font-medium text-stone-600'}>
                · {pct}% card processing fee applies
              </span>
            )}
          </p>
        )}
      </div>

      {/* Totals breakdown */}
      <div className="rounded-xl bg-stone-50 p-3.5 text-sm ring-1 ring-stone-200">
        <div className="flex justify-between text-stone-600">
          <span className="capitalize">{baseLabel}</span>
          <span>{formatCents(baseCents)}</span>
        </div>
        {settings.enabled && (
          <div className="mt-1 flex justify-between text-stone-500">
            <span>
              Card processing fee{' '}
              {brandKnown ? `(${cardBrandLabel(brand)} · ${pct}%)` : `(${settings.creditPct}% · ${settings.amexPct}% Amex)`}
            </span>
            <span>{brandKnown ? formatCents(surcharge) : '—'}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-900">
          <span>Total charged today</span>
          <span>{formatCents(brandKnown ? total : baseCents)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || paying || disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-600 disabled:opacity-60"
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {paying ? 'Processing…' : buttonLabel ?? `Pay ${formatCents(brandKnown ? total : baseCents)} securely`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
        <Lock className="h-3 w-3" /> Card processed securely by Stripe.
        {settings.enabled && ` A ${settings.creditPct}% card fee (${settings.amexPct}% Amex) is added at checkout.`}
      </p>
    </form>
  );
}

export default function CardPaymentForm(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <InnerForm {...props} />
    </Elements>
  );
}
