import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';
import { queueDueAppointmentAutomationsForBusiness } from './automationScheduler';

export const communicationAutomationRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 5000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const bool = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;

function automationShape(body: any) {
  const ruleType = String(body?.rule_type ?? '').trim().toUpperCase();
  const channel = String(body?.channel ?? '').trim().toUpperCase();
  const offsetMinutes = Number(body?.offset_minutes);
  const locationId = body?.location_id ? uuid(body.location_id) : null;
  const name = text(body?.name, 160);
  const templateBody = text(body?.template_body, 5000);
  const templateSubject = text(body?.template_subject, 300) || null;

  if (!['APPOINTMENT_REMINDER', 'APPOINTMENT_FOLLOW_UP'].includes(ruleType)) {
    return { error: 'rule_type must be APPOINTMENT_REMINDER or APPOINTMENT_FOLLOW_UP.' } as const;
  }
  if (!['SMS', 'EMAIL'].includes(channel)) return { error: 'channel must be SMS or EMAIL.' } as const;
  if (!name) return { error: 'Rule name is required.' } as const;
  if (!templateBody) return { error: 'Message template is required.' } as const;
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < 0 || offsetMinutes > 10_080) {
    return { error: 'offset_minutes must be an integer from 0 through 10080.' } as const;
  }
  if (body?.location_id && !locationId) return { error: 'location_id must be a valid UUID.' } as const;
  if (channel === 'EMAIL' && !templateSubject) return { error: 'Email automations require a subject.' } as const;

  return {
    value: {
      name,
      rule_type: ruleType,
      channel,
      timing_direction: ruleType === 'APPOINTMENT_REMINDER' ? 'BEFORE' : 'AFTER',
      offset_minutes: offsetMinutes,
      template_subject: templateSubject,
      template_body: templateBody,
      enabled: bool(body?.enabled, true),
      location_id: locationId,
    },
  } as const;
}

