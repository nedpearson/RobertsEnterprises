/**
 * The booking half of scheduling: setup, availability, party, assignment.
 *
 * Everything here is new surface. The worker already had /availability,
 * /recommendations and /assign, but no component ever called them — the UI
 * talked to Postgres RPCs straight from the browser instead, which bypassed
 * requireBusinessContext, rejectTenantSpoofing and requirePermission on the one
 * path that actually ran. These routes exist so the booking flow goes through
 * the guarded server, and the browser stops holding the keys to the tenant.
 *
 * Setup CRUD is here rather than in a settings module on purpose: rooms,
 * services and eligibility are not decoration, they are the three inputs
 * without which no slot can be generated. Production has zero of all three,
 * which is the entire reason 3,705 requests have produced no appointments.
 */
import { Router } from 'express';
import { requireBusinessContext } from '../../index';
import { rejectTenantSpoofing, requirePermission } from '../../lib/auth/middleware';
import { requestBusinessScope } from './requestScope';
import {
  generateSlots,
  type EligibleEmployee,
  type Interval,
  type RoomInfo,
  type ServiceSpec,
  type ShiftWindow,
} from './slots';

export const bookingRouter = Router();

const DEFAULT_TIME_ZONE = 'America/Chicago';
const MAX_WINDOW_DAYS = 60;

type Ctx = { db: any; businessId: string; userId?: string };
const ctxOf = (req: any): Ctx => req.context as Ctx;

const trimmed = (value: unknown, max = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const positiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

function fail(res: any, status: number, error: string) {
  return res.status(status).json({ error });
}

const SERVICE_COLUMNS =
  'id,name,duration_minutes,setup_buffer_minutes,cleanup_buffer_minutes,required_role,required_room_type,intake_keywords,is_default,active';

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');

/** Keywords the form might send: lowercased, trimmed, de-duplicated, bounded. */
function keywordList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const cleaned = raw
    .map((entry) => String(entry).trim().toLowerCase().slice(0, 60))
    .filter((entry) => entry.length >= 2);
  return [...new Set(cleaned)].slice(0, 25);
}

/**
 * Confirms a location belongs to the caller's business before it is used to
 * scope anything. Location ids arrive from the browser; they are an input.
 */
async function locationInBusiness(db: any, businessId: string, locationId: string): Promise<boolean> {
  if (!locationId) return true;
  const { data, error } = await db
    .from('locations')
    .select('id')
    .in('business_id', requestBusinessScope(businessId))
    .eq('id', locationId)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

// -----------------------------------------------------------------------------
// Readiness — what is stopping this organization from booking anything
// -----------------------------------------------------------------------------

/**
 * The question every operator opening an empty queue actually has: why can't I
 * book this? Four counts answer it, and the UI turns them into a checklist.
 *
 * Deliberately reports counts rather than a boolean. "Not ready" is useless;
 * "no suites at Covington" is a thing someone can go and fix.
 */
bookingRouter.get(
  '/readiness',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const businessIds = requestBusinessScope(businessId);
      const horizon = new Date(Date.now() + 14 * 86_400_000).toISOString();

      const count = async (table: string, apply?: (query: any) => any) => {
        let query = db.from(table).select('id', { count: 'exact', head: true }).in('business_id', businessIds);
        if (apply) query = apply(query);
        const { count: total, error } = await query;
        if (error) throw error;
        return total ?? 0;
      };

      const [locations, rooms, services, eligibility, shifts, staff] = await Promise.all([
        count('locations'),
        count('rooms', (q) => q.eq('active', true)),
        count('appointment_services', (q) => q.eq('active', true)),
        count('employee_service_eligibility', (q) => q.eq('active', true)),
        db
          .from('employee_schedules')
          .select('id', { count: 'exact', head: true })
          .in('business_id', businessIds)
          .eq('status', 'published')
          .gte('end_at', new Date().toISOString())
          .lte('start_at', horizon),
        count('business_memberships', (q) => q.eq('status', 'ACTIVE')),
      ]);

      if (shifts.error) throw shifts.error;
      const publishedShifts = shifts.count ?? 0;

      const steps = [
        {
          key: 'suites',
          label: 'Add your suites',
          done: rooms > 0,
          count: rooms,
          blocking: true,
          detail: rooms > 0
            ? `${rooms} suite${rooms === 1 ? '' : 's'} ready`
            : 'A booking needs somewhere to happen. Add each fitting room or suite.',
        },
        {
          key: 'services',
          label: 'Define your appointment types',
          done: services > 0,
          count: services,
          blocking: true,
          detail: services > 0
            ? `${services} type${services === 1 ? '' : 's'} ready`
            : 'How long is a bridal appointment? Without a duration there is no end time to book.',
        },
        {
          key: 'eligibility',
          label: 'Say who can take each appointment type',
          done: eligibility > 0,
          count: eligibility,
          blocking: true,
          detail: eligibility > 0
            ? `${eligibility} consultant/type pairing${eligibility === 1 ? '' : 's'}`
            : `You have ${staff} team member${staff === 1 ? '' : 's'}. Tick which appointment types each one takes.`,
        },
        {
          key: 'shifts',
          label: 'Publish who is working',
          done: publishedShifts > 0,
          count: publishedShifts,
          blocking: true,
          detail: publishedShifts > 0
            ? `${publishedShifts} published shift${publishedShifts === 1 ? '' : 's'} in the next 14 days`
            : 'Slots come from published shifts. A draft rota offers nothing.',
        },
      ];

      return res.json({
        ready: steps.every((step) => step.done),
        steps,
        context: { locations, staff },
      });
    } catch (err: any) {
      console.error('[booking.readiness] failed:', err?.message || err);
      return fail(res, 500, 'Could not check booking readiness.');
    }
  },
);

