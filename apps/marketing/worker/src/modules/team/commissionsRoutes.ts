import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const commissionsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 1000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const dateOnly = (value: unknown): string | null => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
const rateBps = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10000 ? parsed : null;
};

const previousDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
};

type Db = ReturnType<typeof tenantContextOf>['db'];

async function audit(db: Db, userId: string, entityType: string, entityId: string, action: string, afterValue: unknown, reason: string) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[commissions] audit failed for ${action}:`, error.message);
}

async function reconcileEmployeePayments(db: Db, businessId: string, employeeId: string, effectiveFrom: string, locationId: string | null) {
  let query = db
    .from('payments')
    .select('id')
    .eq('business_id', businessId)
    .eq('sales_staff_id', employeeId)
    .eq('status', 'completed')
    .gte('processed_at', `${effectiveFrom}T00:00:00.000Z`)
    .order('processed_at', { ascending: true })
    .limit(5000);
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let reconciled = 0;
  for (const row of data ?? []) {
    const { data: earning, error: reconcileError } = await db.rpc('reconcile_commission_payment_server', {
      p_business_id: businessId,
      p_payment_id: row.id,
    });
    if (reconcileError) throw new Error(reconcileError.message);
    if (earning) reconciled += 1;
  }
  return reconciled;
}

commissionsRouter.get('/', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const [staff, locations, plans, assignments, earnings, batches, unattributedPayments] = await Promise.all([
    db.from('staff_profiles').select('id,name,role').eq('business_id', businessId).order('name'),
    db.from('locations').select('id,name,is_active').eq('business_id', businessId).order('name'),
    db.from('commission_plans').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    db.from('commission_assignments').select('*').eq('business_id', businessId).order('effective_from', { ascending: false }),
    db.from('commission_earnings').select('*').eq('business_id', businessId).order('event_date', { ascending: false }).limit(1000),
    db.from('commission_batches').select('*').eq('business_id', businessId).order('start_date', { ascending: false }).limit(100),
    db.from('payments')
      .select('id,invoice_id,location_id,customer_id,amount_cents,payment_method,status,processed_at,created_at')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .is('sales_staff_id', null)
      .order('processed_at', { ascending: false })
      .limit(250),
  ]);
  const error = staff.error || locations.error || plans.error || assignments.error || earnings.error || batches.error || unattributedPayments.error;
  if (error) return res.status(500).json({ error: error.message });

  const invoiceIds = [...new Set((unattributedPayments.data ?? []).map((row: any) => row.invoice_id).filter(Boolean))];
  let invoices: any[] = [];
  if (invoiceIds.length > 0) {
    const { data, error: invoiceError } = await db
      .from('invoices')
      .select('id,customer_id,customer,description,amount_cents,paid_cents,status,sales_staff_id')
      .eq('business_id', businessId)
      .in('id', invoiceIds);
    if (invoiceError) return res.status(500).json({ error: invoiceError.message });
    invoices = data ?? [];
  }
  const invoicesById = new Map(invoices.map((row: any) => [row.id, row]));
  const unattributed = (unattributedPayments.data ?? []).map((row: any) => ({ ...row, invoice: row.invoice_id ? invoicesById.get(row.invoice_id) ?? null : null }));

  return res.json({
    staff: staff.data ?? [],
    locations: locations.data ?? [],
    plans: plans.data ?? [],
    assignments: assignments.data ?? [],
    earnings: earnings.data ?? [],
    batches: batches.data ?? [],
    unattributedPayments: unattributed,
  });
});

commissionsRouter.post('/plans', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const name = text(req.body?.name, 160);
  const bps = rateBps(req.body?.rate_bps);
  const notes = text(req.body?.notes, 2000);
  if (!name || bps === null) return res.status(400).json({ error: 'Plan name and a rate from 0% to 100% are required.' });

  const { data, error } = await db.from('commission_plans').insert({
    business_id: businessId,
    name,
    basis: 'COLLECTED_NET_REFUNDS',
    rate_bps: bps,
    notes: notes || null,
    is_active: true,
    created_by: userId,
  }).select('*').single();
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'commission_plan', data.id, 'COMMISSION_PLAN_CREATED', data, 'Commission plan created using collected revenue net of refunds.');
  return res.status(201).json({ plan: data });
});

commissionsRouter.put('/plans/:planId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const planId = uuid(req.params.planId);
  if (!planId) return res.status(400).json({ error: 'Valid commission plan id required.' });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body?.name !== undefined) {
    const name = text(req.body.name, 160);
    if (!name) return res.status(400).json({ error: 'Plan name cannot be blank.' });
    patch.name = name;
  }
  if (req.body?.notes !== undefined) patch.notes = text(req.body.notes, 2000) || null;
  if (req.body?.is_active !== undefined) patch.is_active = req.body.is_active === true;
  // Rate is intentionally immutable after creation. Earnings snapshot the rate,
  // but changing it in-place would make assignment history hard to audit. Create
  // a new plan/version for a new rate.
  if (req.body?.rate_bps !== undefined) return res.status(409).json({ error: 'Commission rates are immutable. Create a new plan for a new rate.' });

  const { data, error } = await db.from('commission_plans').update(patch).eq('business_id', businessId).eq('id', planId).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Commission plan not found.' });
  await audit(db, userId, 'commission_plan', planId, 'COMMISSION_PLAN_UPDATED', data, 'Commission plan metadata/state updated.');
  return res.json({ plan: data });
});

commissionsRouter.post('/assignments', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const employeeId = uuid(req.body?.employee_id);
  const planId = uuid(req.body?.plan_id);
  const locationId = req.body?.location_id ? uuid(req.body.location_id) : null;
  const effectiveFrom = dateOnly(req.body?.effective_from);
  if (!employeeId || !planId || !effectiveFrom || (req.body?.location_id && !locationId)) {
    return res.status(400).json({ error: 'Valid employee, plan, optional location, and effective date are required.' });
  }

  const [employee, plan, location] = await Promise.all([
    db.from('staff_profiles').select('id,name').eq('business_id', businessId).eq('id', employeeId).maybeSingle(),
    db.from('commission_plans').select('id,name,rate_bps,is_active').eq('business_id', businessId).eq('id', planId).maybeSingle(),
    locationId ? db.from('locations').select('id,name').eq('business_id', businessId).eq('id', locationId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
  ]);
  const lookupError = employee.error || plan.error || location.error;
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!employee.data || !plan.data || (locationId && !location.data)) return res.status(404).json({ error: 'Employee, plan, or location was not found in this organization.' });
  if (!plan.data.is_active) return res.status(409).json({ error: 'Inactive commission plans cannot receive new assignments.' });

  let currentQuery = db.from('commission_assignments').select('*').eq('business_id', businessId).eq('employee_id', employeeId).is('effective_to', null).eq('is_active', true);
  currentQuery = locationId ? currentQuery.eq('location_id', locationId) : currentQuery.is('location_id', null);
  const { data: current, error: currentError } = await currentQuery.maybeSingle();
  if (currentError) return res.status(500).json({ error: currentError.message });
  if (current?.effective_from && current.effective_from >= effectiveFrom) {
    return res.status(409).json({ error: 'The new effective date must be after the currently active assignment start date.' });
  }
  if (current) {
    const { error: closeError } = await db.from('commission_assignments').update({
      effective_to: previousDate(effectiveFrom),
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('business_id', businessId).eq('id', current.id);
    if (closeError) return res.status(500).json({ error: closeError.message });
  }

  const { data, error } = await db.from('commission_assignments').insert({
    business_id: businessId,
    employee_id: employeeId,
    plan_id: planId,
    location_id: locationId,
    effective_from: effectiveFrom,
    effective_to: null,
    is_active: true,
    created_by: userId,
  }).select('*').single();
  if (error) return res.status(409).json({ error: error.message });

  let reconciledPayments = 0;
  try {
    reconciledPayments = await reconcileEmployeePayments(db, businessId, employeeId, effectiveFrom, locationId);
  } catch (error) {
    console.warn('[commissions] assignment saved but historical reconciliation failed:', error);
  }
  await audit(db, userId, 'commission_assignment', data.id, 'COMMISSION_ASSIGNMENT_CREATED', data, `Commission plan assigned to ${employee.data.name}; ${reconciledPayments} attributed completed payments reconciled.`);
  return res.status(201).json({ assignment: data, reconciledPayments });
});

commissionsRouter.post('/payments/:paymentId/attribute', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const paymentId = uuid(req.params.paymentId);
  const employeeId = uuid(req.body?.employee_id);
  const persistInvoiceAttribution = req.body?.persist_invoice_attribution !== false;
  if (!paymentId || !employeeId) return res.status(400).json({ error: 'Valid payment and employee ids are required.' });

  const [payment, employee] = await Promise.all([
    db.from('payments').select('*').eq('business_id', businessId).eq('id', paymentId).maybeSingle(),
    db.from('staff_profiles').select('id,name').eq('business_id', businessId).eq('id', employeeId).maybeSingle(),
  ]);
  const error = payment.error || employee.error;
  if (error) return res.status(500).json({ error: error.message });
  if (!payment.data || !employee.data) return res.status(404).json({ error: 'Payment or employee not found.' });

  const { data: updatedPayment, error: updateError } = await db.from('payments').update({ sales_staff_id: employeeId }).eq('business_id', businessId).eq('id', paymentId).select('*').single();
  if (updateError) return res.status(500).json({ error: updateError.message });
  if (persistInvoiceAttribution && payment.data.invoice_id) {
    const { error: invoiceError } = await db.from('invoices').update({ sales_staff_id: employeeId }).eq('business_id', businessId).eq('id', payment.data.invoice_id);
    if (invoiceError) return res.status(500).json({ error: invoiceError.message });
  }
  const { data: earning, error: reconcileError } = await db.rpc('reconcile_commission_payment_server', { p_business_id: businessId, p_payment_id: paymentId });
  if (reconcileError) return res.status(409).json({ error: reconcileError.message });

  await audit(db, userId, 'payment', paymentId, 'COMMISSION_PAYMENT_ATTRIBUTED', { payment: updatedPayment, earning }, `Completed payment attributed to ${employee.data.name}.`);
  return res.json({ payment: updatedPayment, earning });
});

commissionsRouter.post('/reconcile', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const { data: payments, error } = await db.from('payments')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .not('sales_staff_id', 'is', null)
    .order('processed_at', { ascending: true })
    .limit(5000);
  if (error) return res.status(500).json({ error: error.message });
  let reconciled = 0;
  for (const row of payments ?? []) {
    const { data: earning, error: reconcileError } = await db.rpc('reconcile_commission_payment_server', { p_business_id: businessId, p_payment_id: row.id });
    if (reconcileError) return res.status(500).json({ error: reconcileError.message });
    if (earning) reconciled += 1;
  }
  await audit(db, userId, 'commission_ledger', businessId, 'COMMISSION_LEDGER_RECONCILED', { reconciled }, 'Manual commission reconciliation sweep completed.');
  return res.json({ reconciled });
});

commissionsRouter.post('/batches', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const startDate = dateOnly(req.body?.start_date);
  const endDate = dateOnly(req.body?.end_date);
  const name = text(req.body?.name, 240) || (startDate && endDate ? `${startDate} to ${endDate}` : '');
  if (!startDate || !endDate || endDate < startDate || !name) return res.status(400).json({ error: 'Valid commission batch dates are required.' });
  const { data: batchId, error } = await db.rpc('create_commission_batch_server', {
    p_business_id: businessId,
    p_actor_id: userId,
    p_name: name,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error || !batchId) return res.status(409).json({ error: error?.message || 'Commission batch could not be created.' });
  const [batch, earnings] = await Promise.all([
    db.from('commission_batches').select('*').eq('business_id', businessId).eq('id', batchId).single(),
    db.from('commission_earnings').select('*').eq('business_id', businessId).eq('batch_id', batchId).order('employee_id'),
  ]);
  if (batch.error || earnings.error) return res.status(500).json({ error: batch.error?.message || earnings.error?.message });
  await audit(db, userId, 'commission_batch', String(batchId), 'COMMISSION_BATCH_CREATED', batch.data, 'Open positive commission balances were locked into a draft batch.');
  return res.status(201).json({ batch: batch.data, earnings: earnings.data ?? [] });
});

commissionsRouter.get('/batches/:batchId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const batchId = uuid(req.params.batchId);
  if (!batchId) return res.status(400).json({ error: 'Valid commission batch id required.' });
  const [batch, earnings, adjustments] = await Promise.all([
    db.from('commission_batches').select('*').eq('business_id', businessId).eq('id', batchId).maybeSingle(),
    db.from('commission_earnings').select('*').eq('business_id', businessId).eq('batch_id', batchId).order('event_date'),
    db.from('payroll_adjustments').select('id,employee_id,amount_cents,status,payroll_period_id,occurred_on').eq('business_id', businessId).eq('source_commission_batch_id', batchId),
  ]);
  const error = batch.error || earnings.error || adjustments.error;
  if (error) return res.status(500).json({ error: error.message });
  if (!batch.data) return res.status(404).json({ error: 'Commission batch not found.' });
  return res.json({ batch: batch.data, earnings: earnings.data ?? [], payrollAdjustments: adjustments.data ?? [] });
});

commissionsRouter.post('/batches/:batchId/approve', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const batchId = uuid(req.params.batchId);
  if (!batchId) return res.status(400).json({ error: 'Valid commission batch id required.' });
  const { data, error } = await db.rpc('approve_commission_batch_server', { p_business_id: businessId, p_batch_id: batchId, p_actor_id: userId });
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'commission_batch', batchId, 'COMMISSION_BATCH_APPROVED', data, 'Commission batch approved for payroll export.');
  return res.json({ batch: data });
});

commissionsRouter.post('/batches/:batchId/export-payroll', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const batchId = uuid(req.params.batchId);
  if (!batchId) return res.status(400).json({ error: 'Valid commission batch id required.' });
  const { data, error } = await db.rpc('export_commission_batch_to_payroll_server', { p_business_id: businessId, p_batch_id: batchId, p_actor_id: userId });
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'commission_batch', batchId, 'COMMISSION_BATCH_EXPORTED_TO_PAYROLL', data, 'Approved commission batch converted into approved taxable payroll adjustments.');
  return res.json({ batch: data });
});

commissionsRouter.post('/batches/:batchId/void', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const batchId = uuid(req.params.batchId);
  const reason = text(req.body?.reason, 2000);
  if (!batchId || !reason) return res.status(400).json({ error: 'Valid commission batch and void reason are required.' });
  const { data, error } = await db.rpc('void_commission_batch_server', { p_business_id: businessId, p_batch_id: batchId });
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'commission_batch', batchId, 'COMMISSION_BATCH_VOIDED', data, reason);
  return res.json({ batch: data });
});
