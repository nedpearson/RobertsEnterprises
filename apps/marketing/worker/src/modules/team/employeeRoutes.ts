import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';
import { normalizeLegacyRole, WorkspaceRole } from '../../lib/auth/authorization';
import { privilegedDataPlaneDb } from '../../shared';

export const employeeRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMPLOYMENT_STATUSES = new Set(['INVITED', 'ACTIVE', 'LEAVE', 'SUSPENDED', 'TERMINATED', 'ARCHIVED']);
const PRIVILEGED_ROLES = new Set<WorkspaceRole>([WorkspaceRole.OWNER, WorkspaceRole.STORE_MANAGER]);

type Db = ReturnType<typeof tenantContextOf>['db'];

const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 500): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const optionalText = (value: unknown, max = 500): string | null => text(value, max) || null;
const email = (value: unknown): string | null => {
  const candidate = text(value, 320).toLowerCase();
  return EMAIL_RE.test(candidate) ? candidate : null;
};
const dateOnly = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};

async function audit(
  db: Db,
  userId: string,
  entityId: string,
  action: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason: string,
) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: 'team_employee',
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    reason,
  });
  if (error) console.warn(`[team-employees] audit failed for ${action}:`, error.message);
}

async function activeOwnerCount(db: Db, businessId: string): Promise<number> {
  const { data, error } = await db
    .from('business_memberships')
    .select('user_id,role,status')
    .eq('business_id', businessId);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((row: any) =>
    normalizeLegacyRole(row.role) === WorkspaceRole.OWNER
    && String(row.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE'
  ).length;
}

function assertRoleAssignment(actorRoleInput: string, targetRoleInput: unknown): { role?: WorkspaceRole; error?: string } {
  const actorRole = normalizeLegacyRole(actorRoleInput);
  const targetRole = normalizeLegacyRole(typeof targetRoleInput === 'string' ? targetRoleInput : null);
  if (!actorRole || !targetRole) return { error: 'A valid canonical workspace role is required.' };
  if (actorRole !== WorkspaceRole.OWNER && PRIVILEGED_ROLES.has(targetRole)) {
    return { error: 'Only an Owner can assign Owner or Store Manager access.' };
  }
  return { role: targetRole };
}

async function compatibleStaffProfile(
  db: Db,
  businessId: string,
  userId: string,
  displayName: string,
  role: WorkspaceRole,
) {
  const { data: current, error } = await db
    .from('staff_profiles')
    .select('id,business_id,name,role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current) {
    const created = await db.from('staff_profiles').insert({
      id: userId,
      business_id: businessId,
      name: displayName,
      role,
    });
    if (created.error) throw new Error(created.error.message);
    return;
  }
  // staff_profiles predates multi-membership and has a global user PK. Never
  // overwrite another tenant's compatibility row; the authoritative employee
  // directory is team_employee_profiles.
  if (current.business_id && current.business_id !== businessId) return;
  const updated = await db.from('staff_profiles').update({
    business_id: businessId,
    name: displayName,
    role,
  }).eq('id', userId);
  if (updated.error) throw new Error(updated.error.message);
}

async function authUserByEmail(normalizedEmail: string) {
  if (!privilegedDataPlaneDb) throw new Error('Staff invitation service is not configured.');
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await privilegedDataPlaneDb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => String(user.email ?? '').trim().toLowerCase() === normalizedEmail);
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
}