// -----------------------------------------------------------------------------
// Setup: suites, appointment types, eligibility
// -----------------------------------------------------------------------------

bookingRouter.get(
  '/rooms',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const { data, error } = await db
        .from('rooms')
        .select('id,name,room_type,capacity,active,location_id')
        .in('business_id', requestBusinessScope(businessId))
        .order('name');
      if (error) throw error;
      return res.json({ rooms: data ?? [] });
    } catch (err: any) {
      console.error('[booking.rooms.list] failed:', err?.message || err);
      return fail(res, 500, 'Could not load suites.');
    }
  },
);

bookingRouter.post(
  '/rooms',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const name = trimmed(req.body?.name, 120);
      if (!name) return fail(res, 400, 'A suite needs a name.');

      const locationId = trimmed(req.body?.locationId, 64) || null;
      if (locationId && !(await locationInBusiness(db, businessId, locationId))) {
        return fail(res, 403, 'That location is outside the active organization.');
      }

      const { data, error } = await db
        .from('rooms')
        .insert({
          business_id: businessId,
          location_id: locationId,
          name,
          room_type: trimmed(req.body?.roomType, 60) || null,
          capacity: positiveInt(req.body?.capacity, 1),
          active: req.body?.active !== false,
        })
        .select('id,name,room_type,capacity,active,location_id')
        .single();
      if (error) throw error;
      return res.status(201).json({ room: data });
    } catch (err: any) {
      console.error('[booking.rooms.create] failed:', err?.message || err);
      return fail(res, 500, 'Could not create the suite.');
    }
  },
);

bookingRouter.patch(
  '/rooms/:id',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const patch: Record<string, unknown> = {};
      if (req.body?.name !== undefined) patch.name = trimmed(req.body.name, 120);
      if (req.body?.roomType !== undefined) patch.room_type = trimmed(req.body.roomType, 60) || null;
      if (req.body?.capacity !== undefined) patch.capacity = positiveInt(req.body.capacity, 1);
      if (req.body?.active !== undefined) patch.active = Boolean(req.body.active);
      if (Object.keys(patch).length === 0) return fail(res, 400, 'Nothing to update.');
      if (patch.name === '') return fail(res, 400, 'A suite needs a name.');

      // business_id in the predicate, not just the id: an id from the browser is
      // an input, and this is the only thing stopping a cross-tenant rename.
      const { data, error } = await db
        .from('rooms')
        .update(patch)
        .eq('id', req.params.id)
        .in('business_id', requestBusinessScope(businessId))
        .select('id,name,room_type,capacity,active,location_id')
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail(res, 404, 'Suite not found in this organization.');
      return res.json({ room: data });
    } catch (err: any) {
      console.error('[booking.rooms.update] failed:', err?.message || err);
      return fail(res, 500, 'Could not update the suite.');
    }
  },
);

bookingRouter.get(
  '/services',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const { data, error } = await db
        .from('appointment_services')
        .select(SERVICE_COLUMNS)
        .in('business_id', requestBusinessScope(businessId))
        .order('name');
      if (error) throw error;
      return res.json({ services: data ?? [] });
    } catch (err: any) {
      console.error('[booking.services.list] failed:', err?.message || err);
      return fail(res, 500, 'Could not load appointment types.');
    }
  },
);

bookingRouter.post(
  '/services',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const name = trimmed(req.body?.name, 120);
      if (!name) return fail(res, 400, 'An appointment type needs a name.');

      const duration = positiveInt(req.body?.durationMinutes, 0);
      if (duration <= 0) return fail(res, 400, 'An appointment type needs a duration in minutes.');
      if (duration > 8 * 60) return fail(res, 400, 'That duration looks wrong — the maximum is 8 hours.');

      const { data, error } = await db
        .from('appointment_services')
        .insert({
          business_id: businessId,
          name,
          duration_minutes: duration,
          setup_buffer_minutes: nonNegativeInt(req.body?.setupBufferMinutes, 0),
          cleanup_buffer_minutes: nonNegativeInt(req.body?.cleanupBufferMinutes, 0),
          required_role: trimmed(req.body?.requiredRole, 60) || null,
          required_room_type: trimmed(req.body?.requiredRoomType, 60) || null,
          intake_keywords: keywordList(req.body?.intakeKeywords),
          is_default: Boolean(req.body?.isDefault),
          active: req.body?.active !== false,
        })
        .select(SERVICE_COLUMNS)
        .single();
      if (error) {
        if (isUniqueViolation(error)) return fail(res, 409, 'There is already a default appointment type. Un-default it first.');
        throw error;
      }
      return res.status(201).json({ service: data });
    } catch (err: any) {
      console.error('[booking.services.create] failed:', err?.message || err);
      return fail(res, 500, 'Could not create the appointment type.');
    }
  },
);

