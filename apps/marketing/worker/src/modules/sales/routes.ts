import crypto from 'node:crypto';
import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const salesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 4000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const cents = (value: unknown, allowZero = true): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < (allowZero ? 0 : 1) || rounded > 100_000_000) return null;
  return rounded;
};

async function audit(db: ReturnType<typeof tenantContextOf>['db'], userId: string, entityType: string, entityId: string, action: string, beforeValue: unknown, afterValue: unknown, reason: string) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[sales] audit log failed for ${action}:`, error.message);
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------
salesRouter.get('/contracts', requirePermission('sales.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const { data, error } = await db
    .from('contracts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ contracts: data ?? [] });
});

salesRouter.post('/contracts', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.body?.customer_id);
  if (!customerId) return res.status(400).json({ error: 'A valid customer is required.' });

  const { data: customer, error: customerError } = await db
    .from('customers')
    .select('id,name,location_id')
    .eq('business_id', businessId)
    .eq('id', customerId)
    .maybeSingle();
  if (customerError) return res.status(500).json({ error: customerError.message });
  if (!customer) return res.status(404).json({ error: 'Customer not found in this business.' });

  const amountCents = cents(req.body?.amount_cents);
  const depositCents = cents(req.body?.deposit_cents);
  if (amountCents === null || depositCents === null) return res.status(400).json({ error: 'Valid contract and deposit amounts are required.' });
  if (depositCents > amountCents) return res.status(400).json({ error: 'Deposit cannot exceed the contract total.' });

  const location = text(req.body?.location, 80);
  const gown = text(req.body?.gown, 500);
  if (!gown) return res.status(400).json({ error: 'Gown or merchandise description is required.' });

  const id = `CT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const signToken = crypto.randomUUID();
  const payload = {
    id,
    business_id: businessId,
    customer_id: customerId,
    customer: customer.name,
    location: location || 'ido-br',
    gown,
    amount_cents: amountCents,
    deposit_cents: depositCents,
    special_terms: text(req.body?.special_terms, 8000) || null,
    status: 'Draft',
    sign_token: signToken,
  };

  const { data, error } = await db.from('contracts').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'contract', id, 'CONTRACT_CREATED', null, { ...data, sign_token: '[REDACTED]' }, `Contract created for ${customer.name}.`);
  return res.status(201).json({ contract: data });
});

salesRouter.patch('/contracts/:contractId/sent', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const contractId = text(req.params.contractId, 80);
  if (!contractId) return res.status(400).json({ error: 'Contract id is required.' });
  const { data: before } = await db.from('contracts').select('*').eq('business_id', businessId).eq('id', contractId).maybeSingle();
  if (!before) return res.status(404).json({ error: 'Contract not found.' });
  if (String(before.status).toUpperCase() === 'SIGNED') return res.json({ contract: before });

  const { data, error } = await db
    .from('contracts')
    .update({ status: 'Sent', sent_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('id', contractId)
    .neq('status', 'Signed')
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'contract', contractId, 'CONTRACT_SENT', { status: before.status }, { status: data.status, sent_at: data.sent_at }, 'Contract signing link sent.');
  return res.json({ contract: data });
});

// ---------------------------------------------------------------------------
// Layaway and payment plans
// ---------------------------------------------------------------------------
salesRouter.get('/payment-plans', requirePermission('sales.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const requestedType = String(req.query.type ?? '').toUpperCase();

  let planQuery = db
    .from('payment_plans')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (requestedType === 'LAYAWAY' || requestedType === 'PAYMENT_PLAN') planQuery = planQuery.eq('plan_type', requestedType);

  const [plans, schedules, customers, invoices] = await Promise.all([
    planQuery,
    db.from('payment_schedules').select('*').eq('business_id', businessId).not('plan_id', 'is', null).order('due_date'),
    db.from('customers').select('id,name,email,phone').eq('business_id', businessId),
    db.from('invoices').select('id,customer_id,description,amount_cents,paid_cents,due_date,status,location_id').eq('business_id', businessId),
  ]);
  if (plans.error) return res.status(500).json({ error: plans.error.message });
  if (schedules.error) return res.status(500).json({ error: schedules.error.message });
  if (customers.error) return res.status(500).json({ error: customers.error.message });
  if (invoices.error) return res.status(500).json({ error: invoices.error.message });

  const customerById = new Map((customers.data ?? []).map((row: any) => [row.id, row]));
  const invoiceById = new Map((invoices.data ?? []).map((row: any) => [row.id, row]));
  const scheduleByPlan = new Map<string, any[]>();
  for (const row of schedules.data ?? []) {
    if (!row.plan_id) continue;
    const current = scheduleByPlan.get(row.plan_id) ?? [];
    current.push(row);
    scheduleByPlan.set(row.plan_id, current);
  }

  return res.json({
    plans: (plans.data ?? []).map((plan: any) => ({
      ...plan,
      customer: customerById.get(plan.customer_id) ?? null,
      invoice: plan.invoice_id ? invoiceById.get(plan.invoice_id) ?? null : null,
      schedule: scheduleByPlan.get(plan.id) ?? [],
    })),
    customers: customers.data ?? [],
    invoices: invoices.data ?? [],
  });
});

