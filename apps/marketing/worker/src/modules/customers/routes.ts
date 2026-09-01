import crypto from 'node:crypto';
import { Router } from 'express';
import { requireAnyPermission, requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const customersRouter = Router();

const uuid = (value: unknown): string | null =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

const text = (value: unknown, max = 2000): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const stringArray = (value: unknown, maxItems = 40, maxLength = 120): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
};

const money = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000_000 ? Math.round(parsed) : null;
};

async function assertCustomer(db: ReturnType<typeof tenantContextOf>['db'], businessId: string, customerId: string) {
  const { data, error } = await db
    .from('customers')
    .select('id,name,email,phone,wedding_date,stylist,status,portal_token,portal_enabled,portal_token_rotated_at')
    .eq('business_id', businessId)
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function audit(
  db: ReturnType<typeof tenantContextOf>['db'],
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason: string,
) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[customers] audit log failed for ${action}:`, error.message);
}

// ---------------------------------------------------------------------------
// Style profiles
// ---------------------------------------------------------------------------
customersRouter.get('/style-profiles', requirePermission('customers.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const customerId = uuid(req.query.customerId);

  let profileQuery = db
    .from('customer_style_profiles')
    .select('*')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });
  if (customerId) profileQuery = profileQuery.eq('customer_id', customerId);

  const [profiles, customers] = await Promise.all([
    profileQuery,
    db.from('customers')
      .select('id,name,email,phone,wedding_date,stylist,status')
      .eq('business_id', businessId)
      .order('name'),
  ]);

  if (profiles.error) return res.status(500).json({ error: profiles.error.message });
  if (customers.error) return res.status(500).json({ error: customers.error.message });

  const byId = new Map((customers.data ?? []).map((customer: any) => [customer.id, customer]));
  return res.json({
    profiles: (profiles.data ?? []).map((profile: any) => ({
      ...profile,
      customer: byId.get(profile.customer_id) ?? null,
    })),
    customers: customers.data ?? [],
  });
});

customersRouter.put('/style-profiles/:customerId', requirePermission('customers.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.params.customerId);
  if (!customerId) return res.status(400).json({ error: 'A valid customer id is required.' });

  const customer = await assertCustomer(db, businessId, customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found in this business.' });

  const budgetMin = money(req.body?.budget_min_cents);
  const budgetMax = money(req.body?.budget_max_cents);
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return res.status(400).json({ error: 'Minimum budget cannot exceed maximum budget.' });
  }

  const { data: before } = await db
    .from('customer_style_profiles')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .maybeSingle();

  const payload = {
    business_id: businessId,
    customer_id: customerId,
    preferred_silhouettes: stringArray(req.body?.preferred_silhouettes),
    favorite_designers: stringArray(req.body?.favorite_designers),
    aesthetics: stringArray(req.body?.aesthetics),
    preferred_necklines: stringArray(req.body?.preferred_necklines),
    preferred_colors: stringArray(req.body?.preferred_colors),
    disliked_styles: stringArray(req.body?.disliked_styles),
    budget_min_cents: budgetMin,
    budget_max_cents: budgetMax,
    inspiration_links: Array.isArray(req.body?.inspiration_links)
      ? req.body.inspiration_links
          .filter((item: unknown) => typeof item === 'string')
          .map((item: string) => text(item, 1000))
          .filter(Boolean)
          .slice(0, 30)
      : [],
    notes: text(req.body?.notes, 8000) || null,
    updated_by: userId,
    ...(before ? {} : { created_by: userId }),
  };

  const { data, error } = await db
    .from('customer_style_profiles')
    .upsert(payload, { onConflict: 'business_id,customer_id' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await audit(db, userId, 'customer_style_profile', customerId, before ? 'STYLE_PROFILE_UPDATED' : 'STYLE_PROFILE_CREATED', before, data, `Style profile saved for ${customer.name}.`);
  return res.json({ profile: { ...data, customer } });
});

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------
customersRouter.get('/measurements', requirePermission('customers.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const customerId = uuid(req.query.customerId);
  let query = db
    .from('measurements')
    .select('*')
    .eq('business_id', businessId)
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (customerId) query = query.eq('bride_id', customerId);

  const [measurements, customers] = await Promise.all([
    query,
    db.from('customers').select('id,name,email,phone,wedding_date,stylist,status').eq('business_id', businessId).order('name'),
  ]);
  if (measurements.error) return res.status(500).json({ error: measurements.error.message });
  if (customers.error) return res.status(500).json({ error: customers.error.message });

  const byId = new Map((customers.data ?? []).map((customer: any) => [customer.id, customer]));
  return res.json({
    measurements: (measurements.data ?? []).map((measurement: any) => ({
      ...measurement,
      customer_record: byId.get(measurement.bride_id) ?? null,
    })),
    customers: customers.data ?? [],
  });
});

customersRouter.post(
  '/measurements',
  requireAnyPermission('customers.manage', 'alterations.manage'),
  async (req, res) => {
    const { db, businessId, userId } = tenantContextOf(req);
    const customerId = uuid(req.body?.customer_id);
    if (!customerId) return res.status(400).json({ error: 'A valid customer is required.' });
    const customer = await assertCustomer(db, businessId, customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found in this business.' });

    const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.taken_on ?? ''))
      ? String(req.body.taken_on)
      : new Date().toISOString().slice(0, 10);
    const payload = {
      business_id: businessId,
      bride_id: customerId,
      customer: customer.name,
      taken_on: takenOn,
      bust: text(req.body?.bust, 40) || null,
      waist: text(req.body?.waist, 40) || null,
      hips: text(req.body?.hips, 40) || null,
      hollow_to_hem: text(req.body?.hollow_to_hem, 40) || null,
      height: text(req.body?.height, 40) || null,
      heel_height: text(req.body?.heel_height, 40) || null,
      street_size: text(req.body?.street_size, 40) || null,
      gown_size: text(req.body?.gown_size, 40) || null,
      notes: text(req.body?.notes, 8000) || null,
      taken_by: text(req.body?.taken_by, 200) || userId,
    };

    const { data, error } = await db.from('measurements').insert(payload).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    await audit(db, userId, 'measurement', data.id, 'MEASUREMENT_RECORDED', null, data, `Measurements recorded for ${customer.name}.`);
    return res.status(201).json({ measurement: { ...data, customer_record: customer } });
  },
);

customersRouter.patch(
  '/measurements/:measurementId',
  requireAnyPermission('customers.manage', 'alterations.manage'),
  async (req, res) => {
    const { db, businessId, userId } = tenantContextOf(req);
    const measurementId = uuid(req.params.measurementId);
    if (!measurementId) return res.status(400).json({ error: 'A valid measurement id is required.' });

    const { data: before, error: findError } = await db
      .from('measurements')
      .select('*')
      .eq('business_id', businessId)
      .eq('id', measurementId)
      .maybeSingle();
    if (findError) return res.status(500).json({ error: findError.message });
    if (!before) return res.status(404).json({ error: 'Measurement record not found.' });

    const allowed = ['bust','waist','hips','hollow_to_hem','height','heel_height','street_size','gown_size','notes','taken_by'] as const;
    const patch: Record<string, string | null> = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) {
        patch[field] = text(req.body[field], field === 'notes' ? 8000 : 200) || null;
      }
    }
    if (typeof req.body?.taken_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.taken_on)) patch.taken_on = req.body.taken_on;
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No supported measurement fields were supplied.' });

    const { data, error } = await db
      .from('measurements')
      .update(patch)
      .eq('business_id', businessId)
      .eq('id', measurementId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await audit(db, userId, 'measurement', measurementId, 'MEASUREMENT_UPDATED', before, data, 'Measurement record corrected.');
    return res.json({ measurement: data });
  },
);

customersRouter.delete(
  '/measurements/:measurementId',
  requirePermission('customers.manage'),
  async (req, res) => {
    const { db, businessId, userId } = tenantContextOf(req);
    const measurementId = uuid(req.params.measurementId);
    if (!measurementId) return res.status(400).json({ error: 'A valid measurement id is required.' });
    const { data: before } = await db.from('measurements').select('*').eq('business_id', businessId).eq('id', measurementId).maybeSingle();
    if (!before) return res.status(404).json({ error: 'Measurement record not found.' });
    const { error } = await db.from('measurements').delete().eq('business_id', businessId).eq('id', measurementId);
    if (error) return res.status(500).json({ error: error.message });
    await audit(db, userId, 'measurement', measurementId, 'MEASUREMENT_DELETED', before, null, 'Measurement record deleted.');
    return res.status(204).send();
  },
);

// ---------------------------------------------------------------------------
// Customer portal management. Public portal reads remain behind the existing
// token-bound portal_get_bride_bundle RPC.
// ---------------------------------------------------------------------------
customersRouter.get('/portal', requirePermission('customers.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const { data, error } = await db
    .from('customers')
    .select('id,name,email,phone,wedding_date,stylist,status,portal_token,portal_enabled,portal_token_rotated_at')
    .eq('business_id', businessId)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ customers: data ?? [] });
});

customersRouter.patch('/portal/:customerId', requirePermission('customers.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.params.customerId);
  if (!customerId) return res.status(400).json({ error: 'A valid customer id is required.' });
  const before = await assertCustomer(db, businessId, customerId);
  if (!before) return res.status(404).json({ error: 'Customer not found in this business.' });
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean.' });

  const { data, error } = await db
    .from('customers')
    .update({ portal_enabled: req.body.enabled })
    .eq('business_id', businessId)
    .eq('id', customerId)
    .select('id,name,email,phone,wedding_date,stylist,status,portal_token,portal_enabled,portal_token_rotated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'customer_portal', customerId, 'PORTAL_STATUS_CHANGED', before, data, req.body.enabled ? 'Customer portal enabled.' : 'Customer portal disabled.');
  return res.json({ customer: data });
});

customersRouter.post('/portal/:customerId/rotate-token', requirePermission('customers.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.params.customerId);
  if (!customerId) return res.status(400).json({ error: 'A valid customer id is required.' });
  const before = await assertCustomer(db, businessId, customerId);
  if (!before) return res.status(404).json({ error: 'Customer not found in this business.' });

  const token = crypto.randomUUID();
  const rotatedAt = new Date().toISOString();
  const { data, error } = await db
    .from('customers')
    .update({ portal_token: token, portal_token_rotated_at: rotatedAt, portal_enabled: true })
    .eq('business_id', businessId)
    .eq('id', customerId)
    .select('id,name,email,phone,wedding_date,stylist,status,portal_token,portal_enabled,portal_token_rotated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'customer_portal', customerId, 'PORTAL_TOKEN_ROTATED', { portal_enabled: before.portal_enabled }, { portal_enabled: true, portal_token_rotated_at: rotatedAt }, 'Customer portal token rotated.');
  return res.json({ customer: data });
});