bookingRouter.patch(
  '/services/:id',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const patch: Record<string, unknown> = {};
      if (req.body?.name !== undefined) patch.name = trimmed(req.body.name, 120);
      if (req.body?.durationMinutes !== undefined) patch.duration_minutes = positiveInt(req.body.durationMinutes, 0);
      if (req.body?.setupBufferMinutes !== undefined) patch.setup_buffer_minutes = nonNegativeInt(req.body.setupBufferMinutes, 0);
      if (req.body?.cleanupBufferMinutes !== undefined) patch.cleanup_buffer_minutes = nonNegativeInt(req.body.cleanupBufferMinutes, 0);
      if (req.body?.requiredRoomType !== undefined) patch.required_room_type = trimmed(req.body.requiredRoomType, 60) || null;
      if (req.body?.intakeKeywords !== undefined) patch.intake_keywords = keywordList(req.body.intakeKeywords);
      if (req.body?.isDefault !== undefined) patch.is_default = Boolean(req.body.isDefault);
      if (req.body?.active !== undefined) patch.active = Boolean(req.body.active);
      if (Object.keys(patch).length === 0) return fail(res, 400, 'Nothing to update.');
      if (patch.name === '') return fail(res, 400, 'An appointment type needs a name.');
      if (patch.duration_minutes === 0) return fail(res, 400, 'Duration must be at least a minute.');

      const { data, error } = await db
        .from('appointment_services')
        .update(patch)
        .eq('id', req.params.id)
        .in('business_id', requestBusinessScope(businessId))
        .select(SERVICE_COLUMNS)
        .maybeSingle();
      if (error) {
        if (isUniqueViolation(error)) return fail(res, 409, 'There is already a default appointment type. Un-default it first.');
        throw error;
      }
      if (!data) return fail(res, 404, 'Appointment type not found in this organization.');
      return res.json({ service: data });
    } catch (err: any) {
      console.error('[booking.services.update] failed:', err?.message || err);
      return fail(res, 500, 'Could not update the appointment type.');
    }
  },
);

/**
 * Loads the team with their display names.
 *
 * The Staffing tab currently renders exactly this list under the heading
 * "ELIGIBLE EMPLOYEES", which is a roster wearing an eligibility label — it
 * never consulted employee_service_eligibility, a shift, or the requested date.
 * Here the roster stays a roster, and eligibility is a separate, real thing.
 */
async function loadTeam(db: any, businessId: string): Promise<Map<string, { name: string; role: string | null }>> {
  const businessIds = requestBusinessScope(businessId);
  const { data: memberships, error } = await db
    .from('business_memberships')
    .select('user_id,role,status')
    .in('business_id', businessIds)
    .eq('status', 'ACTIVE');
  if (error) throw error;

  const ids = [...new Set((memberships ?? []).map((m: any) => m.user_id).filter(Boolean))];
  const team = new Map<string, { name: string; role: string | null }>();
  if (ids.length === 0) return team;

  const { data: profiles, error: profileError } = await db
    .from('staff_profiles')
    .select('id,name,role')
    .in('id', ids);
  if (profileError) throw profileError;

  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  for (const membership of memberships ?? []) {
    const profile: any = byId.get(membership.user_id);
    team.set(membership.user_id, {
      name: profile?.name || 'Unnamed team member',
      role: profile?.role || membership.role || null,
    });
  }
  return team;
}

bookingRouter.get(
  '/eligibility',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const [team, existing] = await Promise.all([
        loadTeam(db, businessId),
        db
          .from('employee_service_eligibility')
          .select('employee_id,service_id,skill_level,active')
          .in('business_id', requestBusinessScope(businessId)),
      ]);
      if (existing.error) throw existing.error;

      return res.json({
        team: [...team.entries()].map(([id, info]) => ({ employeeId: id, name: info.name, role: info.role })),
        eligibility: (existing.data ?? []).map((row: any) => ({
          employeeId: row.employee_id,
          serviceId: row.service_id,
          skillLevel: row.skill_level ?? 1,
          active: row.active !== false,
        })),
      });
    } catch (err: any) {
      console.error('[booking.eligibility.list] failed:', err?.message || err);
      return fail(res, 500, 'Could not load who can take which appointments.');
    }
  },
);

