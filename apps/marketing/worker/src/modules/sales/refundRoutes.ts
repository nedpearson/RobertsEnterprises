import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const refundsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 4000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const positiveCents = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100_000_000 ? parsed : null;
};

async function audit(
  db: ReturnType<typeof tenantContextOf>['db'],
  userId: string,
  entityId: string,
  action: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason: string,
) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: 'refund',
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[refunds] audit failed for ${action}:`, error.message);
}

function requiresCardProvider(paymentMethod: unknown): boolean {
  const normalized = String(paymentMethod ?? '').trim().toLowerCase();
  return normalized.includes('card') || normalized.includes('stripe') || normalized === 'credit';
}

async function stripeAccountForBusiness(db: ReturnType<typeof tenantContextOf>['db'], businessId: string): Promise<string | null> {
  const { data, error } = await db
    .from('provider_connections')
    .select('provider,provider_account_id,status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .limit(100);
  if (error) throw new Error(`Stripe connection lookup failed: ${error.message}`);
  const row = (data ?? []).find((item: any) => String(item.provider ?? '').toLowerCase().includes('stripe'));
  const account = row?.provider_account_id;
  return typeof account === 'string' && account.startsWith('acct_') ? account : null;
}

async function createStripeRefund(
  db: ReturnType<typeof tenantContextOf>['db'],
  businessId: string,
  refundId: string,
  transactionId: string,
  amountCents: number,
): Promise<{ id: string; status: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe refund processing is not configured on the worker.');

  const params = new URLSearchParams();
  if (transactionId.startsWith('pi_')) params.set('payment_intent', transactionId);
  else if (transactionId.startsWith('ch_')) params.set('charge', transactionId);
  else throw new Error('The original card payment is missing a Stripe PaymentIntent or charge reference.');
  params.set('amount', String(amountCents));
  params.set('metadata[vowos_refund_id]', refundId);
  params.set('metadata[business_id]', businessId);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Idempotency-Key': `vowos-refund-${refundId}`,
  };
  const connectedAccount = await stripeAccountForBusiness(db, businessId);
  if (connectedAccount) headers['Stripe-Account'] = connectedAccount;

  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers,
    body: params,
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    const message = body?.error?.message || `Stripe refund failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  if (!body?.id) throw new Error('Stripe returned a refund response without an id.');
  return { id: String(body.id), status: String(body.status || 'pending') };
}

refundsRouter.get('/', requirePermission('sales.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const [refunds, payments, customers, invoices] = await Promise.all([
    db.from('refunds').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1000),
    db.from('payments').select('*').eq('business_id', businessId).order('processed_at', { ascending: false }).limit(2000),
    db.from('customers').select('id,name,email,phone').eq('business_id', businessId).order('name'),
    db.from('invoices').select('id,customer_id,description,amount_cents,paid_cents,status,location_id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(2000),
  ]);
  const error = refunds.error || payments.error || customers.error || invoices.error;
  if (error) return res.status(500).json({ error: error.message });

  const refundRows = refunds.data ?? [];
  const reservedByPayment = new Map<string, number>();
  for (const refund of refundRows as any[]) {
    if (!['processing', 'completed'].includes(String(refund.status ?? '').toLowerCase())) continue;
    reservedByPayment.set(refund.payment_id, (reservedByPayment.get(refund.payment_id) ?? 0) + Number(refund.amount_cents || 0));
  }
  const customerById = new Map((customers.data ?? []).map((row: any) => [row.id, row]));
  const invoiceById = new Map((invoices.data ?? []).map((row: any) => [row.id, row]));
  const paymentById = new Map((payments.data ?? []).map((row: any) => [row.id, row]));

  return res.json({
    refunds: refundRows.map((row: any) => ({
      ...row,
      payment: paymentById.get(row.payment_id) ?? null,
      customer: paymentById.get(row.payment_id)?.customer_id ? customerById.get(paymentById.get(row.payment_id).customer_id) ?? null : null,
      invoice: paymentById.get(row.payment_id)?.invoice_id ? invoiceById.get(paymentById.get(row.payment_id).invoice_id) ?? null : null,
    })),
    payments: (payments.data ?? []).map((row: any) => ({
      ...row,
      refundable_cents: Math.max(0, Number(row.amount_cents || 0) - (reservedByPayment.get(row.id) ?? 0)),
      customer: row.customer_id ? customerById.get(row.customer_id) ?? null : null,
      invoice: row.invoice_id ? invoiceById.get(row.invoice_id) ?? null : null,
    })),
  });
});

