import { Router } from 'express';
import { requireBusinessContext } from '../../index';
import { rejectTenantSpoofing, requirePermission } from '../../lib/auth/middleware';
import { checkAvailability } from './availability';
import { scoreAssignments } from './scoring';
import { ConcurrencyEngine } from './concurrency';
import { publicSchedulingRouter } from './public';

export const schedulingRouter = Router();

// Bride-facing endpoints live only under /public and resolve tenant identity
// from trusted website/store mappings rather than a caller-provided business id.
schedulingRouter.use('/public', publicSchedulingRouter);

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