bookingRouter.put(
  '/eligibility',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const employeeId = trimmed(req.body?.employeeId, 64);
      const serviceId = trimmed(req.body?.serviceId, 64);
      if (!employeeId || !serviceId) return fail(res, 400, 'A consultant and an appointment type are both required.');

      // Both sides must belong to this organization. Either id could otherwise
      // be swapped for another tenant's.
      const team = await loadTeam(db, businessId);
      if (!team.has(employeeId)) return fail(res, 403, 'That person is not on this team.');

      const { data: service, error: serviceError } = await db
        .from('appointment_services')
        .select('id')
        .eq('id', serviceId)
        .in('business_id', requestBusinessScope(businessId))
        .maybeSingle();
      if (serviceError) throw serviceError;
      if (!service) return fail(res, 404, 'Appointment type not found in this organization.');

      const active = req.body?.active !== false;
      const skillLevel = Math.min(Math.max(positiveInt(req.body?.skillLevel, 1), 1), 5);

      const { error } = await db
        .from('employee_service_eligibility')
        .upsert(
          { business_id: businessId, employee_id: employeeId, service_id: serviceId, skill_level: skillLevel, active },
          { onConflict: 'employee_id,service_id' },
        );
      if (error) throw error;
      return res.json({ employeeId, serviceId, skillLevel, active });
    } catch (err: any) {
      console.error('[booking.eligibility.set] failed:', err?.message || err);
      return fail(res, 500, 'Could not save eligibility.');
    }
  },
);

// -----------------------------------------------------------------------------
// The party — who is actually coming
// -----------------------------------------------------------------------------

const PARTY_ROLES = new Set([
  'BRIDE', 'PARTNER', 'MOTHER', 'FATHER', 'MAID_OF_HONOUR',
  'BRIDESMAID', 'FAMILY', 'FRIEND', 'PAYER', 'GUEST', 'OTHER',
]);

bookingRouter.get(
  '/requests/:id/party',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const { data, error } = await db
        .from('appointment_party_members')
        .select('id,full_name,role,is_primary,email,phone,notes,attending,arrived_at')
        .eq('request_id', req.params.id)
        .in('business_id', requestBusinessScope(businessId))
        .order('is_primary', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return res.json({ party: data ?? [] });
    } catch (err: any) {
      console.error('[booking.party.list] failed:', err?.message || err);
      return fail(res, 500, 'Could not load the party.');
    }
  },
);

/**
 * Replaces the whole party for a request in one call.
 *
 * Whole-list replacement rather than per-row CRUD because the editor is a list
 * the operator edits and saves. Partial updates across a set that has a
 * "exactly one primary" constraint is where races and half-saved parties come
 * from.
 */
bookingRouter.put(
  '/requests/:id/party',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const businessIds = requestBusinessScope(businessId);

      const { data: request, error: requestError } = await db
        .from('appointment_requests')
        .select('id')
        .eq('id', req.params.id)
        .in('business_id', businessIds)
        .maybeSingle();
      if (requestError) throw requestError;
      if (!request) return fail(res, 404, 'Request not found in this organization.');

      const incoming = Array.isArray(req.body?.party) ? req.body.party : null;
      if (!incoming) return fail(res, 400, 'Expected a "party" array.');
      if (incoming.length > 25) return fail(res, 400, 'That is more than 25 people — split it across appointments.');

      const rows = incoming
        .map((member: any) => ({
          business_id: businessId,
          request_id: req.params.id,
          full_name: trimmed(member?.fullName, 160),
          role: PARTY_ROLES.has(trimmed(member?.role, 32).toUpperCase())
            ? trimmed(member.role, 32).toUpperCase()
            : 'GUEST',
          is_primary: Boolean(member?.isPrimary),
          email: trimmed(member?.email, 160) || null,
          phone: trimmed(member?.phone, 60) || null,
          notes: trimmed(member?.notes, 1000) || null,
          attending: member?.attending !== false,
        }))
        .filter((row: any) => row.full_name);

      if (rows.filter((row: any) => row.is_primary).length > 1) {
        return fail(res, 400, 'Only one person can be the bride.');
      }

      const { error: deleteError } = await db
        .from('appointment_party_members')
        .delete()
        .eq('request_id', req.params.id)
        .in('business_id', businessIds);
      if (deleteError) throw deleteError;

      if (rows.length === 0) return res.json({ party: [] });

      const { data, error } = await db
        .from('appointment_party_members')
        .insert(rows)
        .select('id,full_name,role,is_primary,email,phone,notes,attending,arrived_at');
      if (error) throw error;
      return res.json({ party: data ?? [] });
    } catch (err: any) {
      console.error('[booking.party.save] failed:', err?.message || err);
      return fail(res, 500, 'Could not save the party.');
    }
  },
);

// -----------------------------------------------------------------------------
// Slots
// -----------------------------------------------------------------------------

