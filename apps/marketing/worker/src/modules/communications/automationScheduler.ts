import type { SupabaseClient } from '@supabase/supabase-js';

const AUTOMATION_MODULE_KEYS = ['communications.core', 'communications.automations'] as const;
const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED', 'VOID', 'DELETED']);
const MAX_OFFSET_MINUTES = 10_080;
const LOOKBACK_MINUTES = MAX_OFFSET_MINUTES + 1_440;

interface AutomationRule {
  id: string;
  business_id: string;
  location_id: string | null;
  rule_type: 'APPOINTMENT_REMINDER' | 'APPOINTMENT_FOLLOW_UP';
  channel: 'SMS' | 'EMAIL';
  timing_direction: 'BEFORE' | 'AFTER';
  offset_minutes: number;
  enabled: boolean;
}

interface AppointmentRow {
  id: string;
  business_id: string;
  location_id: string | null;
  customer_id: string | null;
  start_at: string;
  end_at: string | null;
  status: string | null;
}

export interface AutomationSweepResult {
  businesses: number;
  rules: number;
  appointments: number;
  due: number;
  queued: number;
  duplicates: number;
  skipped: number;
  errors: string[];
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function scheduledFor(rule: AutomationRule, appointment: AppointmentRow): Date | null {
  const start = validDate(appointment.start_at);
  if (!start) return null;
  const end = validDate(appointment.end_at) ?? start;
  const offsetMs = Math.max(0, Math.min(MAX_OFFSET_MINUTES, rule.offset_minutes)) * 60_000;
  return rule.timing_direction === 'BEFORE'
    ? new Date(start.getTime() - offsetMs)
    : new Date(end.getTime() + offsetMs);
}

async function moduleEnabled(db: SupabaseClient, businessId: string): Promise<boolean> {
  const { data, error } = await db
    .from('organization_module_preferences')
    .select('module_id,is_enabled')
    .eq('business_id', businessId)
    .in('module_id', [...AUTOMATION_MODULE_KEYS]);
  if (error) throw new Error(`Module preference lookup failed for ${businessId}: ${error.message}`);
  const byKey = new Map((data ?? []).map((row: any) => [String(row.module_id), row.is_enabled !== false]));
  return AUTOMATION_MODULE_KEYS.every((key) => byKey.get(key) !== false);
}

export async function queueDueAppointmentAutomationsForBusiness(
  db: SupabaseClient,
  businessId: string,
  now = new Date(),
): Promise<AutomationSweepResult> {
  const result: AutomationSweepResult = {
    businesses: 1,
    rules: 0,
    appointments: 0,
    due: 0,
    queued: 0,
    duplicates: 0,
    skipped: 0,
    errors: [],
  };

  if (!(await moduleEnabled(db, businessId))) {
    result.skipped += 1;
    return result;
  }

  const { data: rulesData, error: rulesError } = await db
    .from('communication_automation_rules')
    .select('id,business_id,location_id,rule_type,channel,timing_direction,offset_minutes,enabled')
    .eq('business_id', businessId)
    .eq('enabled', true)
    .order('created_at');
  if (rulesError) throw new Error(`Automation rule lookup failed: ${rulesError.message}`);

  const rules = (rulesData ?? []) as AutomationRule[];
  result.rules = rules.length;
  if (!rules.length) return result;

  const windowStart = new Date(now.getTime() - LOOKBACK_MINUTES * 60_000).toISOString();
  const windowEnd = new Date(now.getTime() + MAX_OFFSET_MINUTES * 60_000).toISOString();
  const { data: appointmentsData, error: appointmentsError } = await db
    .from('appointments')
    .select('id,business_id,location_id,customer_id,start_at,end_at,status')
    .eq('business_id', businessId)
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd)
    .order('start_at');
  if (appointmentsError) throw new Error(`Appointment lookup failed: ${appointmentsError.message}`);

  const appointments = (appointmentsData ?? []) as AppointmentRow[];
  result.appointments = appointments.length;

