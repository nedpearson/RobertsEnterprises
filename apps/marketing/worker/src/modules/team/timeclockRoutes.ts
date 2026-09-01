import { Router } from 'express';
import { requirePermission, requireTenantMember, tenantContextOf } from '../../lib/auth/tenantContext';

export const timeclockRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 1000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const numberOrNull = (value: unknown, min: number, max: number): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

interface BrowserPosition {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

interface LocationGeo {
  id: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number | null;
}

function positionFrom(body: any): BrowserPosition {
  return {
    latitude: numberOrNull(body?.position?.latitude, -90, 90),
    longitude: numberOrNull(body?.position?.longitude, -180, 180),
    accuracy: numberOrNull(body?.position?.accuracy, 0, 100_000),
  };
}

function radians(value: number) { return value * Math.PI / 180; }
function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const earth = 6_371_000;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const lat1 = radians(aLat);
  const lat2 = radians(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function evaluateGeofence(location: LocationGeo, position: BrowserPosition) {
  if (location.latitude === null || location.longitude === null) {
    return { status: 'UNCONFIGURED' as const, distanceMeters: null };
  }
  if (position.latitude === null || position.longitude === null) {
    return { status: 'UNAVAILABLE' as const, distanceMeters: null };
  }
  const distance = distanceMeters(location.latitude, location.longitude, position.latitude, position.longitude);
  const allowance = Math.max(25, Number(location.geofence_radius_meters || 150)) + Math.max(0, Number(position.accuracy || 0));
  return {
    status: distance <= allowance ? 'VERIFIED' as const : 'OUTSIDE' as const,
    distanceMeters: Math.round(distance * 10) / 10,
  };
}

async function audit(db: ReturnType<typeof tenantContextOf>['db'], userId: string, entityId: string, action: string, afterValue: unknown, reason: string) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: 'time_entry', entity_id: entityId, action, user_id: userId,
    before_value: null, after_value: afterValue ?? null, reason,
  });
  if (error) console.warn(`[timeclock] audit failed for ${action}:`, error.message);
}

async function getLocation(db: ReturnType<typeof tenantContextOf>['db'], businessId: string, locationId: string): Promise<LocationGeo | null> {
  const { data, error } = await db
    .from('locations')
    .select('id,latitude,longitude,geofence_radius_meters')
    .eq('business_id', businessId)
    .eq('id', locationId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as LocationGeo | null;
}

async function getStaff(db: ReturnType<typeof tenantContextOf>['db'], businessId: string, userId: string) {
  const { data, error } = await db
    .from('staff_profiles')
    .select('id,name,role')
    .eq('business_id', businessId)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; name: string; role: string } | null;
}

timeclockRouter.get('/', requireTenantMember, async (req, res) => {
  const { db, businessId, userId, role } = tenantContextOf(req);
  const [locations, staff, entries, breaks, transfers] = await Promise.all([
    db.from('locations').select('id,name,address,is_active,latitude,longitude,geofence_radius_meters').eq('business_id', businessId).eq('is_active', true).order('name'),
    db.from('staff_profiles').select('id,name,role').eq('business_id', businessId).order('name'),
    db.from('time_entries').select('*').eq('business_id', businessId).is('clock_out', null).order('clock_in'),
    db.from('time_entry_breaks').select('*').eq('business_id', businessId).is('ended_at', null).order('started_at'),
    db.from('time_entry_transfers').select('*').eq('business_id', businessId).order('transferred_at', { ascending: false }).limit(100),
  ]);
  const error = locations.error || staff.error || entries.error || breaks.error || transfers.error;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    locations: locations.data ?? [],
    staff: staff.data ?? [],
    openEntries: entries.data ?? [],
    openBreaks: breaks.data ?? [],
    recentTransfers: transfers.data ?? [],
    currentUserId: userId,
    currentRole: role,
  });
});

