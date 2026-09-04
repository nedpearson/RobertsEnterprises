import { Router } from 'express';
import { requireBusinessContext } from '../../index';
import { rejectTenantSpoofing, requirePermission } from '../../lib/auth/middleware';
import { checkAvailability } from './availability';
import { scoreAssignments } from './scoring';
import { ConcurrencyEngine } from './concurrency';
import { publicSchedulingRouter } from './public';
import { LOCATION_ALIASES, requestBusinessScope, requestLocationScope } from './requestScope';

export const schedulingRouter = Router();

const ARCHIVED_REQUEST_STATUSES = ['archived', 'sold_archived', 'unsold_archived'] as const;
const REQUEST_ROW_LIMIT = 1000;
const REQUEST_ID_BATCH_SIZE = 100;

type RequestArchiveScope = 'all' | 'active' | 'archived';
type RequestBulkAction = 'archive' | 'sold_archive' | 'unsold_archive' | 'restore' | 'delete';
type RequestStatusFilter =
  | 'all'
  | 'new'
  | 'review'
  | 'ai_ready'
  | 'pending'
  | 'waitlist'
  | 'sold'
  | 'unsold'
  | 'unclassified';

const BULK_STATUS: Record<Exclude<RequestBulkAction, 'delete'>, string> = {
  archive: 'archived',
  sold_archive: 'sold_archived',
  unsold_archive: 'unsold_archived',
  restore: 'submitted',
};

function requestArchiveScope(value: unknown): RequestArchiveScope | null {
  if (value === undefined) return 'active';
  return value === 'all' || value === 'active' || value === 'archived' ? value : null;
}

function requestStatusFilter(value: unknown): RequestStatusFilter | null {
  const allowed: RequestStatusFilter[] = [
    'all', 'new', 'review', 'ai_ready', 'pending', 'waitlist', 'sold', 'unsold', 'unclassified',
  ];
  if (value === undefined) return 'all';
  return allowed.includes(value as RequestStatusFilter) ? value as RequestStatusFilter : null;
}

function stringList(value: unknown, maximum = REQUEST_ROW_LIMIT): string[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const values = [...new Set(raw.map((entry) => String(entry).trim()).filter(Boolean))];
  return values.length <= maximum ? values : null;
}

function applyRequestLocationScope(query: any, locationIds: string[]) {
  const scopedIds = requestLocationScope(locationIds);
  if (scopedIds.length === 1) return query.eq('preferred_location_id', scopedIds[0]);
  if (scopedIds.length > 1) return query.in('preferred_location_id', scopedIds);
  return query;
}

function applyRequestArchiveScope(query: any, scope: RequestArchiveScope) {
  if (scope === 'archived') return query.in('status', [...ARCHIVED_REQUEST_STATUSES]);
  if (scope === 'active') {
    return query.or(`status.is.null,status.not.in.(${ARCHIVED_REQUEST_STATUSES.join(',')})`);
  }
  return query;
}

function applyRequestStatusFilter(query: any, filter: RequestStatusFilter) {
  switch (filter) {
    case 'new':
      return query.or('status.is.null,status.in.(new,submitted,open,received)');
    case 'review':
      return query.in('status', ['review', 'staffing_review']);
    case 'ai_ready':
      return query.in('status', ['ai_ready', 'recommended']);
    case 'pending':
      return query.in('status', ['tentative_hold', 'confirmation_pending', 'pending', 'hold']);
    case 'waitlist':
      return query.eq('status', 'waitlist');
    case 'sold':
      return query.eq('status', 'sold_archived');
    case 'unsold':
      return query.eq('status', 'unsold_archived');
    case 'unclassified':
      return query.eq('status', 'archived');
    default:
      return query;
  }
}