  for (const rule of rules) {
    for (const appointment of appointments) {
      const status = String(appointment.status ?? '').trim().toUpperCase();
      if (CANCELLED_STATUSES.has(status)) {
        result.skipped += 1;
        continue;
      }
      if (!appointment.customer_id) {
        result.skipped += 1;
        continue;
      }
      if (rule.location_id && appointment.location_id !== rule.location_id) continue;

      const sendAt = scheduledFor(rule, appointment);
      const start = validDate(appointment.start_at);
      if (!sendAt || !start) {
        result.skipped += 1;
        continue;
      }

      // Before-appointment reminders are never sent after the appointment has
      // already started. Follow-ups may be caught up after a worker restart.
      if (rule.timing_direction === 'BEFORE' && start.getTime() <= now.getTime()) continue;
      if (sendAt.getTime() > now.getTime()) continue;

      result.due += 1;
      const { data, error } = await db.rpc('queue_communication_automation_delivery_server', {
        p_business_id: businessId,
        p_rule_id: rule.id,
        p_appointment_id: appointment.id,
        p_scheduled_for: sendAt.toISOString(),
      });
      if (error) {
        result.errors.push(`${rule.id}/${appointment.id}: ${error.message}`);
        continue;
      }

      const queued = Boolean((data as any)?.queued);
      const reason = String((data as any)?.reason ?? '');
      if (queued) result.queued += 1;
      else if (reason === 'ALREADY_QUEUED') result.duplicates += 1;
      else result.skipped += 1;
    }
  }

  return result;
}

export async function runAppointmentAutomationSweep(
  db: SupabaseClient,
  now = new Date(),
): Promise<AutomationSweepResult> {
  const total: AutomationSweepResult = {
    businesses: 0,
    rules: 0,
    appointments: 0,
    due: 0,
    queued: 0,
    duplicates: 0,
    skipped: 0,
    errors: [],
  };

  const { data, error } = await db
    .from('communication_automation_rules')
    .select('business_id')
    .eq('enabled', true)
    .limit(10_000);
  if (error) throw new Error(`Automation tenant discovery failed: ${error.message}`);

  const businessIds = Array.from(new Set((data ?? []).map((row: any) => String(row.business_id || '')).filter(Boolean)));
  for (const businessId of businessIds) {
    try {
      const result = await queueDueAppointmentAutomationsForBusiness(db, businessId, now);
      total.businesses += 1;
      total.rules += result.rules;
      total.appointments += result.appointments;
      total.due += result.due;
      total.queued += result.queued;
      total.duplicates += result.duplicates;
      total.skipped += result.skipped;
      total.errors.push(...result.errors);
    } catch (error) {
      total.businesses += 1;
      total.errors.push(`${businessId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return total;
}

export function startAppointmentAutomationScheduler(db: SupabaseClient): () => void {
  if (process.env.AUTOMATION_SCHEDULER_ENABLED === 'false') {
    console.log('[automation-scheduler] disabled by AUTOMATION_SCHEDULER_ENABLED=false');
    return () => undefined;
  }

  const intervalMs = Math.max(60_000, Number(process.env.AUTOMATION_SCHEDULER_INTERVAL_MS || 60_000));
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runAppointmentAutomationSweep(db);
      if (result.queued || result.errors.length) {
        console.log('[automation-scheduler] sweep', {
          businesses: result.businesses,
          rules: result.rules,
          due: result.due,
          queued: result.queued,
          duplicates: result.duplicates,
          errors: result.errors.length,
        });
      }
      for (const error of result.errors.slice(0, 10)) console.warn('[automation-scheduler]', error);
    } catch (error) {
      console.error('[automation-scheduler] sweep failed:', error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  const startupTimer = setTimeout(() => void tick(), 5_000);
  const interval = setInterval(() => void tick(), intervalMs);
  startupTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(startupTimer);
    clearInterval(interval);
  };
}