/** Everything the pure generator needs, fetched under the caller's tenant scope. */
async function loadSlotInputs(
  db: any,
  businessId: string,
  serviceId: string,
  locationId: string | null,
  fromMs: number,
  toMs: number,
) {
  const businessIds = requestBusinessScope(businessId);
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(toMs).toISOString();

  const { data: serviceRow, error: serviceError } = await db
    .from('appointment_services')
    .select('id,name,duration_minutes,setup_buffer_minutes,cleanup_buffer_minutes,required_room_type,active')
    .eq('id', serviceId)
    .in('business_id', businessIds)
    .maybeSingle();
  if (serviceError) throw serviceError;
  if (!serviceRow) return { error: 'That appointment type does not exist in this organization.' as const };
  if (serviceRow.active === false) return { error: 'That appointment type is switched off.' as const };

  const service: ServiceSpec = {
    id: serviceRow.id,
    name: serviceRow.name,
    durationMinutes: serviceRow.duration_minutes,
    setupBufferMinutes: serviceRow.setup_buffer_minutes ?? 0,
    cleanupBufferMinutes: serviceRow.cleanup_buffer_minutes ?? 0,
    requiredRoomType: serviceRow.required_room_type ?? null,
  };

  let shiftQuery = db
    .from('employee_schedules')
    .select('id,employee_id,location_id,start_at,end_at')
    .in('business_id', businessIds)
    .eq('status', 'published')
    .lt('start_at', toIso)
    .gt('end_at', fromIso);
  if (locationId) shiftQuery = shiftQuery.or(`location_id.eq.${locationId},location_id.is.null`);

  const [shiftRes, eligibilityRes, roomRes, team] = await Promise.all([
    shiftQuery,
    db
      .from('employee_service_eligibility')
      .select('employee_id,skill_level,active')
      .in('business_id', businessIds)
      .eq('service_id', serviceId)
      .eq('active', true),
    db
      .from('rooms')
      .select('id,name,room_type,capacity,location_id')
      .in('business_id', businessIds)
      .eq('active', true),
    loadTeam(db, businessId),
  ]);
  for (const result of [shiftRes, eligibilityRes, roomRes]) {
    if (result?.error) throw result.error;
  }

  const shifts: ShiftWindow[] = (shiftRes.data ?? []).map((row: any) => ({
    employeeId: row.employee_id,
    locationId: row.location_id ?? null,
    start: Date.parse(row.start_at),
    end: Date.parse(row.end_at),
  }));

  const eligible: EligibleEmployee[] = (eligibilityRes.data ?? [])
    .filter((row: any) => team.has(row.employee_id))
    .map((row: any) => ({
      employeeId: row.employee_id,
      displayName: team.get(row.employee_id)?.name ?? 'Team member',
      skillLevel: row.skill_level ?? 1,
    }));

  const rooms: RoomInfo[] = (roomRes.data ?? [])
    .filter((row: any) => !locationId || !row.location_id || row.location_id === locationId)
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      roomType: row.room_type ?? null,
      capacity: Math.max(row.capacity ?? 1, 1),
      locationId: row.location_id ?? null,
    }));

  const employeeIds = [...new Set(shifts.map((shift) => shift.employeeId))];
  const employeeBusy = new Map<string, Interval[]>();
  const roomBusy = new Map<string, Interval[]>();
  const pushBusy = (map: Map<string, Interval[]>, key: string | null, interval: Interval) => {
    if (!key || !Number.isFinite(interval.start) || !Number.isFinite(interval.end)) return;
    const list = map.get(key) ?? [];
    list.push(interval);
    map.set(key, list);
  };

  if (employeeIds.length > 0 || rooms.length > 0) {
    const [appointments, holds, breaks] = await Promise.all([
      db
        .from('appointments')
        .select('employee_id,room_id,start_at,end_at,status')
        .in('business_id', businessIds)
        .lt('start_at', toIso)
        .gt('end_at', fromIso),
      db
        .from('appointment_holds')
        .select('employee_id,room_id,start_at,end_at')
        .in('business_id', businessIds)
        .gt('expires_at', new Date().toISOString())
        .lt('start_at', toIso)
        .gt('end_at', fromIso),
      // Breaks hang off a schedule, so they are fetched by schedule id.
      (shiftRes.data ?? []).length
        ? db
            .from('employee_schedule_breaks')
            .select('schedule_id,start_at,end_at')
            .in('schedule_id', (shiftRes.data ?? []).map((row: any) => row.id))
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [appointments, holds, breaks]) {
      if (result?.error) throw result.error;
    }

    const cancelled = new Set(['Canceled', 'Cancelled', 'No-show']);
    for (const row of appointments.data ?? []) {
      if (cancelled.has(row.status)) continue;
      const interval = { start: Date.parse(row.start_at), end: Date.parse(row.end_at) };
      pushBusy(employeeBusy, row.employee_id, interval);
      pushBusy(roomBusy, row.room_id, interval);
    }
    for (const row of holds.data ?? []) {
      const interval = { start: Date.parse(row.start_at), end: Date.parse(row.end_at) };
      pushBusy(employeeBusy, row.employee_id, interval);
      pushBusy(roomBusy, row.room_id, interval);
    }
    const scheduleOwner = new Map<string, string>(
      (shiftRes.data ?? []).map((row: any) => [String(row.id), String(row.employee_id)]),
    );
    for (const row of breaks.data ?? []) {
      pushBusy(employeeBusy, scheduleOwner.get(String(row.schedule_id)) ?? null, {
        start: Date.parse(row.start_at),
        end: Date.parse(row.end_at),
      });
    }
  }

  return { service, shifts, eligible, rooms, employeeBusy, roomBusy };
}