employeeRouter.get('/', requirePermission('team.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  try {
    const [memberships, profiles, departments, jobTitles, locations] = await Promise.all([
      db.from('business_memberships').select('user_id,role,status,created_at,updated_at').eq('business_id', businessId).order('created_at'),
      db.from('team_employee_profiles').select('*').eq('business_id', businessId).order('display_name'),
      db.from('team_departments').select('*').eq('business_id', businessId).order('name'),
      db.from('team_job_titles').select('*').eq('business_id', businessId).order('name'),
      db.from('locations').select('id,name,is_active,brand_id').eq('business_id', businessId).order('name'),
    ]);
    const error = memberships.error || profiles.error || departments.error || jobTitles.error || locations.error;
    if (error) return res.status(500).json({ error: error.message });

    const profileByUser = new Map((profiles.data ?? []).map((row: any) => [row.user_id, row]));
    const employees = (memberships.data ?? [])
      .map((membership: any) => {
        const role = normalizeLegacyRole(membership.role);
        if (!role) return null;
        const profile = profileByUser.get(membership.user_id) as any;
        return {
          user_id: membership.user_id,
          role,
          membership_status: String(membership.status ?? 'ACTIVE').toUpperCase(),
          display_name: profile?.display_name ?? 'Team Member',
          work_email: profile?.work_email ?? null,
          phone: profile?.phone ?? null,
          department_id: profile?.department_id ?? null,
          job_title_id: profile?.job_title_id ?? null,
          employment_status: profile?.employment_status ?? (String(membership.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'),
          start_date: profile?.start_date ?? null,
          end_date: profile?.end_date ?? null,
          notes: profile?.notes ?? null,
          created_at: profile?.created_at ?? membership.created_at,
          updated_at: profile?.updated_at ?? membership.updated_at,
        };
      })
      .filter(Boolean);

    return res.json({
      employees,
      departments: departments.data ?? [],
      jobTitles: jobTitles.data ?? [],
      locations: locations.data ?? [],
      canonicalRoles: Object.values(WorkspaceRole),
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

employeeRouter.post('/invite', requirePermission('team.manage'), async (req, res) => {
  const context = tenantContextOf(req);
  const { db, businessId, userId, role: actorRole, dataPlane } = context;
  if (dataPlane === 'demo') return res.status(409).json({ error: 'Staff invitations are disabled in demo workspaces.' });

  const displayName = text(req.body?.display_name, 160);
  const workEmail = email(req.body?.work_email);
  const roleResult = assertRoleAssignment(actorRole, req.body?.role);
  const departmentId = req.body?.department_id ? uuid(req.body.department_id) : null;
  const jobTitleId = req.body?.job_title_id ? uuid(req.body.job_title_id) : null;
  const startDate = dateOnly(req.body?.start_date);
  if (!displayName || !workEmail || roleResult.error || !roleResult.role) {
    return res.status(400).json({ error: roleResult.error || 'Name, valid email, and canonical role are required.' });
  }
  if ((req.body?.department_id && !departmentId) || (req.body?.job_title_id && !jobTitleId) || (req.body?.start_date && !startDate)) {
    return res.status(400).json({ error: 'Department, job title, or start date is invalid.' });
  }

  try {
    if (departmentId) {
      const { data, error } = await db.from('team_departments').select('id').eq('business_id', businessId).eq('id', departmentId).eq('is_active', true).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return res.status(400).json({ error: 'Selected department does not belong to this organization.' });
    }
    if (jobTitleId) {
      const { data, error } = await db.from('team_job_titles').select('id').eq('business_id', businessId).eq('id', jobTitleId).eq('is_active', true).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return res.status(400).json({ error: 'Selected job title does not belong to this organization.' });
    }

    let authUser = await authUserByEmail(workEmail);
    let invitationSent = false;
    if (!authUser) {
      if (!privilegedDataPlaneDb) return res.status(503).json({ error: 'Staff invitation service is not configured.' });
      const invited = await privilegedDataPlaneDb.auth.admin.inviteUserByEmail(workEmail, {
        data: { name: displayName },
      });
      if (invited.error || !invited.data.user) {
        return res.status(502).json({ error: invited.error?.message || 'Could not create the staff invitation.' });
      }
      authUser = invited.data.user;
      invitationSent = true;
    }

    const { data: existingMembership, error: membershipLookupError } = await db
      .from('business_memberships')
      .select('user_id,role,status')
      .eq('business_id', businessId)
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (membershipLookupError) throw new Error(membershipLookupError.message);
    if (existingMembership) return res.status(409).json({ error: 'That account is already a member of this organization.' });

    const membership = await db.from('business_memberships').insert({
      business_id: businessId,
      user_id: authUser.id,
      role: roleResult.role,
      status: 'ACTIVE',
    });
    if (membership.error) throw new Error(membership.error.message);

    const profilePayload = {
      business_id: businessId,
      user_id: authUser.id,
      display_name: displayName,
      work_email: workEmail,
      department_id: departmentId,
      job_title_id: jobTitleId,
      employment_status: invitationSent ? 'INVITED' : 'ACTIVE',
      start_date: startDate,
      created_by: userId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { data: profile, error: profileError } = await db
      .from('team_employee_profiles')
      .insert(profilePayload)
      .select('*')
      .single();
    if (profileError) {
      await db.from('business_memberships').delete().eq('business_id', businessId).eq('user_id', authUser.id);
      throw new Error(profileError.message);
    }

    await compatibleStaffProfile(db, businessId, authUser.id, displayName, roleResult.role);
    await audit(db, userId, authUser.id, 'EMPLOYEE_INVITED', null, {
      ...profile,
      role: roleResult.role,
      invitation_sent: invitationSent,
    }, 'Employee membership and tenant-scoped profile created through the Team API.');

    return res.status(201).json({
      employee: { ...profile, role: roleResult.role, membership_status: 'ACTIVE' },
      invitationSent,
      reusedExistingAccount: !invitationSent,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

employeeRouter.patch('/:userId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId: actorUserId, role: actorRole } = tenantContextOf(req);
  const targetUserId = uuid(req.params.userId);
  if (!targetUserId) return res.status(400).json({ error: 'A valid employee id is required.' });

  try {
    const [membershipResult, profileResult] = await Promise.all([
      db.from('business_memberships').select('user_id,role,status').eq('business_id', businessId).eq('user_id', targetUserId).maybeSingle(),
      db.from('team_employee_profiles').select('*').eq('business_id', businessId).eq('user_id', targetUserId).maybeSingle(),
    ]);
    const error = membershipResult.error || profileResult.error;
    if (error) throw new Error(error.message);
    if (!membershipResult.data) return res.status(404).json({ error: 'Employee is not a member of this organization.' });

    const currentRole = normalizeLegacyRole(membershipResult.data.role);
    if (!currentRole) return res.status(409).json({ error: 'Employee has an invalid legacy role and requires administrator repair.' });

    const requestedRole = req.body?.role === undefined ? currentRole : assertRoleAssignment(actorRole, req.body.role).role;
    if (!requestedRole) return res.status(403).json({ error: 'You are not allowed to assign that role.' });
    if (targetUserId === actorUserId && requestedRole !== currentRole) {
      return res.status(409).json({ error: 'You cannot change your own workspace role.' });
    }
    if (currentRole === WorkspaceRole.OWNER && requestedRole !== WorkspaceRole.OWNER && await activeOwnerCount(db, businessId) <= 1) {
      return res.status(409).json({ error: 'The last active Owner cannot be demoted.' });
    }

    const displayName = req.body?.display_name === undefined
      ? (profileResult.data?.display_name ?? 'Team Member')
      : text(req.body.display_name, 160);
    const workEmail = req.body?.work_email === undefined ? profileResult.data?.work_email ?? null : email(req.body.work_email);
    const phone = req.body?.phone === undefined ? profileResult.data?.phone ?? null : optionalText(req.body.phone, 80);
    const departmentId = req.body?.department_id === undefined ? profileResult.data?.department_id ?? null : (req.body.department_id ? uuid(req.body.department_id) : null);
    const jobTitleId = req.body?.job_title_id === undefined ? profileResult.data?.job_title_id ?? null : (req.body.job_title_id ? uuid(req.body.job_title_id) : null);
    const startDate = req.body?.start_date === undefined ? profileResult.data?.start_date ?? null : dateOnly(req.body.start_date);
    const endDate = req.body?.end_date === undefined ? profileResult.data?.end_date ?? null : dateOnly(req.body.end_date);
    const notes = req.body?.notes === undefined ? profileResult.data?.notes ?? null : optionalText(req.body.notes, 4000);
    if (!displayName || (req.body?.work_email && !workEmail) || (req.body?.department_id && !departmentId) || (req.body?.job_title_id && !jobTitleId)) {
      return res.status(400).json({ error: 'Employee profile contains an invalid name, email, department, or job title.' });
    }
    if (startDate && endDate && endDate < startDate) return res.status(400).json({ error: 'Employment end date cannot precede start date.' });

    const employmentStatusRaw = req.body?.employment_status === undefined
      ? profileResult.data?.employment_status ?? 'ACTIVE'
      : text(req.body.employment_status, 40).toUpperCase();
    if (!EMPLOYMENT_STATUSES.has(employmentStatusRaw)) return res.status(400).json({ error: 'Invalid employment status.' });
    const membershipStatus = ['ACTIVE', 'LEAVE', 'INVITED'].includes(employmentStatusRaw) ? 'ACTIVE' : 'INACTIVE';
    if (targetUserId === actorUserId && membershipStatus !== 'ACTIVE') {
      return res.status(409).json({ error: 'You cannot suspend, terminate, or archive your own membership.' });
    }
    if (currentRole === WorkspaceRole.OWNER && membershipStatus !== 'ACTIVE' && await activeOwnerCount(db, businessId) <= 1) {
      return res.status(409).json({ error: 'The last active Owner cannot be deactivated.' });
    }

    const before = { membership: membershipResult.data, profile: profileResult.data };
    const membershipUpdate = await db.from('business_memberships').update({
      role: requestedRole,
      status: membershipStatus,
      updated_at: new Date().toISOString(),
    }).eq('business_id', businessId).eq('user_id', targetUserId);
    if (membershipUpdate.error) throw new Error(membershipUpdate.error.message);

    const { data: updatedProfile, error: profileError } = await db.from('team_employee_profiles').upsert({
      business_id: businessId,
      user_id: targetUserId,
      display_name: displayName,
      work_email: workEmail,
      phone,
      department_id: departmentId,
      job_title_id: jobTitleId,
      employment_status: employmentStatusRaw,
      start_date: startDate,
      end_date: endDate,
      notes,
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,user_id' }).select('*').single();
    if (profileError) throw new Error(profileError.message);

    await compatibleStaffProfile(db, businessId, targetUserId, displayName, requestedRole);
    const after = { membership: { ...membershipResult.data, role: requestedRole, status: membershipStatus }, profile: updatedProfile };
    await audit(db, actorUserId, targetUserId, 'EMPLOYEE_UPDATED', before, after, 'Employee profile, lifecycle, or canonical workspace role updated.');
    return res.json({ employee: { ...updatedProfile, role: requestedRole, membership_status: membershipStatus } });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

employeeRouter.post('/departments', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const name = text(req.body?.name, 120);
  const code = optionalText(req.body?.code, 40);
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const { data, error } = await db.from('team_departments').insert({ business_id: businessId, name, code, created_by: userId }).select('*').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'A department with that name already exists.' : error.message });
  await audit(db, userId, data.id, 'DEPARTMENT_CREATED', null, data, 'Team department created.');
  return res.status(201).json({ department: data });
});

employeeRouter.patch('/departments/:departmentId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const departmentId = uuid(req.params.departmentId);
  if (!departmentId) return res.status(400).json({ error: 'A valid department id is required.' });
  const { data: before, error: lookupError } = await db.from('team_departments').select('*').eq('business_id', businessId).eq('id', departmentId).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!before) return res.status(404).json({ error: 'Department not found.' });
  const name = req.body?.name === undefined ? before.name : text(req.body.name, 120);
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const { data, error } = await db.from('team_departments').update({
    name,
    code: req.body?.code === undefined ? before.code : optionalText(req.body.code, 40),
    is_active: req.body?.is_active === undefined ? before.is_active : req.body.is_active === true,
    updated_at: new Date().toISOString(),
  }).eq('business_id', businessId).eq('id', departmentId).select('*').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'A department with that name already exists.' : error.message });
  await audit(db, userId, departmentId, 'DEPARTMENT_UPDATED', before, data, 'Team department updated.');
  return res.json({ department: data });
});

employeeRouter.post('/job-titles', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const name = text(req.body?.name, 120);
  const departmentId = req.body?.department_id ? uuid(req.body.department_id) : null;
  if (!name || (req.body?.department_id && !departmentId)) return res.status(400).json({ error: 'A valid job title name and department are required.' });
  if (departmentId) {
    const { data, error } = await db.from('team_departments').select('id').eq('business_id', businessId).eq('id', departmentId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(400).json({ error: 'Selected department does not belong to this organization.' });
  }
  const { data, error } = await db.from('team_job_titles').insert({ business_id: businessId, department_id: departmentId, name, created_by: userId }).select('*').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'A job title with that name already exists.' : error.message });
  await audit(db, userId, data.id, 'JOB_TITLE_CREATED', null, data, 'Team job title created.');
  return res.status(201).json({ jobTitle: data });
});

employeeRouter.patch('/job-titles/:jobTitleId', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const jobTitleId = uuid(req.params.jobTitleId);
  if (!jobTitleId) return res.status(400).json({ error: 'A valid job title id is required.' });
  const { data: before, error: lookupError } = await db.from('team_job_titles').select('*').eq('business_id', businessId).eq('id', jobTitleId).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!before) return res.status(404).json({ error: 'Job title not found.' });
  const name = req.body?.name === undefined ? before.name : text(req.body.name, 120);
  const departmentId = req.body?.department_id === undefined ? before.department_id : (req.body.department_id ? uuid(req.body.department_id) : null);
  if (!name || (req.body?.department_id && !departmentId)) return res.status(400).json({ error: 'A valid job title name and department are required.' });
  if (departmentId) {
    const { data, error } = await db.from('team_departments').select('id').eq('business_id', businessId).eq('id', departmentId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(400).json({ error: 'Selected department does not belong to this organization.' });
  }
  const { data, error } = await db.from('team_job_titles').update({
    name,
    department_id: departmentId,
    is_active: req.body?.is_active === undefined ? before.is_active : req.body.is_active === true,
    updated_at: new Date().toISOString(),
  }).eq('business_id', businessId).eq('id', jobTitleId).select('*').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'A job title with that name already exists.' : error.message });
  await audit(db, userId, jobTitleId, 'JOB_TITLE_UPDATED', before, data, 'Team job title updated.');
  return res.json({ jobTitle: data });
});
