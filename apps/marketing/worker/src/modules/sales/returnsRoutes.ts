import crypto from 'node:crypto';
import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const vendorReturnsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 4000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const integer = (value: unknown, min = 0, max = 100_000_000): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
};

const REASONS = new Set([
  'DEFECTIVE_MERCHANDISE',
  'STOCK_BALANCING',
  'SAMPLE_RETURN',
  'CUSTOMER_CANCELLATION',
  'SIZE_DISCREPANCY',
  'OTHER',
]);

const TRANSITIONS: Record<string, ReadonlySet<string>> = {
  DRAFT: new Set(['PENDING_APPROVAL', 'CANCELLED']),
  PENDING_APPROVAL: new Set(['APPROVED', 'CANCELLED']),
  APPROVED: new Set(['SHIPPED', 'CANCELLED']),
  SHIPPED: new Set(['CREDIT_RECEIVED']),
  CREDIT_RECEIVED: new Set(),
  CANCELLED: new Set(),
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
    entity_type: 'vendor_return_order',
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[vendor-returns] audit failed for ${action}:`, error.message);
}

vendorReturnsRouter.get('/', requirePermission('sales.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const [returns, locations, gowns, invoices] = await Promise.all([
    db.from('vendor_return_orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    db.from('locations').select('id,name,is_active').eq('business_id', businessId).order('name'),
    db.from('gowns').select('id,name,designer,style,sku,price_cents,location_id').eq('business_id', businessId).order('designer').limit(2000),
    db.from('invoices').select('id,customer_id,description,amount_cents,paid_cents,status,location_id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1000),
  ]);
  const error = returns.error || locations.error || gowns.error || invoices.error;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    returns: returns.data ?? [],
    locations: locations.data ?? [],
    gowns: gowns.data ?? [],
    invoices: invoices.data ?? [],
  });
});

vendorReturnsRouter.post('/', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const locationId = req.body?.location_id ? uuid(req.body.location_id) : null;
  const gownId = req.body?.gown_id ? uuid(req.body.gown_id) : null;
  const invoiceId = req.body?.invoice_id ? uuid(req.body.invoice_id) : null;
  const vendorName = text(req.body?.vendor_name, 240);
  const itemDescription = text(req.body?.item_description, 1000);
  const reason = String(req.body?.reason ?? '').trim().toUpperCase();
  const quantity = integer(req.body?.quantity, 1, 1000);
  const valueCents = integer(req.body?.value_cents, 0, 100_000_000);

  if (!vendorName || !itemDescription) return res.status(400).json({ error: 'Vendor and item description are required.' });
  if (!REASONS.has(reason)) return res.status(400).json({ error: 'Unsupported return reason.' });
  if (quantity === null || valueCents === null) return res.status(400).json({ error: 'Valid quantity and value are required.' });
  if (req.body?.location_id && !locationId) return res.status(400).json({ error: 'location_id must be a valid UUID.' });
  if (req.body?.gown_id && !gownId) return res.status(400).json({ error: 'gown_id must be a valid UUID.' });
  if (req.body?.invoice_id && !invoiceId) return res.status(400).json({ error: 'invoice_id must be a valid UUID.' });

  const checks = await Promise.all([
    locationId ? db.from('locations').select('id').eq('business_id', businessId).eq('id', locationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    gownId ? db.from('gowns').select('id').eq('business_id', businessId).eq('id', gownId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    invoiceId ? db.from('invoices').select('id').eq('business_id', businessId).eq('id', invoiceId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const lookupError = checks.find((check) => check.error)?.error;
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (locationId && !checks[0].data) return res.status(400).json({ error: 'Location does not belong to this organization.' });
  if (gownId && !checks[1].data) return res.status(400).json({ error: 'Gown does not belong to this organization.' });
  if (invoiceId && !checks[2].data) return res.status(400).json({ error: 'Invoice does not belong to this organization.' });

  const returnNumber = `RTV-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const payload = {
    business_id: businessId,
    location_id: locationId,
    return_number: returnNumber,
    vendor_name: vendorName,
    gown_id: gownId,
    invoice_id: invoiceId,
    item_description: itemDescription,
    quantity,
    value_cents: valueCents,
    reason,
    status: 'DRAFT',
    carrier: text(req.body?.carrier, 120) || null,
    tracking_number: text(req.body?.tracking_number, 240) || null,
    notes: text(req.body?.notes, 8000) || null,
    created_by: userId,
    updated_by: userId,
  };
  const { data, error } = await db.from('vendor_return_orders').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, data.id, 'VENDOR_RETURN_CREATED', null, data, `Vendor return ${returnNumber} created.`);
  return res.status(201).json({ return: data });
});

vendorReturnsRouter.patch('/:returnId', requirePermission('sales.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const returnId = uuid(req.params.returnId);
  if (!returnId) return res.status(400).json({ error: 'Valid return id required.' });

  const { data: before, error: beforeError } = await db.from('vendor_return_orders').select('*').eq('business_id', businessId).eq('id', returnId).maybeSingle();
  if (beforeError) return res.status(500).json({ error: beforeError.message });
  if (!before) return res.status(404).json({ error: 'Vendor return not found.' });

  const nextStatus = req.body?.status ? String(req.body.status).trim().toUpperCase() : String(before.status);
  if (nextStatus !== before.status && !TRANSITIONS[String(before.status)]?.has(nextStatus)) {
    return res.status(409).json({ error: `Cannot move vendor return from ${before.status} to ${nextStatus}.` });
  }

  const carrier = req.body?.carrier !== undefined ? text(req.body.carrier, 120) || null : before.carrier;
  const trackingNumber = req.body?.tracking_number !== undefined ? text(req.body.tracking_number, 240) || null : before.tracking_number;
  if (nextStatus === 'SHIPPED' && (!carrier || !trackingNumber)) {
    return res.status(400).json({ error: 'Carrier and tracking number are required before marking a return shipped.' });
  }

  const update: Record<string, unknown> = {
    status: nextStatus,
    carrier,
    tracking_number: trackingNumber,
    notes: req.body?.notes !== undefined ? text(req.body.notes, 8000) || null : before.notes,
    updated_by: userId,
  };
  if (nextStatus === 'SHIPPED' && before.status !== 'SHIPPED') update.shipped_at = new Date().toISOString();
  if (nextStatus === 'CREDIT_RECEIVED' && before.status !== 'CREDIT_RECEIVED') update.credit_received_at = new Date().toISOString();

  const { data, error } = await db.from('vendor_return_orders').update(update).eq('business_id', businessId).eq('id', returnId).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, returnId, 'VENDOR_RETURN_UPDATED', before, data, `Vendor return ${before.return_number} updated.`);
  return res.json({ return: data });
});