async function locationsBelongToBusiness(db: any, businessId: string, locationIds: string[]): Promise<boolean> {
  if (locationIds.length === 0) return true;
  const businessIds = requestBusinessScope(businessId);
  const scopedLocationIds = requestLocationScope(locationIds);
  const { data, error } = await db
    .from('locations')
    .select('id')
    .in('business_id', businessIds)
    .in('id', scopedLocationIds);
  if (error) throw error;
  const found = new Set((data || []).map((location: { id: string }) => location.id));
  return locationIds.every((id) => found.has(id) || (LOCATION_ALIASES[id] || []).some((alias) => found.has(alias)));
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

// Bride-facing endpoints live only under /public and resolve tenant identity
// from trusted website/store mappings rather than a caller-provided business id.
schedulingRouter.use('/public', publicSchedulingRouter);

/**
 * Booking-request queue reads use the verified tenant context and a
 * request-scoped service client. This prevents browser RLS drift from turning
 * real tenant data into a misleading empty queue while keeping cross-tenant
 * access fail-closed.
 */
schedulingRouter.get(
  '/requests',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const businessIds = requestBusinessScope(context.businessId);
      const scope = requestArchiveScope(req.query.archiveScope);
      const locationIds = stringList(req.query.locationIds, 100);
      if (!scope || !locationIds) return res.status(400).json({ error: 'Invalid booking-request filters.' });
      if (!(await locationsBelongToBusiness(context.db, context.businessId, locationIds))) {
        return res.status(403).json({ error: 'One or more requested locations are outside the active business.' });
      }

      let query = context.db
        .from('appointment_requests')
        .select('*')
        .in('business_id', businessIds);
      query = applyRequestLocationScope(query, locationIds);
      query = applyRequestArchiveScope(query, scope);

      const { data: requests, error } = await query
        .order('submitted_at', { ascending: false })
        .limit(REQUEST_ROW_LIMIT);
      if (error) throw error;

      // Resolve customers separately with the same tenant predicate so a bad
      // foreign key can never hydrate another tenant's customer into a card.
      const customerIds = [...new Set((requests || []).map((request: any) => request.customer_id).filter(Boolean))];
      const customers: any[] = [];
      for (const ids of chunk(customerIds, REQUEST_ID_BATCH_SIZE)) {
        const { data, error: customerError } = await context.db
          .from('customers')
          .select('*')
          .in('business_id', businessIds)
          .in('id', ids);
        if (customerError) throw customerError;
        customers.push(...(data || []));
      }
      const customersById = new Map(customers.map((customer) => [customer.id, customer]));

      return res.json({
        requests: (requests || []).map((request: any) => ({
          ...request,
          customer: request.customer_id ? customersById.get(request.customer_id) || null : null,
        })),
        limit: REQUEST_ROW_LIMIT,
      });
    } catch (err: any) {
      console.error('[scheduling.requests] queue load failed:', err?.message || err);
      return res.status(500).json({ error: 'Could not load booking requests.' });
    }
  },
);

schedulingRouter.get(
  '/requests-summary',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const businessIds = requestBusinessScope(context.businessId);
      const locationIds = stringList(req.query.locationIds, 100);
      if (!locationIds) return res.status(400).json({ error: 'Invalid booking-request filters.' });
      if (!(await locationsBelongToBusiness(context.db, context.businessId, locationIds))) {
        return res.status(403).json({ error: 'One or more requested locations are outside the active business.' });
      }

      const count = async (scope: RequestArchiveScope, statuses?: readonly string[], includeNull = false) => {
        let query = context.db
          .from('appointment_requests')
          .select('id', { count: 'exact', head: true })
          .in('business_id', businessIds);
        query = applyRequestLocationScope(query, locationIds);
        query = applyRequestArchiveScope(query, scope);
        if (statuses?.length) {
          query = includeNull
            ? query.or(`status.is.null,status.in.(${statuses.join(',')})`)
            : query.in('status', [...statuses]);
        }
        const { count: exactCount, error } = await query;
        if (error) throw error;
        return exactCount ?? 0;
      };

      const [active, archived, newlySubmitted, review, aiReady, confirmationPending, waitlist, soldArchived, unsoldArchived, unclassifiedArchived, pendingReview] = await Promise.all([
        count('active'),
        count('archived'),
        count('all', ['new', 'submitted', 'open', 'received'], true),
        count('all', ['review', 'staffing_review']),
        count('all', ['ai_ready', 'recommended']),
        count('all', ['tentative_hold', 'confirmation_pending', 'pending', 'hold']),
        count('all', ['waitlist']),
        count('all', ['sold_archived']),
        count('all', ['unsold_archived']),
        count('all', ['archived']),
        count('all', ['new', 'submitted', 'review']),
      ]);

      return res.json({
        active,
        archived,
        new: newlySubmitted,
        review,
        aiReady,
        confirmationPending,
        waitlist,
        soldArchived,
        unsoldArchived,
        unclassifiedArchived,
        pendingReview,
      });
    } catch (err: any) {
      console.error('[scheduling.requests-summary] count failed:', err?.message || err);
      return res.status(500).json({ error: 'Could not count booking requests.' });
    }
  },
);