timeclockRouter.post('/clock-in', requireTenantMember, async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const locationId = uuid(req.body?.location_id);
  const department = text(req.body?.department, 160);
  if (!locationId || !department) return res.status(400).json({ error: 'Location and department are required.' });

  try {
    const [location, staff] = await Promise.all([getLocation(db, businessId, locationId), getStaff(db, businessId, userId)]);
    if (!location) return res.status(404).json({ error: 'Active location not found in this organization.' });
    if (!staff) return res.status(409).json({ error: 'Your account is not linked to an active staff profile.' });
    const position = positionFrom(req.body);
    const geo = evaluateGeofence(location, position);
    const { data, error } = await db.rpc('clock_in_time_entry_server', {
      p_business_id: businessId,
      p_user_id: userId,
      p_staff_name: staff.name,
      p_location_id: locationId,
      p_department: department,
      p_source: 'PERSONAL',
      p_latitude: position.latitude,
      p_longitude: position.longitude,
      p_accuracy_meters: position.accuracy,
      p_geofence_status: geo.status,
      p_distance_meters: geo.distanceMeters,
    });
    if (error) return res.status(409).json({ error: error.message });
    await audit(db, userId, (data as any).id, 'CLOCK_IN', data, `Personal clock-in (${geo.status}).`);
    return res.status(201).json({ entry: data, geofence: geo });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

timeclockRouter.post('/clock-out/:entryId', requireTenantMember, async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const entryId = uuid(req.params.entryId);
  if (!entryId) return res.status(400).json({ error: 'Valid time-entry id required.' });
  const { data: entry, error: entryError } = await db
    .from('time_entries').select('id,user_id,location_id,clock_out').eq('business_id', businessId).eq('id', entryId).maybeSingle();
  if (entryError) return res.status(500).json({ error: entryError.message });
  if (!entry) return res.status(404).json({ error: 'Time entry not found.' });
  if (entry.user_id !== userId) return res.status(403).json({ error: 'You may only clock out your own personal shift.' });
  if (!entry.location_id) return res.status(409).json({ error: 'Open shift has no location.' });

  try {
    const location = await getLocation(db, businessId, entry.location_id);
    if (!location) return res.status(409).json({ error: 'Shift location is no longer active.' });
    const position = positionFrom(req.body);
    const geo = evaluateGeofence(location, position);
    const { data, error } = await db.rpc('clock_out_time_entry_server', {
      p_business_id: businessId, p_entry_id: entryId,
      p_latitude: position.latitude, p_longitude: position.longitude, p_accuracy_meters: position.accuracy,
      p_geofence_status: geo.status, p_distance_meters: geo.distanceMeters,
    });
    if (error) return res.status(409).json({ error: error.message });
    await audit(db, userId, entryId, 'CLOCK_OUT', data, `Personal clock-out (${geo.status}).`);
    return res.json({ entry: data, geofence: geo });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

timeclockRouter.post('/breaks/start', requireTenantMember, async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const entryId = uuid(req.body?.entry_id);
  const breakType = String(req.body?.break_type ?? '').toUpperCase();
  const paid = req.body?.paid === true;
  if (!entryId || !['REST', 'MEAL'].includes(breakType)) return res.status(400).json({ error: 'Valid open entry and break type are required.' });
  const { data: entry } = await db.from('time_entries').select('id,user_id,clock_out').eq('business_id', businessId).eq('id', entryId).maybeSingle();
  if (!entry || entry.clock_out) return res.status(409).json({ error: 'Shift is not open.' });
  if (entry.user_id !== userId) return res.status(403).json({ error: 'You may only start a break on your own shift.' });
  const { data: openBreak } = await db.from('time_entry_breaks').select('id').eq('business_id', businessId).eq('time_entry_id', entryId).is('ended_at', null).maybeSingle();
  if (openBreak) return res.status(409).json({ error: 'A break is already active.' });
  const { data, error } = await db.from('time_entry_breaks').insert({ business_id: businessId, time_entry_id: entryId, break_type: breakType, paid, created_by: userId }).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, entryId, 'BREAK_STARTED', data, `${paid ? 'Paid' : 'Unpaid'} ${breakType} break started.`);
  return res.status(201).json({ break: data });
});

timeclockRouter.post('/breaks/:breakId/end', requireTenantMember, async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const breakId = uuid(req.params.breakId);
  if (!breakId) return res.status(400).json({ error: 'Valid break id required.' });
  const { data: row, error: lookupError } = await db.from('time_entry_breaks').select('id,time_entry_id,ended_at').eq('business_id', businessId).eq('id', breakId).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!row) return res.status(404).json({ error: 'Break not found.' });
  const { data: entry } = await db.from('time_entries').select('id,user_id,clock_out').eq('business_id', businessId).eq('id', row.time_entry_id).maybeSingle();
  if (!entry || entry.user_id !== userId) return res.status(403).json({ error: 'You may only end a break on your own shift.' });
  if (row.ended_at) return res.json({ break: row });
  const { data, error } = await db.from('time_entry_breaks').update({ ended_at: new Date().toISOString() }).eq('business_id', businessId).eq('id', breakId).is('ended_at', null).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, row.time_entry_id, 'BREAK_ENDED', data, 'Break ended.');
  return res.json({ break: data });
});