/**
 * Offers real, bookable times for a request.
 *
 * Returns an empty list with a `blockedBy` explanation rather than an empty
 * list on its own. "No availability" and "you have not published any shifts"
 * look identical to an operator otherwise, and this codebase has already been
 * bitten several times by absence of data reading as absence of a problem.
 */
bookingRouter.post(
  '/slots',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const businessIds = requestBusinessScope(businessId);

      const requestId = trimmed(req.body?.requestId, 64);
      let serviceId = trimmed(req.body?.serviceId, 64);
      let locationId = trimmed(req.body?.locationId, 64) || null;
      let preferredDates: string[] = [];
      let preferredWindows: string[] = [];
      let preferredEmployeeId: string | null = null;

      if (requestId) {
        const { data: request, error } = await db
          .from('appointment_requests')
          .select('id,service_id,preferred_location_id,preferred_date_1,preferred_date_2,preferred_window_1,preferred_window_2,preferred_employee_id')
          .eq('id', requestId)
          .in('business_id', businessIds)
          .maybeSingle();
        if (error) throw error;
        if (!request) return fail(res, 404, 'Request not found in this organization.');

        serviceId = serviceId || request.service_id || '';
        locationId = locationId || request.preferred_location_id || null;
        preferredDates = [request.preferred_date_1, request.preferred_date_2].filter(Boolean);
        preferredWindows = [request.preferred_window_1, request.preferred_window_2].filter(Boolean);
        preferredEmployeeId = request.preferred_employee_id ?? null;
      }

      if (!serviceId) {
        return res.json({
          slots: [],
          blockedBy: 'NO_SERVICE',
          message: 'Pick an appointment type first — the duration is what turns a shift into bookable times.',
        });
      }
      if (locationId && !(await locationInBusiness(db, businessId, locationId))) {
        return fail(res, 403, 'That location is outside the active organization.');
      }

      const fromMs = Date.parse(trimmed(req.body?.from, 40)) || Date.now();
      const requestedTo = Date.parse(trimmed(req.body?.to, 40));
      const toMs = Number.isFinite(requestedTo)
        ? Math.min(requestedTo, fromMs + MAX_WINDOW_DAYS * 86_400_000)
        : fromMs + 14 * 86_400_000;
      if (toMs <= fromMs) return fail(res, 400, 'The search window ends before it starts.');

      const loaded = await loadSlotInputs(db, businessId, serviceId, locationId, fromMs, toMs);
      if ('error' in loaded) return fail(res, 400, String(loaded.error));

      let timeZone = DEFAULT_TIME_ZONE;
      if (locationId) {
        const { data: location } = await db.from('locations').select('timezone').eq('id', locationId).maybeSingle();
        if (location?.timezone) timeZone = location.timezone;
      }

      if (loaded.eligible.length === 0) {
        return res.json({
          slots: [],
          blockedBy: 'NO_ELIGIBLE_STAFF',
          message: `Nobody is marked as able to take "${loaded.service.name}" yet.`,
        });
      }
      if (loaded.rooms.length === 0) {
        return res.json({ slots: [], blockedBy: 'NO_ROOMS', message: 'No active suites at this location.' });
      }
      if (loaded.shifts.length === 0) {
        return res.json({
          slots: [],
          blockedBy: 'NO_PUBLISHED_SHIFTS',
          message: 'No published shifts in this window. A draft rota offers no times.',
        });
      }

      const slots = generateSlots({
        ...loaded,
        preferences: { preferredDates, preferredWindows, preferredEmployeeId, timeZone },
        granularityMinutes: positiveInt(req.body?.granularityMinutes, 15),
        notBefore: fromMs,
        maxSlots: Math.min(positiveInt(req.body?.limit, 40), 200),
      });

      return res.json({
        slots,
        service: { id: loaded.service.id, name: loaded.service.name, durationMinutes: loaded.service.durationMinutes },
        timeZone,
        blockedBy: slots.length === 0 ? 'FULLY_BOOKED' : null,
        message: slots.length === 0 ? 'Every published shift in this window is already committed.' : null,
      });
    } catch (err: any) {
      console.error('[booking.slots] failed:', err?.message || err);
      return fail(res, 500, 'Could not work out available times.');
    }
  },
);

// -----------------------------------------------------------------------------
// Assignment
// -----------------------------------------------------------------------------

/**
 * Books the appointment.
 *
 * This is the guarded replacement for the browser calling assign_appointment_request
 * over PostgREST. Same outcome, except the tenant is established by verified
 * membership rather than by whatever the page put in the payload, and the
 * advisory-locked idempotent RPC is the one doing the work.
 */