refundsRouter.post('/', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const paymentId = uuid(req.body?.payment_id);
  const amountCents = positiveCents(req.body?.amount_cents);
  const reason = text(req.body?.reason, 2000);
  if (!paymentId || amountCents === null) return res.status(400).json({ error: 'Valid payment and positive refund amount are required.' });
  if (!reason) return res.status(400).json({ error: 'Refund reason is required.' });

  const { data: payment, error: paymentError } = await db
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', paymentId)
    .maybeSingle();
  if (paymentError) return res.status(500).json({ error: paymentError.message });
  if (!payment) return res.status(404).json({ error: 'Payment not found in this organization.' });

  const { data: reserved, error: reserveError } = await db.rpc('create_refund_request_server', {
    p_business_id: businessId,
    p_payment_id: paymentId,
    p_amount_cents: amountCents,
    p_reason: reason,
    p_actor_id: userId,
  });
  if (reserveError) return res.status(409).json({ error: reserveError.message });
  const refund = reserved as any;
  if (!refund?.id) return res.status(500).json({ error: 'Refund reservation did not return a refund record.' });

  await audit(db, userId, refund.id, 'REFUND_REQUESTED', null, refund, `Refund requested against payment ${paymentId}.`);

  let provider = 'manual';
  let providerRefundId: string | null = null;
  try {
    if (requiresCardProvider(payment.payment_method)) {
      const transactionId = text(payment.provider_transaction_id, 300);
      if (!transactionId) throw new Error('Original card payment does not contain a provider transaction reference.');
      const stripeRefund = await createStripeRefund(db, businessId, refund.id, transactionId, amountCents);
      provider = 'stripe';
      providerRefundId = stripeRefund.id;
    }

    const { data: completed, error: finalizeError } = await db.rpc('finalize_refund_server', {
      p_business_id: businessId,
      p_refund_id: refund.id,
      p_provider: provider,
      p_provider_refund_id: providerRefundId,
      p_actor_id: userId,
    });
    if (finalizeError) throw new Error(`Refund provider succeeded but ledger finalization failed: ${finalizeError.message}`);
    await audit(db, userId, refund.id, 'REFUND_COMPLETED', refund, completed, `Refund completed via ${provider}.`);
    return res.status(201).json({ refund: completed });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const { error: failureWriteError } = await db
      .from('refunds')
      .update({ status: 'failed', provider, provider_refund_id: providerRefundId, error_message: message.slice(0, 2000), updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('id', refund.id)
      .eq('status', 'processing');
    if (failureWriteError) console.error('[refunds] could not persist failed refund state:', failureWriteError.message);

    await db.from('integration_error_logs').insert({
      business_id: businessId,
      provider,
      failure_category: 'REFUND_PROCESSING_FAILED',
      error_message: message.slice(0, 2000),
      root_cause: 'A reserved refund could not be completed by its payment provider or reconciled into the ledger.',
      suggested_action: provider === 'stripe' ? 'Verify the Stripe connection and original transaction, then create a new refund after resolving the provider error.' : 'Review the payment and refund ledger before retrying.',
      raw_payload: { refund_id: refund.id, payment_id: paymentId, amount_cents: amountCents },
      sanitized_headers: {},
      is_auto_repairable: false,
      is_resolved: false,
    });
    await audit(db, userId, refund.id, 'REFUND_FAILED', refund, { ...refund, status: 'failed', error_message: message }, 'Refund processing failed.');
    return res.status(provider === 'stripe' ? 502 : 500).json({ error: message, refund_id: refund.id });
  }
});
