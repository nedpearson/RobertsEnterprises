import { Router, Request, Response, NextFunction } from 'express';

export const formBridgeRouter = Router();

// Middleware to verify the secret header
const requireFormSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-vowos-form-secret'] || req.query.secret;
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
      .select('business_id, id, notification_email, name')
      .eq('domain', siteDomain)
      .maybeSingle();
      
    if (siteErr) throw siteErr;
    if (!site) return res.status(404).json({ error: 'Site domain not recognized' });
    
    const businessId = site.business_id;

    // 2. Resolve locationHint -> locationId (optional)
    let locationId = null;
    let locationName = '';
    if (locationHint) {
      const { data: loc } = await db
        .from('locations')
        .select('id, name')
        .eq('business_id', businessId)
        .ilike('name', '%' + locationHint + '%')
        .maybeSingle();
      if (loc) {
        locationId = loc.id;
        locationName = loc.name;
      }
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
    
    // Extract customer details from common Globo fields
    const customerName = (fields['First Name'] || fields.name || '') + (fields['Last Name'] ? ' ' + fields['Last Name'] : '');
    const customerEmail = fields['Email'] || fields.email || '';
    const customerPhone = fields['Phone'] || fields.phone || '';
    const weddingDate = fields['Wedding Date'] || fields.weddingDate || null;

    const { data: request, error: reqErr } = await db
      .from('appointment_requests')
      .insert({
        business_id: businessId,
        preferred_location_id: locationId,
        intake_source: intakeSource,
        name: customerName || 'Unknown',
        email: customerEmail,
        phone: customerPhone,
        wedding_date: weddingDate,
        notes: notes,
        status: 'submitted'
      })
      .select('id')
      .single();

    if (reqErr) throw reqErr;
    
    const requestId = request.id;

    // 4. Send Email Notification
    const summary = [
      `New appointment request at ${site.name || 'store'}${locationName ? ` - ${locationName}` : ''}.`,
      `${customerName} (${customerEmail}) submitted a request.`,
      notes,
      `Source: ${intakeSource}. Request id ${requestId}.`,
    ].filter(Boolean).join('\n');

    const legacyEmail = siteDomain.includes('idobridalcouture') ? 'ido@idobridalcouture.com' : (siteDomain.includes('properandcompany') ? 'hello@properandcompany.com' : null);
    
    const recipients = [...new Set([
      'robertsenterprises@bridgebox.ai', 
      site.notification_email, 
      legacyEmail, 
      customerEmail
    ].filter(Boolean))];

    if (recipients.length > 0) {
      const emailRows = recipients.map(recipient => ({
        appointment_request_id: requestId,
        business_id: businessId,
        recipient: recipient,
        payload: {
          subject: 'New Appointment Request',
          body: summary,
        }
      }));
      
      const { error: emailErr } = await db.from('appointment_intake_notification_outbox').insert(emailRows);
      if (emailErr) console.error('[form-bridge] Failed to insert emails:', emailErr);
    }

    return res.json({ success: true, id: request.id });
  } catch (err: any) {
    console.error('[form-bridge] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