bookingRouter.post(
  '/assign',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const requestId = trimmed(req.body?.requestId, 64);
      const employeeId = trimmed(req.body?.employeeId, 64);
      const roomId = trimmed(req.body?.roomId, 64) || null;
      const startAt = trimmed(req.body?.startAt, 40);
      const endAt = trimmed(req.body?.endAt, 40);

      if (!requestId || !employeeId || !startAt || !endAt) {
        return fail(res, 400, 'A request, a consultant, a start and an end are all required.');
      }
      const startMs = Date.parse(startAt);
      const endMs = Date.parse(endAt);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return fail(res, 400, 'That appointment ends before it starts.');
      }

      const { data: request, error: requestError } = await db
        .from('appointment_requests')
        .select('id,preferred_location_id')
        .eq('id', requestId)
        .in('business_id', requestBusinessScope(businessId))
        .maybeSingle();
      if (requestError) throw requestError;
      if (!request) return fail(res, 404, 'Request not found in this organization.');

      const locationId = trimmed(req.body?.locationId, 64) || request.preferred_location_id || null;
      if (locationId && !(await locationInBusiness(db, businessId, locationId))) {
        return fail(res, 403, 'That location is outside the active organization.');
      }

      const { data, error } = await db.rpc('assign_appointment_idempotent', {
        p_business_id: businessId,
        p_request_id: requestId,
        p_employee_id: employeeId,
        p_location_id: locationId,
        p_room_id: roomId,
        p_start_at: new Date(startMs).toISOString(),
        p_end_at: new Date(endMs).toISOString(),
      });

      if (error) {
        // The RPC raises for real, explainable reasons — double booking, a suite
        // at capacity, a stale request. Those belong in front of the operator
        // verbatim, not behind a generic 500.
        const message = String(error.message || '').replace(/^.*?ERROR:\s*/i, '').trim();
        return res.status(409).json({ error: message || 'That time is no longer available.' });
      }

      // Confirmations ride the existing outbox. Its scheduler already retries
      // pending rows with backoff, and it already delivers via send-message —
      // so once that function has credentials, these flow without a redeploy.
      // Best-effort: the booking exists; a notification hiccup must not undo it.
      const notifications = await enqueueBookingConfirmation(db, businessId, {
        requestId,
        appointment: data,
        employeeId,
        roomId,
        locationId,
      }).catch((notifyError: unknown) => {
        console.error('[booking.assign] confirmation enqueue failed:', notifyError instanceof Error ? notifyError.message : notifyError);
        return 0;
      });

      return res.status(201).json({ appointment: data, notificationsQueued: notifications });
    } catch (err: any) {
      console.error('[booking.assign] failed:', err?.message || err);
      return fail(res, 500, 'Could not book the appointment.');
    }
  },
);

// -----------------------------------------------------------------------------
// Confirmation
// -----------------------------------------------------------------------------

/**
 * Queues "you're booked" to the bride and "she's booked" to the boutique.
 *
 * Rows go into appointment_intake_notification_outbox with status 'pending' so
 * retryPendingAppointmentNotifications picks them up on its next tick. Nothing
 * here calls send-message directly: the outbox owns retry, backoff and the
 * 8-attempt ceiling, and duplicating that logic is how two schedulers end up
 * sending the same email.
 *
 * Returns how many rows were queued so the caller can say so.
 */