schedulingRouter.post(
  '/requests/bulk',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const businessIds = requestBusinessScope(context.businessId);
      const action = req.body?.action as RequestBulkAction;
      const allowedActions: RequestBulkAction[] = ['archive', 'sold_archive', 'unsold_archive', 'restore', 'delete'];
      if (!allowedActions.includes(action)) return res.status(400).json({ error: 'Invalid bulk action.' });

      const requestIds = stringList(req.body?.requestIds);
      const locationIds = stringList(req.body?.locationIds, 100);
      const selectAllMatching = req.body?.selectAllMatching === true;
      const statusFilter = requestStatusFilter(req.body?.statusFilter);
      const submittedBefore = typeof req.body?.submittedBefore === 'string' ? req.body.submittedBefore : '';
      const hasValidCutoff = submittedBefore !== '' && Number.isFinite(Date.parse(submittedBefore));
      const isDateBased = requestIds?.length === 0 && !selectAllMatching && hasValidCutoff;
      const selectionModeCount = Number(Boolean(requestIds?.length)) + Number(selectAllMatching) + Number(isDateBased);
      if (!requestIds || !locationIds || !statusFilter || selectionModeCount !== 1) {
        return res.status(400).json({ error: 'Choose exactly one valid bulk selection mode.' });
      }
      if ((isDateBased || selectAllMatching) && action === 'delete') {
        return res.status(400).json({ error: 'Permanent deletion requires individually selected archived requests.' });
      }
      if (isDateBased && action === 'restore') {
        return res.status(400).json({ error: 'Date-based cleanup only supports archive actions.' });
      }
      if (!(await locationsBelongToBusiness(context.db, context.businessId, locationIds))) {
        return res.status(403).json({ error: 'One or more requested locations are outside the active business.' });
      }

      const execute = async (ids?: string[]) => {
        let query = action === 'delete'
          ? context.db.from('appointment_requests').delete({ count: 'exact' })
          : context.db.from('appointment_requests').update({ status: BULK_STATUS[action] }, { count: 'exact' });
        query = query.in('business_id', businessIds);
        query = applyRequestLocationScope(query, locationIds);
        if (ids?.length) query = query.in('id', ids);
        if (isDateBased) query = query.lte('submitted_at', submittedBefore);
        query = applyRequestArchiveScope(query, action === 'restore' || action === 'delete' ? 'archived' : 'active');
        if (selectAllMatching) query = applyRequestStatusFilter(query, statusFilter);
        const { data, error, count } = await query.select('id');
        if (error) throw error;
        return count ?? data?.length ?? 0;
      };

      let affected = 0;
      if (isDateBased || selectAllMatching) affected = await execute();
      else for (const ids of chunk(requestIds, REQUEST_ID_BATCH_SIZE)) affected += await execute(ids);
      return res.json({ affected });
    } catch (err: any) {
      console.error('[scheduling.requests.bulk] update failed:', err?.message || err);
      return res.status(500).json({ error: 'Could not update booking requests.' });
    }
  },
);

// Internal availability. The active organization is always derived from the
// verified membership context; body/query tenant ids cannot widen the scope.
schedulingRouter.post(
  '/availability',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.read'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const availableShifts = await checkAvailability(context.db, {
        businessId: context.businessId,
        locationId: req.body.locationId,
        serviceId: req.body.serviceId,
        preferredDate: req.body.preferredDate,
      });
      return res.json({ availableShifts });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
);

schedulingRouter.post(
  '/recommendations',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const availableShifts = await checkAvailability(context.db, {
        businessId: context.businessId,
        locationId: req.body.locationId,
        serviceId: req.body.serviceId,
        preferredDate: req.body.preferredDate,
      });

      const recommendations = await scoreAssignments(context.db, {
        businessId: context.businessId,
        requestId: req.body.requestId,
        availableShifts,
      });
      return res.json({ recommendations });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
);

schedulingRouter.post(
  '/assign',
  requireBusinessContext,
  rejectTenantSpoofing,
  requirePermission('appointments.manage'),
  async (req, res) => {
    try {
      const context = (req as any).context;
      const appointment = await ConcurrencyEngine.safeAssignAppointment(context.db, {
        businessId: context.businessId,
        requestId: req.body.requestId,
        employeeId: req.body.employeeId,
        locationId: req.body.locationId,
        roomId: req.body.roomId,
        startAt: req.body.startAt,
        endAt: req.body.endAt,
      });
      return res.json({ success: true, appointment });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
);