async function validateLocation(db: ReturnType<typeof tenantContextOf>['db'], businessId: string, locationId: string | null) {
  if (!locationId) return true;
  const { data, error } = await db
    .from('locations')
    .select('id')
    .eq('business_id', businessId)
    .eq('id', locationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

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
    entity_type: 'communication_automation_rule',
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[communication-automations] audit failed for ${action}:`, error.message);
}

communicationAutomationRouter.get('/rules', requirePermission('settings.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const [rules, locations] = await Promise.all([
    db.from('communication_automation_rules')
      .select('*')
      .eq('business_id', businessId)
      .is('archived_at', null)
      .order('created_at'),
    db.from('locations')
      .select('id,name,is_active')
      .eq('business_id', businessId)
      .order('name'),
  ]);
  if (rules.error) return res.status(500).json({ error: rules.error.message });
  if (locations.error) return res.status(500).json({ error: locations.error.message });
  return res.json({ rules: rules.data ?? [], locations: locations.data ?? [] });
});

communicationAutomationRouter.get('/deliveries', requirePermission('settings.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const requestedLimit = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(250, Math.max(1, Math.trunc(requestedLimit))) : 100;

  const { data: deliveries, error } = await db
    .from('communication_automation_deliveries')
    .select('*')
    .eq('business_id', businessId)
    .order('scheduled_for', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });

  const rows = deliveries ?? [];
  const ruleIds = Array.from(new Set(rows.map((row: any) => row.rule_id).filter(Boolean)));
  const appointmentIds = Array.from(new Set(rows.map((row: any) => row.appointment_id).filter(Boolean)));
  const customerIds = Array.from(new Set(rows.map((row: any) => row.customer_id).filter(Boolean)));

  const [rules, appointments, customers] = await Promise.all([
    ruleIds.length
      ? db.from('communication_automation_rules').select('id,name,rule_type,channel').eq('business_id', businessId).in('id', ruleIds)
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? db.from('appointments').select('id,start_at,end_at,status,type,location_id').eq('business_id', businessId).in('id', appointmentIds)
      : Promise.resolve({ data: [], error: null }),
    customerIds.length
      ? db.from('customers').select('id,name,email,phone').eq('business_id', businessId).in('id', customerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const lookupError = rules.error || appointments.error || customers.error;
  if (lookupError) return res.status(500).json({ error: lookupError.message });

  const ruleById = new Map((rules.data ?? []).map((row: any) => [row.id, row]));
  const appointmentById = new Map((appointments.data ?? []).map((row: any) => [row.id, row]));
  const customerById = new Map((customers.data ?? []).map((row: any) => [row.id, row]));
  return res.json({
    deliveries: rows.map((row: any) => ({
      ...row,
      rule: ruleById.get(row.rule_id) ?? null,
      appointment: appointmentById.get(row.appointment_id) ?? null,
      customer: row.customer_id ? customerById.get(row.customer_id) ?? null : null,
    })),
  });
});

communicationAutomationRouter.post('/rules', requirePermission('settings.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const parsed = automationShape(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  if (!(await validateLocation(db, businessId, parsed.value.location_id))) {
    return res.status(400).json({ error: 'Selected location does not belong to this organization.' });
  }

  const { data, error } = await db.from('communication_automation_rules').insert({
    business_id: businessId,
    ...parsed.value,
    created_by: userId,
    updated_by: userId,
  }).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, data.id, 'AUTOMATION_RULE_CREATED', null, data, 'Appointment communication automation rule created.');
  return res.status(201).json({ rule: data });
});

communicationAutomationRouter.patch('/rules/:ruleId', requirePermission('settings.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const ruleId = uuid(req.params.ruleId);
  if (!ruleId) return res.status(400).json({ error: 'Valid rule id required.' });

  const { data: before, error: beforeError } = await db
    .from('communication_automation_rules')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', ruleId)
    .is('archived_at', null)
    .maybeSingle();
  if (beforeError) return res.status(500).json({ error: beforeError.message });
  if (!before) return res.status(404).json({ error: 'Automation rule not found.' });

  const merged = { ...before, ...req.body };
  const parsed = automationShape(merged);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  if (!(await validateLocation(db, businessId, parsed.value.location_id))) {
    return res.status(400).json({ error: 'Selected location does not belong to this organization.' });
  }

  const { data, error } = await db
    .from('communication_automation_rules')
    .update({ ...parsed.value, updated_by: userId })
    .eq('business_id', businessId)
    .eq('id', ruleId)
    .is('archived_at', null)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, ruleId, 'AUTOMATION_RULE_UPDATED', before, data, 'Appointment communication automation rule updated.');
  return res.json({ rule: data });
});

communicationAutomationRouter.delete('/rules/:ruleId', requirePermission('settings.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const ruleId = uuid(req.params.ruleId);
  if (!ruleId) return res.status(400).json({ error: 'Valid rule id required.' });

  const { data: before, error: beforeError } = await db
    .from('communication_automation_rules')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', ruleId)
    .is('archived_at', null)
    .maybeSingle();
  if (beforeError) return res.status(500).json({ error: beforeError.message });
  if (!before) return res.status(404).json({ error: 'Automation rule not found.' });

  const archivedAt = new Date().toISOString();
  const { error } = await db
    .from('communication_automation_rules')
    .update({ enabled: false, archived_at: archivedAt, updated_by: userId })
    .eq('business_id', businessId)
    .eq('id', ruleId);
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, ruleId, 'AUTOMATION_RULE_ARCHIVED', before, { ...before, enabled: false, archived_at: archivedAt }, 'Appointment communication automation rule archived.');
  return res.status(204).send();
});

communicationAutomationRouter.post('/run', requirePermission('settings.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const result = await queueDueAppointmentAutomationsForBusiness(db, businessId);
  await audit(db, userId, businessId, 'AUTOMATION_SWEEP_TRIGGERED', null, result, 'Manual automation scheduler sweep triggered from VowOS.');
  return res.json(result);
});