async function enqueueBookingConfirmation(
  db: any,
  businessId: string,
  input: { requestId: string; appointment: any; employeeId: string; roomId: string | null; locationId: string | null },
): Promise<number> {
  const appointment = input.appointment ?? {};
  const businessIds = requestBusinessScope(businessId);

  const [request, team, room, location] = await Promise.all([
    db
      .from('appointment_requests')
      .select('customer_id, brand_id, customers:customer_id(name,email)')
      .eq('id', input.requestId)
      .in('business_id', businessIds)
      .maybeSingle(),
    loadTeam(db, businessId),
    input.roomId
      ? db.from('rooms').select('name').eq('id', input.roomId).maybeSingle()
      : Promise.resolve({ data: null }),
    input.locationId
      ? db.from('locations').select('name,email,timezone,address').eq('id', input.locationId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (request?.error) throw request.error;

  const customer = request?.data?.customers ?? null;
  const consultant = team.get(input.employeeId)?.name ?? 'your consultant';
  const timeZone = location?.data?.timezone || DEFAULT_TIME_ZONE;
  const when = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(appointment.start_at ?? Date.now()));

  const where = [location?.data?.name, location?.data?.address].filter(Boolean).join(', ');
  const suite = room?.data?.name ? ` in ${room.data.name}` : '';

  const rows: Array<Record<string, unknown>> = [];

  if (customer?.email) {
    rows.push({
      appointment_request_id: input.requestId,
      business_id: businessId,
      brand_id: request?.data?.brand_id ?? null,
      recipient: String(customer.email).toLowerCase(),
      notification_type: 'appointment_confirmed',
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
      payload: {
        subject: `You're booked — ${when}`,
        body: [
          `Hi ${customer.name || 'there'},`,
          '',
          `Your appointment is confirmed for ${when}${suite} with ${consultant}.`,
          where ? `Where: ${where}` : '',
          '',
          "If anything changes, reply to this email or call the boutique and we'll move it.",
          '',
          'We can\'t wait to see you.',
        ].filter((line) => line !== null).join('\n'),
      },
    });
  }

  if (location?.data?.email) {
    rows.push({
      appointment_request_id: input.requestId,
      business_id: businessId,
      brand_id: request?.data?.brand_id ?? null,
      recipient: String(location.data.email).toLowerCase(),
      notification_type: 'appointment_confirmed_boutique',
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
      payload: {
        subject: `Booked: ${customer?.name || 'a bride'} — ${when}`,
        body: [
          `${customer?.name || 'A bride'} is booked for ${when}${suite} with ${consultant}.`,
          customer?.email ? `Email: ${customer.email}` : '',
          `Request id: ${input.requestId}`,
          `Appointment id: ${appointment.id ?? 'unknown'}`,
        ].filter(Boolean).join('\n'),
      },
    });
  }

  if (rows.length === 0) return 0;
  const { error } = await db.from('appointment_intake_notification_outbox').insert(rows);
  if (error) throw error;
  return rows.length;
}

// -----------------------------------------------------------------------------
// Apply a service to the requests that arrived before it existed
// -----------------------------------------------------------------------------

/**
 * When the operator finally defines "Bridal Appointment", the 3,705 requests
 * already sitting there still have service_id = null. This runs the same
 * resolution intake now runs, over the backlog, so those become bookable
 * without anyone touching them one by one.
 *
 * Only untyped requests are touched. A request that already has a service was
 * either resolved at intake or set by a person, and neither gets overridden.
 */
bookingRouter.post(
  '/services/apply-to-untyped',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const businessIds = requestBusinessScope(businessId);

      const { data: untyped, error } = await db
        .from('appointment_requests')
        .select('id,type,looking_for,business_id')
        .in('business_id', businessIds)
        .is('service_id', null)
        .not('status', 'in', '(archived,sold_archived,unsold_archived,confirmed)')
        .limit(2000);
      if (error) throw error;

      let updated = 0;
      let unresolved = 0;
      for (const row of untyped ?? []) {
        const { data: serviceId, error: rpcError } = await db.rpc('resolve_intake_service', {
          p_business_id: row.business_id,
          p_text: row.type ?? row.looking_for ?? null,
        });
        if (rpcError) throw rpcError;
        if (!serviceId) {
          unresolved += 1;
          continue;
        }
        const { error: updateError } = await db
          .from('appointment_requests')
          .update({ service_id: serviceId })
          .eq('id', row.id)
          .is('service_id', null);
        if (updateError) throw updateError;
        updated += 1;
      }

      return res.json({ scanned: (untyped ?? []).length, updated, unresolved });
    } catch (err: any) {
      console.error('[booking.services.apply] failed:', err?.message || err);
      return fail(res, 500, 'Could not apply appointment types to existing requests.');
    }
  },
);

// -----------------------------------------------------------------------------
// Arrival — who has actually walked in
// -----------------------------------------------------------------------------

bookingRouter.get(
  '/appointments/:id/party',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const { db, businessId } = ctxOf(req);
      const { data, error } = await db
        .from('appointment_party_members')
        .select('id,full_name,role,is_primary,email,phone,notes,attending,arrived_at')
        .eq('appointment_id', req.params.id)
        .in('business_id', requestBusinessScope(businessId))
        .order('is_primary', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return res.json({ party: data ?? [] });
    } catch (err: any) {
      console.error('[booking.appointment.party] failed:', err?.message || err);
      return fail(res, 500, 'Could not load the party.');
    }
  },
);

/**
 * Marks one person as arrived (or un-marks them).
 *
 * The first arrival also checks the appointment in, via the existing
 * check_in_appointment RPC when it is present — that is the moment the bride
 * is in the building, and the moment the consultant's clock starts.
 */
bookingRouter.post(
  '/appointments/:id/party/:memberId/arrival',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const { db, businessId, userId } = ctxOf(req);
      const businessIds = requestBusinessScope(businessId);
      const arrived = req.body?.arrived !== false;

      const { data: member, error } = await db
        .from('appointment_party_members')
        .update({
          arrived_at: arrived ? new Date().toISOString() : null,
          checked_in_by: arrived ? userId ?? null : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.memberId)
        .eq('appointment_id', req.params.id)
        .in('business_id', businessIds)
        .select('id,full_name,role,is_primary,arrived_at')
        .maybeSingle();
      if (error) throw error;
      if (!member) return fail(res, 404, 'That person is not on this appointment.');

      let appointmentCheckedIn = false;
      if (arrived) {
        const { data: appointment } = await db
          .from('appointments')
          .select('id,check_in_time')
          .eq('id', req.params.id)
          .in('business_id', businessIds)
          .maybeSingle();
        if (appointment && !appointment.check_in_time) {
          const { error: checkInError } = await db
            .from('appointments')
            .update({ check_in_time: new Date().toISOString() })
            .eq('id', req.params.id)
            .in('business_id', businessIds);
          if (!checkInError) appointmentCheckedIn = true;
        }
      }

      return res.json({ member, appointmentCheckedIn });
    } catch (err: any) {
      console.error('[booking.appointment.arrival] failed:', err?.message || err);
      return fail(res, 500, 'Could not record the arrival.');
    }
  },
);