salesRouter.post('/payment-plans', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.body?.customer_id);
  const invoiceId = uuid(req.body?.invoice_id);
  const locationId = req.body?.location_id ? uuid(req.body.location_id) : null;
  const planType = String(req.body?.plan_type ?? '').toUpperCase();
  const frequency = String(req.body?.frequency ?? 'MONTHLY').toUpperCase();
  const totalCents = cents(req.body?.total_cents, false);
  const downPaymentCents = cents(req.body?.down_payment_cents ?? 0);
  const installmentCount = Number(req.body?.installment_count);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.start_date ?? '')) ? String(req.body.start_date) : new Date().toISOString().slice(0, 10);

  if (!customerId) return res.status(400).json({ error: 'A valid customer is required.' });
  if (!invoiceId) return res.status(400).json({ error: 'A valid invoice is required. Payment plans always reconcile to an invoice.' });
  if (req.body?.location_id && !locationId) return res.status(400).json({ error: 'location_id must be a valid UUID.' });
  if (!['LAYAWAY','PAYMENT_PLAN'].includes(planType)) return res.status(400).json({ error: 'plan_type must be LAYAWAY or PAYMENT_PLAN.' });
  if (!['WEEKLY','BIWEEKLY','MONTHLY','CUSTOM'].includes(frequency)) return res.status(400).json({ error: 'Unsupported payment frequency.' });
  if (totalCents === null || downPaymentCents === null || downPaymentCents > totalCents) return res.status(400).json({ error: 'Invalid plan amounts.' });
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120) return res.status(400).json({ error: 'installment_count must be between 1 and 120.' });

  const { data, error } = await db.rpc('create_payment_plan_server', {
    p_business_id: businessId,
    p_location_id: locationId,
    p_customer_id: customerId,
    p_invoice_id: invoiceId,
    p_plan_type: planType,
    p_total_cents: totalCents,
    p_down_payment_cents: downPaymentCents,
    p_down_payment_method: text(req.body?.down_payment_method, 80) || 'manual',
    p_installment_count: installmentCount,
    p_frequency: frequency,
    p_start_date: startDate,
    p_notes: text(req.body?.notes, 8000) || null,
    p_actor_id: userId,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

salesRouter.post('/payment-plans/:planId/installments/:scheduleId/pay', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const planId = uuid(req.params.planId);
  const scheduleId = uuid(req.params.scheduleId);
  const amountCents = cents(req.body?.amount_cents, false);
  if (!planId || !scheduleId) return res.status(400).json({ error: 'Valid plan and installment ids are required.' });
  if (amountCents === null) return res.status(400).json({ error: 'Payment amount must be a positive number of cents.' });

  const { data: schedule, error: scheduleError } = await db
    .from('payment_schedules')
    .select('id,plan_id')
    .eq('business_id', businessId)
    .eq('id', scheduleId)
    .eq('plan_id', planId)
    .maybeSingle();
  if (scheduleError) return res.status(500).json({ error: scheduleError.message });
  if (!schedule) return res.status(404).json({ error: 'Installment not found for this plan.' });

  const { data, error } = await db.rpc('record_payment_plan_installment_server', {
    p_business_id: businessId,
    p_schedule_id: scheduleId,
    p_amount_cents: amountCents,
    p_payment_method: text(req.body?.payment_method, 80) || 'manual',
    p_provider_transaction_id: text(req.body?.provider_transaction_id, 300) || null,
    p_notes: text(req.body?.notes, 2000) || null,
    p_actor_id: userId,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

salesRouter.patch('/payment-plans/:planId/status', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const planId = uuid(req.params.planId);
  const status = String(req.body?.status ?? '').toUpperCase();
  if (!planId) return res.status(400).json({ error: 'A valid plan id is required.' });
  if (!['ACTIVE','CANCELLED','DEFAULTED'].includes(status)) return res.status(400).json({ error: 'Unsupported status change.' });

  const { data: before } = await db.from('payment_plans').select('*').eq('business_id', businessId).eq('id', planId).maybeSingle();
  if (!before) return res.status(404).json({ error: 'Payment plan not found.' });
  const { data, error } = await db
    .from('payment_plans')
    .update({ status, updated_by: userId })
    .eq('business_id', businessId)
    .eq('id', planId)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'payment_plan', planId, 'PAYMENT_PLAN_STATUS_CHANGED', { status: before.status }, { status }, `Payment plan status changed to ${status}.`);
  return res.json({ plan: data });
});
