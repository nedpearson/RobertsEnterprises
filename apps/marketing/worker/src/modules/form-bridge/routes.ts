import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export const formBridgeRouter = Router();

// Rate limiter: 30 requests per minute per IP to prevent spam/abuse
const formBridgeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

formBridgeRouter.use(formBridgeRateLimiter);

formBridgeRouter.get('/status', (_req: Request, res: Response) => {
  return res.json({ ready: true });
});

// Serve clean, un-secret-embedded client injection script
formBridgeRouter.get('/bridge.js', (_req: Request, res: Response) => {
  const apiBase = 'https://api.robertsenterprises.bridgebox.ai/api/form-bridge/submit';

  const script = `
(function() {
  'use strict';
  var endpoint = '${apiBase}';
  var alreadyAttached = false;

  function attachListener() {
    if (alreadyAttached) return;
    var formApp = document.querySelector('.globo-form-app');
    if (!formApp) return;
    var btn = formApp.querySelector('button.submit') ||
              formApp.querySelector('button[type="submit"]') ||
              formApp.querySelector('.globo-form-submit button');
    if (!btn) return;
    alreadyAttached = true;

    btn.addEventListener('click', function() {
      try {
        var payload = { siteDomain: window.location.hostname };
        var controls = formApp.querySelectorAll('.globo-form-control');
        for (var i = 0; i < controls.length; i++) {
          var ctrl = controls[i];
          var label = ctrl.querySelector('label');
          var input = ctrl.querySelector('input, select, textarea');
          if (label && input) {
            var key = label.innerText.replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').replace(/\\*/g, '').trim();
            if (key && input.value) {
              payload[key] = input.value;
            }
          }
          var checked = ctrl.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
          if (checked.length > 0 && label) {
            var gKey = label.innerText.replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').replace(/\\*/g, '').trim();
            var vals = [];
            for (var k = 0; k < checked.length; k++) {
              var cbLabel = checked[k].parentElement && checked[k].parentElement.querySelector('span, label');
              vals.push(cbLabel ? cbLabel.innerText.trim() : checked[k].value);
            }
            if (vals.length > 0) payload[gKey] = vals.join(', ');
          }
        }
        if (Object.keys(payload).length > 1) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify(payload));
        }
      } catch(e) {}
    }, true);
  }

  var attempts = 0;
  var poller = setInterval(function() {
    attachListener();
    attempts++;
    if (alreadyAttached || attempts > 50) clearInterval(poller);
  }, 200);
})();
`;

  res.set('Content-Type', 'application/javascript');
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.send(script);
});

