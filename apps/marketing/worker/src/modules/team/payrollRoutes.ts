import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const payrollRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 1000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const dateOnly = (value: unknown): string | null => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
const nonNegativeInt = (value: unknown, max = 9_000_000_000_000): number | null => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
};
const positiveInt = (value: unknown, max = 9_000_000_000_000): number | null => {
  const parsed = nonNegativeInt(value, max);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const PAYROLL_PROVIDERS = new Set(['gusto', 'adp', 'paychex', 'rippling']);
const COMP_TYPES = new Set(['HOURLY', 'SALARY', 'HOURLY_PLUS_COMMISSION', 'SALARY_PLUS_COMMISSION']);
const PAY_FREQUENCIES = new Set(['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY']);
const ADJUSTMENT_TYPES = new Set(['BONUS', 'COMMISSION', 'REIMBURSEMENT', 'DEDUCTION']);
const TAX_TREATMENTS = new Set(['TAXABLE', 'NON_TAXABLE', 'PRE_TAX', 'AFTER_TAX']);

type Db = ReturnType<typeof tenantContextOf>['db'];

type CompensationRow = {
  id: string;
  business_id: string;
  employee_id: string;
  compensation_type: string;
  pay_frequency: string;
  hourly_rate_cents: number;
  annual_salary_cents: number;
  commission_rate_bps: number;
  draw_amount_cents: number;
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
  is_active: boolean;
};

type TimeEntryRow = {
  id: string;
  business_id: string;
  user_id: string | null;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  location_id: string | null;
  department: string | null;
  payroll_period_id: string | null;
  updated_at: string;
};

type BreakRow = {
  id: string;
  time_entry_id: string;
  paid: boolean;
  started_at: string;
  ended_at: string | null;
};

type AdjustmentRow = {
  id: string;
  employee_id: string;
  adjustment_type: string;
  tax_treatment: string;
  amount_cents: number;
  occurred_on: string;
  description: string;
  status: string;
};

type ProviderState = {
  connected: boolean;
  ready: boolean;
  provider: string | null;
  connectionId: string | null;
  status: string;
  healthStatus: string;
  authState: string;
  circuitBreakerState: string;
  lastHealthCheckAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastErrorMessage: string | null;
};

function addUtcDays(date: string, amount: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function startOfWorkweek(date: string, startDay: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const delta = (d.getUTCDay() - startDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

function dateOf(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function payFrequencyDivisor(frequency: string): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    default: return 24;
  }
}

function workedMinutes(entry: TimeEntryRow, breaks: BreakRow[]): number {
  if (!entry.clock_out) return 0;
  const raw = Math.max(0, Math.round((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 60_000));
  const unpaid = breaks
    .filter((row) => row.time_entry_id === entry.id && !row.paid && row.ended_at)
    .reduce((sum, row) => sum + Math.max(0, Math.round((new Date(row.ended_at!).getTime() - new Date(row.started_at).getTime()) / 60_000)), 0);
  return Math.max(0, raw - unpaid);
}

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
  if (error) console.warn(`[payroll] audit failed for ${action}:`, error.message);
}

async function providerState(db: Db, businessId: string): Promise<ProviderState> {
  const { data, error } = await db
    .from('provider_connections')
    .select('id,provider,status,health_status,auth_state,circuit_breaker_state,last_health_check_at,last_successful_sync_at,last_error_message')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  const row = (data ?? []).find((item: any) => PAYROLL_PROVIDERS.has(String(item.provider ?? '').toLowerCase()));
  if (!row) {
    return {
      connected: false,
      ready: false,
      provider: null,
      connectionId: null,
      status: 'DISCONNECTED',
      healthStatus: 'UNKNOWN',
      authState: 'UNKNOWN',
      circuitBreakerState: 'UNKNOWN',
      lastHealthCheckAt: null,
      lastSuccessfulSyncAt: null,
      lastErrorMessage: null,
    };
  }
  const status = String(row.status ?? '').toUpperCase();
  const healthStatus = String(row.health_status ?? 'UNKNOWN').toUpperCase();
  const authState = String(row.auth_state ?? 'UNKNOWN').toUpperCase();
  const circuitBreakerState = String(row.circuit_breaker_state ?? 'UNKNOWN').toUpperCase();
  return {
    connected: true,
    ready: ['ACTIVE', 'CONNECTED'].includes(status) && healthStatus === 'HEALTHY' && authState === 'AUTHORIZED' && circuitBreakerState === 'CLOSED',
    provider: String(row.provider),
    connectionId: String(row.id),
    status,
    healthStatus,
    authState,
    circuitBreakerState,
    lastHealthCheckAt: row.last_health_check_at ?? null,
    lastSuccessfulSyncAt: row.last_successful_sync_at ?? null,
    lastErrorMessage: row.last_error_message ?? null,
  };
}

async function payrollConfiguration(db: Db, businessId: string) {
  const { data, error } = await db
    .from('payroll_configuration')
    .select('business_id,workweek_start,overtime_threshold_minutes,overtime_multiplier,updated_at,updated_by')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? {
    business_id: businessId,
    workweek_start: 0,
    overtime_threshold_minutes: 2400,
    overtime_multiplier: 1.5,
    updated_at: null,
    updated_by: null,
  };
}

payrollRouter.get('/', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [staff, locations, compensation, adjustments, periods, timeEntries, config, provider] = await Promise.all([
      db.from('staff_profiles').select('id,name,role').eq('business_id', businessId).order('name'),
      db.from('locations').select('id,name,is_active').eq('business_id', businessId).order('name'),
      db.from('payroll_compensation_profiles').select('*').eq('business_id', businessId).order('effective_from', { ascending: false }),
      db.from('payroll_adjustments').select('*').eq('business_id', businessId).order('occurred_on', { ascending: false }).limit(250),
      db.from('payroll_periods').select('*').eq('business_id', businessId).order('start_date', { ascending: false }).limit(50),
      db.from('time_entries').select('id,business_id,user_id,staff_name,clock_in,clock_out,location_id,department,payroll_period_id,payroll_approved_at,updated_at').eq('business_id', businessId).gte('clock_in', ninetyDaysAgo).order('clock_in', { ascending: false }).limit(1000),
      payrollConfiguration(db, businessId),
      providerState(db, businessId),
    ]);
    const error = staff.error || locations.error || compensation.error || adjustments.error || periods.error || timeEntries.error;
    if (error) return res.status(500).json({ error: error.message });

    const entryIds = (timeEntries.data ?? []).map((row: any) => row.id);
    let recentBreaks: any[] = [];
    if (entryIds.length > 0) {
      const { data, error: breaksError } = await db
        .from('time_entry_breaks')
        .select('id,time_entry_id,break_type,paid,started_at,ended_at')
        .eq('business_id', businessId)
        .in('time_entry_id', entryIds);
      if (breaksError) return res.status(500).json({ error: breaksError.message });
      recentBreaks = data ?? [];
    }

    const timecards = (timeEntries.data ?? []).map((entry: any) => ({
      ...entry,
      worked_minutes: workedMinutes(entry as TimeEntryRow, recentBreaks as BreakRow[]),
    }));

    return res.json({
      staff: staff.data ?? [],
      locations: locations.data ?? [],
      compensationProfiles: compensation.data ?? [],
      adjustments: adjustments.data ?? [],
      periods: periods.data ?? [],
      recentTimecards: timecards,
      configuration: config,
      provider,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

payrollRouter.put('/configuration', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const workweekStart = nonNegativeInt(req.body?.workweek_start, 6);
  const overtimeThreshold = positiveInt(req.body?.overtime_threshold_minutes, 10_080);
  const overtimeMultiplier = Number(req.body?.overtime_multiplier);
  if (workweekStart === null || overtimeThreshold === null || !Number.isFinite(overtimeMultiplier) || overtimeMultiplier < 1 || overtimeMultiplier > 5) {
    return res.status(400).json({ error: 'Invalid workweek or overtime configuration.' });
  }
  const { data, error } = await db.from('payroll_configuration').upsert({
    business_id: businessId,
    workweek_start: workweekStart,
    overtime_threshold_minutes: overtimeThreshold,
    overtime_multiplier: overtimeMultiplier,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id' }).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'payroll_configuration', businessId, 'PAYROLL_CONFIGURATION_UPDATED', data, 'Payroll workweek and overtime configuration updated.');
  return res.json({ configuration: data });
});

payrollRouter.post('/compensation', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const employeeId = uuid(req.body?.employee_id);
  const compensationType = text(req.body?.compensation_type, 40).toUpperCase();
  const payFrequency = text(req.body?.pay_frequency, 40).toUpperCase();
  const effectiveFrom = dateOnly(req.body?.effective_from);
  const hourlyRate = nonNegativeInt(req.body?.hourly_rate_cents);
  const annualSalary = nonNegativeInt(req.body?.annual_salary_cents);
  const commissionRateBps = nonNegativeInt(req.body?.commission_rate_bps, 10_000);
  const drawAmount = nonNegativeInt(req.body?.draw_amount_cents);
  const reason = text(req.body?.reason, 2000);
  if (!employeeId || !COMP_TYPES.has(compensationType) || !PAY_FREQUENCIES.has(payFrequency) || !effectiveFrom || hourlyRate === null || annualSalary === null || commissionRateBps === null || drawAmount === null) {
    return res.status(400).json({ error: 'A valid employee, compensation type, pay frequency, effective date, and compensation amounts are required.' });
  }
  if (compensationType.startsWith('HOURLY') && hourlyRate <= 0) return res.status(400).json({ error: 'Hourly compensation requires a positive hourly rate.' });
  if (compensationType.startsWith('SALARY') && annualSalary <= 0) return res.status(400).json({ error: 'Salary compensation requires a positive annual salary.' });

  const { data: employee, error: employeeError } = await db.from('staff_profiles').select('id,name').eq('business_id', businessId).eq('id', employeeId).maybeSingle();
  if (employeeError) return res.status(500).json({ error: employeeError.message });
  if (!employee) return res.status(404).json({ error: 'Employee not found in this organization.' });

  const previousEnd = addUtcDays(effectiveFrom, -1);
  const { error: closeError } = await db.from('payroll_compensation_profiles').update({
    effective_to: previousEnd,
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('business_id', businessId).eq('employee_id', employeeId).is('effective_to', null).lt('effective_from', effectiveFrom);
  if (closeError) return res.status(500).json({ error: closeError.message });

  const { data, error } = await db.from('payroll_compensation_profiles').upsert({
    business_id: businessId,
    employee_id: employeeId,
    compensation_type: compensationType,
    pay_frequency: payFrequency,
    hourly_rate_cents: hourlyRate,
    annual_salary_cents: annualSalary,
    commission_rate_bps: commissionRateBps,
    draw_amount_cents: drawAmount,
    effective_from: effectiveFrom,
    effective_to: null,
    reason: reason || null,
    is_active: true,
    created_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,employee_id,effective_from' }).select('*').single();
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'payroll_compensation', data.id, 'COMPENSATION_PROFILE_SAVED', data, `Compensation version saved for ${employee.name}.`);
  return res.status(201).json({ compensationProfile: data });
});

payrollRouter.post('/adjustments', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const employeeId = uuid(req.body?.employee_id);
  const adjustmentType = text(req.body?.adjustment_type, 40).toUpperCase();
  const taxTreatment = text(req.body?.tax_treatment, 40).toUpperCase();
  const amountCents = positiveInt(req.body?.amount_cents);
  const occurredOn = dateOnly(req.body?.occurred_on);
  const description = text(req.body?.description, 2000);
  if (!employeeId || !ADJUSTMENT_TYPES.has(adjustmentType) || !TAX_TREATMENTS.has(taxTreatment) || amountCents === null || !occurredOn || !description) {
    return res.status(400).json({ error: 'Valid employee, adjustment type, tax treatment, amount, date, and description are required.' });
  }
  const { data: employee, error: employeeError } = await db.from('staff_profiles').select('id,name').eq('business_id', businessId).eq('id', employeeId).maybeSingle();
  if (employeeError) return res.status(500).json({ error: employeeError.message });
  if (!employee) return res.status(404).json({ error: 'Employee not found in this organization.' });

  const { data, error } = await db.from('payroll_adjustments').insert({
    business_id: businessId,
    employee_id: employeeId,
    adjustment_type: adjustmentType,
    tax_treatment: taxTreatment,
    amount_cents: amountCents,
    occurred_on: occurredOn,
    description,
    status: 'PENDING',
    created_by: userId,
  }).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, 'payroll_adjustment', data.id, 'PAYROLL_ADJUSTMENT_CREATED', data, `${adjustmentType} created for ${employee.name}; approval required.`);
  return res.status(201).json({ adjustment: data });
});

payrollRouter.post('/adjustments/:adjustmentId/decision', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const adjustmentId = uuid(req.params.adjustmentId);
  const decision = text(req.body?.decision, 20).toUpperCase();
  if (!adjustmentId || !['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ error: 'Valid adjustment and decision are required.' });
  const { data: existing, error: lookupError } = await db.from('payroll_adjustments').select('*').eq('business_id', businessId).eq('id', adjustmentId).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!existing) return res.status(404).json({ error: 'Adjustment not found.' });
  if (existing.status !== 'PENDING') return res.status(409).json({ error: 'Only pending adjustments can be approved or rejected.' });
  const { data, error } = await db.from('payroll_adjustments').update({
    status: decision,
    approved_by: decision === 'APPROVED' ? userId : null,
    approved_at: decision === 'APPROVED' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('business_id', businessId).eq('id', adjustmentId).eq('status', 'PENDING').select('*').single();
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'payroll_adjustment', adjustmentId, `PAYROLL_ADJUSTMENT_${decision}`, data, `Payroll adjustment ${decision.toLowerCase()}.`);
  return res.json({ adjustment: data });
});

payrollRouter.post('/periods', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const startDate = dateOnly(req.body?.start_date);
  const endDate = dateOnly(req.body?.end_date);
  const payDate = dateOnly(req.body?.pay_date);
  const name = text(req.body?.name, 240) || (startDate && endDate ? `${startDate} to ${endDate}` : '');
  if (!startDate || !endDate || !payDate || endDate < startDate || !name) return res.status(400).json({ error: 'Valid payroll period start, end, and pay dates are required.' });

  try {
    const config = await payrollConfiguration(db, businessId);
    const provider = await providerState(db, businessId);
    const fullStart = startOfWorkweek(startDate, Number(config.workweek_start));
    const finalWeekStart = startOfWorkweek(endDate, Number(config.workweek_start));
    const fullEndExclusive = addUtcDays(finalWeekStart, 7);

    const [compensation, entriesResult, adjustmentsResult, openResult, staffResult] = await Promise.all([
      db.from('payroll_compensation_profiles').select('*').eq('business_id', businessId).lte('effective_from', endDate).or(`effective_to.is.null,effective_to.gte.${startDate}`).order('effective_from', { ascending: false }),
      db.from('time_entries').select('id,business_id,user_id,staff_name,clock_in,clock_out,location_id,department,payroll_period_id,updated_at').eq('business_id', businessId).gte('clock_in', `${fullStart}T00:00:00.000Z`).lt('clock_in', `${fullEndExclusive}T00:00:00.000Z`).not('clock_out', 'is', null).order('clock_in'),
      db.from('payroll_adjustments').select('id,employee_id,adjustment_type,tax_treatment,amount_cents,occurred_on,description,status').eq('business_id', businessId).eq('status', 'APPROVED').is('payroll_period_id', null).gte('occurred_on', startDate).lte('occurred_on', endDate),
      db.from('time_entries').select('id,staff_name,clock_in').eq('business_id', businessId).is('clock_out', null).gte('clock_in', `${startDate}T00:00:00.000Z`).lt('clock_in', `${addUtcDays(endDate, 1)}T00:00:00.000Z`),
      db.from('staff_profiles').select('id,name,role').eq('business_id', businessId),
    ]);
    const error = compensation.error || entriesResult.error || adjustmentsResult.error || openResult.error || staffResult.error;
    if (error) return res.status(500).json({ error: error.message });
    if ((openResult.data ?? []).length > 0) {
      return res.status(409).json({ error: 'Close all open shifts in this payroll period before creating a draft.', openTimecards: openResult.data });
    }

    const allEntries = (entriesResult.data ?? []) as TimeEntryRow[];
    const periodEntries = allEntries.filter((entry) => dateOf(entry.clock_in) >= startDate && dateOf(entry.clock_in) <= endDate);
    const alreadyLocked = periodEntries.find((entry) => entry.payroll_period_id);
    if (alreadyLocked) return res.status(409).json({ error: `Time entry ${alreadyLocked.id} is already locked to payroll period ${alreadyLocked.payroll_period_id}.` });

    const allEntryIds = allEntries.map((entry) => entry.id);
    let breaks: BreakRow[] = [];
    if (allEntryIds.length > 0) {
      const { data, error: breaksError } = await db.from('time_entry_breaks').select('id,time_entry_id,paid,started_at,ended_at').eq('business_id', businessId).in('time_entry_id', allEntryIds);
      if (breaksError) return res.status(500).json({ error: breaksError.message });
      breaks = (data ?? []) as BreakRow[];
    }

    const profiles = (compensation.data ?? []) as CompensationRow[];
    const staff = new Map((staffResult.data ?? []).map((row: any) => [row.id, row]));
    const adjustments = (adjustmentsResult.data ?? []) as AdjustmentRow[];
    const relevantEmployees = new Set<string>();
    periodEntries.forEach((entry) => { if (entry.user_id) relevantEmployees.add(entry.user_id); });
    profiles.forEach((profile) => relevantEmployees.add(profile.employee_id));
    adjustments.forEach((adjustment) => relevantEmployees.add(adjustment.employee_id));

    const missingCompensation: string[] = [];
    for (const employeeId of relevantEmployees) {
      const profile = profiles.find((candidate) => candidate.employee_id === employeeId && candidate.effective_from <= endDate && (!candidate.effective_to || candidate.effective_to >= startDate));
      if (!profile) missingCompensation.push(String(staff.get(employeeId)?.name ?? employeeId));
    }
    if (missingCompensation.length > 0) {
      return res.status(409).json({ error: 'Every employee in the payroll period needs an effective compensation profile.', employees: missingCompensation });
    }

    const minutesByEntry = new Map<string, { regular: number; overtime: number; total: number }>();
    for (const employeeId of relevantEmployees) {
      const employeeEntries = allEntries.filter((entry) => entry.user_id === employeeId).sort((a, b) => a.clock_in.localeCompare(b.clock_in));
      const cumulativeByWeek = new Map<string, number>();
      for (const entry of employeeEntries) {
        const total = workedMinutes(entry, breaks);
        const week = startOfWorkweek(dateOf(entry.clock_in), Number(config.workweek_start));
        const cumulative = cumulativeByWeek.get(week) ?? 0;
        const thresholdRemaining = Math.max(0, Number(config.overtime_threshold_minutes) - cumulative);
        const regular = Math.min(total, thresholdRemaining);
        const overtime = Math.max(0, total - regular);
        cumulativeByWeek.set(week, cumulative + total);
        minutesByEntry.set(entry.id, { regular, overtime, total });
      }
    }

    const lines = [...relevantEmployees].map((employeeId) => {
      const profile = profiles.find((candidate) => candidate.employee_id === employeeId && candidate.effective_from <= endDate && (!candidate.effective_to || candidate.effective_to >= startDate))!;
      const employee = staff.get(employeeId) as any;
      const entries = periodEntries.filter((entry) => entry.user_id === employeeId);
      let regularMinutes = 0;
      let overtimeMinutes = 0;
      entries.forEach((entry) => {
        const split = minutesByEntry.get(entry.id);
        regularMinutes += split?.regular ?? 0;
        overtimeMinutes += split?.overtime ?? 0;
      });

      let regularPayCents = 0;
      let overtimePayCents = 0;
      if (profile.compensation_type.startsWith('HOURLY')) {
        regularPayCents = Math.round((regularMinutes / 60) * Number(profile.hourly_rate_cents));
        overtimePayCents = Math.round((overtimeMinutes / 60) * Number(profile.hourly_rate_cents) * Number(config.overtime_multiplier));
      } else {
        regularPayCents = Math.round(Number(profile.annual_salary_cents) / payFrequencyDivisor(profile.pay_frequency));
        overtimePayCents = 0;
      }

      const employeeAdjustments = adjustments.filter((row) => row.employee_id === employeeId);
      const sum = (type: string, treatment?: string) => employeeAdjustments
        .filter((row) => row.adjustment_type === type && (!treatment || row.tax_treatment === treatment))
        .reduce((total, row) => total + Number(row.amount_cents), 0);
      const bonusCents = sum('BONUS');
      let commissionCents = sum('COMMISSION');
      if (Number(profile.draw_amount_cents) > commissionCents && profile.compensation_type.endsWith('PLUS_COMMISSION')) {
        commissionCents = Number(profile.draw_amount_cents);
      }
      const reimbursementCents = sum('REIMBURSEMENT');
      const preTaxDeductionCents = sum('DEDUCTION', 'PRE_TAX');
      const afterTaxDeductionCents = sum('DEDUCTION', 'AFTER_TAX');
      const grossPayCents = regularPayCents + overtimePayCents + bonusCents + commissionCents;
      const taxableGrossCents = Math.max(0, grossPayCents - preTaxDeductionCents);

      return {
        employee_id: employeeId,
        employee_name: String(employee?.name ?? employeeId),
        compensation_type: profile.compensation_type,
        hourly_rate_cents: Number(profile.hourly_rate_cents),
        annual_salary_cents: Number(profile.annual_salary_cents),
        regular_minutes: regularMinutes,
        overtime_minutes: overtimeMinutes,
        regular_pay_cents: regularPayCents,
        overtime_pay_cents: overtimePayCents,
        bonus_cents: bonusCents,
        commission_cents: commissionCents,
        reimbursement_cents: reimbursementCents,
        pre_tax_deduction_cents: preTaxDeductionCents,
        after_tax_deduction_cents: afterTaxDeductionCents,
        gross_pay_cents: grossPayCents,
        taxable_gross_cents: taxableGrossCents,
        tax_cents: null,
        net_pay_cents: null,
        tax_status: provider.ready ? 'PENDING_PROVIDER' : 'PROVIDER_NOT_CONNECTED',
        source_time_entry_ids: entries.map((entry) => entry.id),
        source_adjustment_ids: employeeAdjustments.map((row) => row.id),
        calculation_snapshot: {
          workweek_start: config.workweek_start,
          overtime_threshold_minutes: config.overtime_threshold_minutes,
          overtime_multiplier: config.overtime_multiplier,
          pay_frequency: profile.pay_frequency,
          compensation_profile_id: profile.id,
          tax_calculation: provider.ready ? 'Awaiting verified provider result.' : 'No verified payroll provider connected; statutory tax and net pay intentionally unresolved.',
        },
      };
    }).filter((line) => line.gross_pay_cents > 0 || line.reimbursement_cents > 0 || line.pre_tax_deduction_cents > 0 || line.after_tax_deduction_cents > 0 || line.source_time_entry_ids.length > 0);

    if (lines.length === 0) return res.status(409).json({ error: 'No compensable time, salary, or approved payroll adjustments were found for this period.' });

    const { data: periodId, error: createError } = await db.rpc('create_payroll_draft_server', {
      p_business_id: businessId,
      p_created_by: userId,
      p_name: name,
      p_start_date: startDate,
      p_end_date: endDate,
      p_pay_date: payDate,
      p_provider_state: provider,
      p_lines: lines,
    });
    if (createError || !periodId) return res.status(409).json({ error: createError?.message || 'Could not create payroll draft.' });

    const [period, periodLines] = await Promise.all([
      db.from('payroll_periods').select('*').eq('business_id', businessId).eq('id', periodId).single(),
      db.from('payroll_period_lines').select('*').eq('business_id', businessId).eq('payroll_period_id', periodId).order('employee_name'),
    ]);
    if (period.error || periodLines.error) return res.status(500).json({ error: period.error?.message || periodLines.error?.message });
    await audit(db, userId, 'payroll_period', String(periodId), 'PAYROLL_DRAFT_CREATED', period.data, `Server-calculated payroll draft created for ${startDate} through ${endDate}.`);
    return res.status(201).json({ period: period.data, lines: periodLines.data ?? [], provider });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

payrollRouter.get('/periods/:periodId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const periodId = uuid(req.params.periodId);
  if (!periodId) return res.status(400).json({ error: 'Valid payroll period id required.' });
  const [period, lines, submissions] = await Promise.all([
    db.from('payroll_periods').select('*').eq('business_id', businessId).eq('id', periodId).maybeSingle(),
    db.from('payroll_period_lines').select('*').eq('business_id', businessId).eq('payroll_period_id', periodId).order('employee_name'),
    db.from('payroll_provider_submissions').select('*').eq('business_id', businessId).eq('payroll_period_id', periodId).order('created_at', { ascending: false }),
  ]);
  const error = period.error || lines.error || submissions.error;
  if (error) return res.status(500).json({ error: error.message });
  if (!period.data) return res.status(404).json({ error: 'Payroll period not found.' });
  return res.json({ period: period.data, lines: lines.data ?? [], submissions: submissions.data ?? [] });
});

payrollRouter.post('/periods/:periodId/approve', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const periodId = uuid(req.params.periodId);
  if (!periodId) return res.status(400).json({ error: 'Valid payroll period id required.' });
  const { data, error } = await db.rpc('approve_payroll_period_server', { p_business_id: businessId, p_period_id: periodId, p_actor_id: userId });
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'payroll_period', periodId, 'PAYROLL_PERIOD_APPROVED', data, 'Payroll hours, gross wages, and approved adjustments locked for provider tax processing.');
  return res.json({ period: data });
});

payrollRouter.post('/periods/:periodId/post', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const periodId = uuid(req.params.periodId);
  if (!periodId) return res.status(400).json({ error: 'Valid payroll period id required.' });
  const { data, error } = await db.rpc('post_payroll_period_server', { p_business_id: businessId, p_period_id: periodId, p_actor_id: userId });
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'payroll_period', periodId, 'PAYROLL_PERIOD_POSTED', data, 'Provider-finalized payroll posted to the immutable internal register.');
  return res.json({ period: data });
});

payrollRouter.post('/periods/:periodId/void', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const periodId = uuid(req.params.periodId);
  const reason = text(req.body?.reason, 2000);
  if (!periodId || !reason) return res.status(400).json({ error: 'Valid period and void reason are required.' });
  const { data: existing, error: lookupError } = await db.from('payroll_periods').select('*').eq('business_id', businessId).eq('id', periodId).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!existing) return res.status(404).json({ error: 'Payroll period not found.' });
  if (!['DRAFT', 'REVIEWING'].includes(existing.status)) return res.status(409).json({ error: 'Only an unlocked draft/reviewing period can be voided.' });
  const { data, error } = await db.from('payroll_periods').update({ status: 'VOIDED', updated_at: new Date().toISOString() }).eq('business_id', businessId).eq('id', periodId).in('status', ['DRAFT', 'REVIEWING']).select('*').single();
  if (error) return res.status(409).json({ error: error.message });
  await audit(db, userId, 'payroll_period', periodId, 'PAYROLL_PERIOD_VOIDED', data, reason);
  return res.json({ period: data });
});
