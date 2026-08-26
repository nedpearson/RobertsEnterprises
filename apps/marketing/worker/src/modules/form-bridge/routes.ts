import { Router, Request, Response, NextFunction } from 'express';

export const formBridgeRouter = Router();

// Middleware to verify the secret header
const requireFormSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-vowos-form-secret'];
  if (!secret || secret !== process.env.FORM_BRIDGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing x-vowos-form-secret' });
  }
  next();
};

formBridgeRouter.get('/status', (req: Request, res: Response) => {
  return res.json({ ready: true });
});

formBridgeRouter.get('/sites/resolve', async (req: Request, res: Response) => {
  const domain = req.query.domain as string;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  const db = (req as any).context?.db;
  if (!db) return res.status(500).json({ error: 'Database context missing' });

  try {
    const { data, error } = await db
      .from('business_sites')
      .select('business_id, id')
      .eq('domain', domain)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Site not found for domain' });

    return res.json({ businessId: data.business_id, siteId: data.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

formBridgeRouter.post('/submit', requireFormSecret, async (req: Request, res: Response) => {
  const { provider, externalSubmissionId, siteDomain, locationHint, ...fields } = req.body;
  const db = (req as any).context?.db;

  try {
    // 1. Resolve site -> business
    const { data: site, error: siteErr } = await db
      .from('business_sites')
      .select('business_id, id')
      .eq('domain', siteDomain)
      .maybeSingle();
      
    if (siteErr) throw siteErr;
    if (!site) return res.status(404).json({ error: 'Site domain not recognized' });
    
    const businessId = site.business_id;

    // 2. Resolve locationHint -> locationId (optional)
    let locationId = null;
    if (locationHint) {
      const { data: loc } = await db
        .from('locations')
        .select('id')
        .eq('business_id', businessId)
        .ilike('name', '%' + locationHint + '%')
        .maybeSingle();
      if (loc) locationId = loc.id;
    }

    // 3. Upsert into appointment_requests based on externalSubmissionId in notes to make it idempotent
    const intakeSource = provider || 'powerful-form';
    
    // Check if we already have it (Idempotent)
    const { data: existing } = await db
      .from('appointment_requests')
      .select('id')
      .eq('business_id', businessId)
      .like('notes', '%Globo ID: ' + externalSubmissionId + '%')
      .maybeSingle();
      
    if (existing) {
      return res.json({ success: true, message: 'Already processed', id: existing.id });
    }

    // Insert new request
    const notes = 'Globo ID: ' + externalSubmissionId + '\n\nForm Data:\n' + JSON.stringify(fields, null, 2);
    
    const { data: request, error: reqErr } = await db
      .from('appointment_requests')
      .insert({
        business_id: businessId,
        preferred_location_id: locationId,
        intake_source: intakeSource,
        notes: notes,
        status: 'submitted'
      })
      .select('id')
      .single();

    if (reqErr) throw reqErr;
    
    return res.json({ success: true, id: request.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