timeclockRouter.post('/transfer', requireTenantMember, async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const entryId = uuid(req.body?.entry_id);
  const toLocationId = uuid(req.body?.to_location_id);
  const toDepartment = text(req.body?.to_department, 160);
  if (!entryId || !toLocationId || !toDepartment) return res.status(400).json({ error: 'Open shift, destination, and department are required.' });
  const { data: entry, error: entryError } = await db.from('time_entries').select('*').eq('business_id', businessId).eq('id', entryId).maybeSingle();
  if (entryError) return res.status(500).json({ error: entryError.message });
  if (!entry || entry.clock_out) return res.status(409).json({ error: 'Shift is not open.' });
  if (entry.user_id !== userId) return res.status(403).json({ error: 'You may only transfer your own shift.' });
  const location = await getLocation(db, businessId, toLocationId).catch(() => null);
  if (!location) return res.status(404).json({ error: 'Destination location not found.' });

  const transfer = await db.from('time_entry_transfers').insert({
    business_id: businessId, time_entry_id: entryId,
    from_location_id: entry.location_id, to_location_id: toLocationId,
    from_department: entry.department, to_department: toDepartment, transferred_by: userId,
  }).select('*').single();
  if (transfer.error) return res.status(500).json({ error: transfer.error.message });
  const updated = await db.from('time_entries').update({ location_id: toLocationId, department: toDepartment, updated_at: new Date().toISOString() }).eq('business_id', businessId).eq('id', entryId).select('*').single();
  if (updated.error) return res.status(500).json({ error: updated.error.message });
  await audit(db, userId, entryId, 'SHIFT_TRANSFERRED', transfer.data, `Shift transferred to ${toDepartment}.`);
  return res.json({ entry: updated.data, transfer: transfer.data });
});

// Manager-authenticated shared kiosk. There is no fake PIN surface; the signed-in
// manager is the accountable actor for every punch created at the kiosk.
timeclockRouter.post('/kiosk/clock-in', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const staffUserId = uuid(req.body?.staff_user_id);
  const locationId = uuid(req.body?.location_id);
  const department = text(req.body?.department, 160);
  if (!staffUserId || !locationId || !department) return res.status(400).json({ error: 'Staff member, location, and department are required.' });
  try {
    const [staff, location] = await Promise.all([getStaff(db, businessId, staffUserId), getLocation(db, businessId, locationId)]);
    if (!staff || !location) return res.status(404).json({ error: 'Staff member or location not found in this organization.' });
    const position = positionFrom(req.body);
    const geo = evaluateGeofence(location, position);
    const { data, error } = await db.rpc('clock_in_time_entry_server', {
      p_business_id: businessId, p_user_id: staffUserId, p_staff_name: staff.name,
      p_location_id: locationId, p_department: department, p_source: 'MANAGER_KIOSK',
      p_latitude: position.latitude, p_longitude: position.longitude, p_accuracy_meters: position.accuracy,
      p_geofence_status: geo.status, p_distance_meters: geo.distanceMeters,
    });
    if (error) return res.status(409).json({ error: error.message });
    await audit(db, userId, (data as any).id, 'KIOSK_CLOCK_IN', data, `Manager kiosk clock-in for ${staff.name} (${geo.status}).`);
    return res.status(201).json({ entry: data, geofence: geo });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

timeclockRouter.post('/kiosk/clock-out/:entryId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const entryId = uuid(req.params.entryId);
  if (!entryId) return res.status(400).json({ error: 'Valid time-entry id required.' });
  const { data: entry, error: entryError } = await db.from('time_entries').select('id,location_id,staff_name,clock_out').eq('business_id', businessId).eq('id', entryId).maybeSingle();
  if (entryError) return res.status(500).json({ error: entryError.message });
  if (!entry) return res.status(404).json({ error: 'Time entry not found.' });
  if (!entry.location_id) return res.status(409).json({ error: 'Open shift has no location.' });
  try {
    const location = await getLocation(db, businessId, entry.location_id);
    if (!location) return res.status(409).json({ error: 'Shift location is no longer active.' });
    const position = positionFrom(req.body);
    const geo = evaluateGeofence(location, position);
    const { data, error } = await db.rpc('clock_out_time_entry_server', {
      p_business_id: businessId, p_entry_id: entryId,
      p_latitude: position.latitude, p_longitude: position.longitude, p_accuracy_meters: position.accuracy,
      p_geofence_status: geo.status, p_distance_meters: geo.distanceMeters,
    });
    if (error) return res.status(409).json({ error: error.message });
    await audit(db, userId, entryId, 'KIOSK_CLOCK_OUT', data, `Manager kiosk clock-out for ${entry.staff_name} (${geo.status}).`);
    return res.json({ entry: data, geofence: geo });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

timeclockRouter.patch('/locations/:locationId/geofence', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const locationId = uuid(req.params.locationId);
  const latitude = numberOrNull(req.body?.latitude, -90, 90);
  const longitude = numberOrNull(req.body?.longitude, -180, 180);
  const radius = Number(req.body?.geofence_radius_meters ?? 150);
  if (!locationId || latitude === null || longitude === null || !Number.isInteger(radius) || radius < 25 || radius > 5000) {
    return res.status(400).json({ error: 'Valid location, latitude, longitude, and 25–5000 meter radius are required.' });
  }
  const { data, error } = await db.from('locations').update({ latitude, longitude, geofence_radius_meters: radius }).eq('business_id', businessId).eq('id', locationId).select('id,name,address,latitude,longitude,geofence_radius_meters').single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(db, userId, locationId, 'GEOFENCE_CONFIGURED', data, 'Time-clock geofence configured from an authenticated manager session.');
  return res.json({ location: data });
});