function normalizeDomain(domainInput?: string): string {
  if (!domainInput) return '';
  return domainInput.replace(/^https?:\/\//i, '').split('/')[0].trim().toLowerCase();
}

formBridgeRouter.post('/submit', async (req: Request, res: Response) => {
  let parsedBody = req.body || {};
  
  if (Object.keys(parsedBody).length === 0) {
    let rawBodyStr = '';
    if ((req as any).rawBody) {
      rawBodyStr = (req as any).rawBody.toString('utf8');
    }
    
    if (rawBodyStr) {
      try {
        parsedBody = JSON.parse(rawBodyStr);
      } catch {
        const qs = require('querystring');
        parsedBody = qs.parse(rawBodyStr);
      }
    }
  }

  const { provider, externalSubmissionId, siteDomain: bodyDomain, locationHint, ...fields } = parsedBody;
  const rawDomain = bodyDomain || req.headers.origin || req.headers.referer || '';
  const siteDomain = normalizeDomain(String(rawDomain));
  const db = (req as any).context?.db;

  try {
    if (!siteDomain) {
      return res.status(400).json({ error: 'Missing site domain for form intake routing.' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database context unavailable.' });
    }

    // 1. Exact domain matching against business_sites table (No wildcard % substring matching)
    const { data: site, error: siteErr } = await db
      .from('business_sites')
      .select('business_id, id, notification_email, name, brand_id, domain')
      .eq('domain', siteDomain)
      .maybeSingle();

    if (siteErr) throw siteErr;
    
    let resolvedSite = site;
    if (!resolvedSite) {
      // Allow fallback if site domain contains matching hostname without substring attack
      const { data: fallbackSites } = await db
        .from('business_sites')
        .select('business_id, id, notification_email, name, brand_id, domain')
        .limit(20);
      
      resolvedSite = (fallbackSites || []).find((s: any) => normalizeDomain(s.domain) === siteDomain);
    }

    if (!resolvedSite) {
      return res.status(404).json({ error: `Site domain "${siteDomain}" is not recognized for tenant intake.` });
    }
    
    const businessId = resolvedSite.business_id;

    // Normalize field keys
    const normalizedFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      const cleanKey = k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
      normalizedFields[cleanKey] = v;
      normalizedFields[k] = v;
    }

    // 2. Resolve location
    let locationId = null;
    let locationName = '';
    const rawLocationField = normalizedFields['Store Location'] || normalizedFields['location'] || normalizedFields['Location'] || locationHint || '';
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
    const notes = `STORE: ${resolvedSite.name}\nBRAND ID: ${resolvedSite.brand_id || 'N/A'}\nLocation: ${extractedLocation || 'Not specified'}\nGlobo ID: ${externalSubmissionId || 'N/A'}\n\nForm Data:\n` + JSON.stringify(normalizedFields, null, 2);
    
    // Extract customer identity details
    const rawName = normalizedFields['First and Last Name'] || normalizedFields['First + Last Name'] || normalizedFields['First Name'] || normalizedFields.name || '';
    const customerEmail = (normalizedFields['Email'] || normalizedFields.email || '').trim().toLowerCase();
    const customerPhone = (normalizedFields['Contact Phone'] || normalizedFields['Phone'] || normalizedFields.phone || '').trim();
    const weddingDate = normalizedFields['Wedding Date'] || normalizedFields['Occasion Date'] || normalizedFields.weddingDate || null;
    
    // Extract Budget
    const rawBudgetStr = String(normalizedFields['Wedding Dress Budget'] || normalizedFields['Price Point'] || normalizedFields['Budget'] || normalizedFields.budget || '0');
    const budgetMatch = rawBudgetStr.match(/(\d[\d,]*)/);
    let budget = 0;
    if (budgetMatch) {
      budget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    }
    if (isNaN(budget) || budget < 0) budget = 0;
    if (budget > 20000000) budget = 20000000;

    // 3. Customer Identity Resolution — NO FAKE/SYNTHETIC IDENTITY CREATION
    let customerId: string | null = null;
    let isQuarantined = false;

    // Requires minimum identity (valid email or phone)
    if (customerEmail || customerPhone) {
      let query = db.from('customers').select('id').eq('business_id', businessId);
      if (customerEmail) {
        query = query.eq('email', customerEmail);
      } else {
        query = query.eq('phone', customerPhone);
      }

      const { data: existingCust } = await query.maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const firstName = rawName ? rawName.split(' ')[0] : 'Guest';
        const lastName = rawName && rawName.split(' ').length > 1 ? rawName.split(' ').slice(1).join(' ') : '';
        const customerName = `${firstName} ${lastName}`.trim() || 'Guest Customer';

        const { data: newCust, error: newCustErr } = await db
          .from('customers')
          .insert({
            business_id: businessId,
            location_id: locationId,
            name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            wedding_date: weddingDate,
            status: 'Active'
          })
          .select('id')
          .single();

        if (!newCustErr && newCust) {
          customerId = newCust.id;
        }
      }
    } else {
      // Insufficient customer identity -> quarantine intake for review without creating fake customer
      isQuarantined = true;
    }

    // 4. Insert into appointment_requests
    const { data: request, error: reqErr } = await db
      .from('appointment_requests')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        preferred_location_id: locationId,
        intake_source: intakeSource,
        notes: notes,
        status: isQuarantined ? 'quarantined_review' : 'submitted',
        event_date: weddingDate,
        budget_cents: budget * 100,
        source_site_id: resolvedSite.id,
        brand_id: resolvedSite.brand_id
      })
      .select('id')
      .single();

    if (reqErr) throw reqErr;

    return res.json({ 
      success: true, 
      id: request.id, 
      quarantined: isQuarantined 
    });
  } catch (err: any) {
    console.error('[form-bridge] Intake processing error:', err?.message || err);
    return res.status(500).json({ error: 'Form intake processing failed.' });
  }
});
