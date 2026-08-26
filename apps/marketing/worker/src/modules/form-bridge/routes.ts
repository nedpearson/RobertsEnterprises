import { Router, Request, Response, NextFunction } from 'express';

export const formBridgeRouter = Router();

const requireFormSecret = (req: Request, res: Response, next: NextFunction) => {
  console.log('[form-bridge] Incoming request query:', req.query);
  console.log('[form-bridge] Incoming headers:', req.headers);
  console.log('[form-bridge] Incoming request body keys:', Object.keys(req.body || {}));
  console.log('[form-bridge] Raw body:', (req as any).rawBody ? (req as any).rawBody.toString('utf8') : 'NO RAW BODY');
  
  const secret = req.headers['x-vowos-form-secret'] || req.query.secret || req.params.secret;
  if (!secret || (secret !== process.env.PUBLIC_FORM_BRIDGE_SECRET && secret !== process.env.FORM_BRIDGE_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing x-vowos-form-secret' });
  }
  next();
};

formBridgeRouter.get('/status', (req: Request, res: Response) => {
  return res.json({ ready: true });
});

formBridgeRouter.post(['/submit', '/submit/:secret/:domain'], requireFormSecret, async (req: Request, res: Response) => {
  // Use rawBody if json parsing failed, or try to parse form-data manually if needed.
  let parsedBody = req.body;
  if (Object.keys(parsedBody).length === 0 && (req as any).rawBody) {
    try {
      const rawString = (req as any).rawBody.toString('utf8');
      parsedBody = JSON.parse(rawString);
    } catch (e) {
      // If it's URL encoded, we might need to parse it manually if express didn't catch it
      const qs = require('querystring');
      parsedBody = qs.parse((req as any).rawBody.toString('utf8'));
    }
  }

  const { provider, externalSubmissionId, siteDomain: bodyDomain, locationHint, ...fields } = parsedBody;
  const siteDomain = bodyDomain || req.query.domain || req.params.domain;
  const db = (req as any).context?.db;

  try {
    if (!siteDomain) return res.status(400).json({ error: 'Missing site domain' });

    // 1. Resolve site -> business
    const { data: site, error: siteErr } = await db
      .from('business_sites')
      .select('business_id, id, notification_email, name, brand_id')
      .ilike('domain', '%' + siteDomain + '%')
      .maybeSingle();
      
    if (siteErr) throw siteErr;
    if (!site) return res.status(404).json({ error: 'Site domain not recognized' });
    
    // Parent holding company explicitly requested by user for centralized view
    const businessId = '82a5b426-78a2-47ba-896b-3146b1a99c53';

    // 2. Resolve locationHint -> locationId (optional)
    let locationId = null;
    let locationName = '';
    
    // Attempt to extract the location from all possible Globo field names
    const rawLocationField = fields['Store Location'] || fields['location'] || fields['Location'] || locationHint || '';
    // Globo might send checkboxes as arrays ["Baton Rouge"] or strings "Baton Rouge"
    const extractedLocation = Array.isArray(rawLocationField) ? rawLocationField[0] : rawLocationField;
    
    if (extractedLocation) {
      const { data: loc } = await db
        .from('locations')
        .select('id, name')
        .eq('business_id', businessId)
        .ilike('name', '%' + extractedLocation + '%')
        .maybeSingle();
      if (loc) {
        locationId = loc.id;
        locationName = loc.name;
      }
    }

    const intakeSource = provider || 'powerful-form';
    const notes = `STORE: ${site.name}\nBRAND ID: ${site.brand_id || 'N/A'}\nLocation: ${extractedLocation || 'Not specified'}\nGlobo ID: ${externalSubmissionId || 'N/A'}\n\nForm Data:\n` + JSON.stringify(fields, null, 2);
    
    // Extract customer details to map to VowOS standard fields
    // Handle Globo's custom form fields
    const rawName = fields['First and Last Name'] || fields['First Name'] || fields.name || 'Unknown';
    const firstName = rawName.split(' ')[0] || 'Unknown';
    const lastName = fields['Last Name'] || rawName.split(' ').slice(1).join(' ') || '';
    const customerName = `${firstName} ${lastName}`.trim();
    
    const customerEmail = fields['Email'] || fields.email || '';
    const customerPhone = fields['Contact Phone'] || fields['Phone'] || fields.phone || '';
    const weddingDate = fields['Wedding Date'] || fields.weddingDate || null;
    
    // Extract Budget
    const rawBudget = fields['Wedding Dress Budget'] || fields['Budget'] || fields.budget || '0';
    let budget = parseInt(String(rawBudget).replace(/[^0-9]/g, ''), 10);
    if (isNaN(budget)) budget = 0;

    // 3. Upsert Customer so the UI can link identity properly
    let customerId = null;
    if (customerEmail || customerPhone) {
      // Find existing customer by email
      const { data: existingCust } = await db
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', customerEmail)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        // Create new customer
        const { data: newCust, error: newCustErr } = await db
          .from('customers')
          .insert({
            business_id: businessId,
            location_id: locationId,
            name: customerName,
            first_name: firstName,
            last_name: lastName,
            email: customerEmail,
            phone: customerPhone,
            wedding_date: weddingDate,
            status: 'Active'
          })
          .select('id')
          .single();

        if (newCustErr) {
          console.error('[form-bridge] Customer upsert warning:', newCustErr);
        } else {
          customerId = newCust.id;
        }
      }
    }

    // 4. Insert into appointment_requests
    const { data: request, error: reqErr } = await db
      .from('appointment_requests')
      .insert({
        business_id: businessId,
        customer_id: customerId, // Critical for UI identity rendering
        preferred_location_id: locationId,
        intake_source: intakeSource,
        notes: notes,
        status: 'submitted',
        event_date: weddingDate,
        budget_cents: budget * 100,
        source_site_id: site.id,
        brand_id: site.brand_id
      })
      .select('id')
      .single();

    if (reqErr) throw reqErr;
    const requestId = request.id;

    // 5. Send Email Notification
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
          subject: `New Appointment Request - ${site.name}`,
          body: summary,
        }
      }));
      await db.from('appointment_intake_notification_outbox').insert(emailRows);
    }

    return res.json({ success: true, id: request.id });
  } catch (err: any) {
    console.error('[form-bridge] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});
