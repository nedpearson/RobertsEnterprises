import { Router } from 'express';
import { requireBusinessContext } from '../../index';
import { checkAvailability } from './availability';
import { scoreAssignments } from './scoring';
import { ConcurrencyEngine } from './concurrency';

import { publicSchedulingRouter } from './public';

export const schedulingRouter = Router();

// Mount public sub-routes (e.g. /api/scheduling/public/book)
schedulingRouter.use('/public', publicSchedulingRouter);

// Endpoint for the public form to check availability windows
schedulingRouter.post('/availability', async (req, res) => {
  try {
    const context = (req as any).context;
    // For public endpoints, businessId might come from body, but context logic validates it
    const businessId = req.body.businessId || context.businessId; 
    
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }

    const availableShifts = await checkAvailability(context.db, {
      businessId,
      locationId: req.body.locationId,
      serviceId: req.body.serviceId,
      preferredDate: req.body.preferredDate
    });

    res.json({ availableShifts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for internal assignment center to get recommendations
schedulingRouter.post('/recommendations', requireBusinessContext, async (req, res) => {
  try {
    const context = (req as any).context;
    
    // 1. Get raw availability
    const availableShifts = await checkAvailability(context.db, {
      businessId: context.businessId,
      locationId: req.body.locationId,
      serviceId: req.body.serviceId,
      preferredDate: req.body.preferredDate
    });

    // 2. Score them
    const recommendations = await scoreAssignments(context.db, {
      businessId: context.businessId,
      requestId: req.body.requestId,
      availableShifts
    });

    res.json({ recommendations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to confirm and assign
schedulingRouter.post('/assign', requireBusinessContext, async (req, res) => {
  try {
    const context = (req as any).context;
    const appointment = await ConcurrencyEngine.safeAssignAppointment(context.db, {
      businessId: context.businessId,
      requestId: req.body.requestId,
      employeeId: req.body.employeeId,
      locationId: req.body.locationId,
      roomId: req.body.roomId,
      startAt: req.body.startAt,
      endAt: req.body.endAt
    });

    res.json({ success: true, appointment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
