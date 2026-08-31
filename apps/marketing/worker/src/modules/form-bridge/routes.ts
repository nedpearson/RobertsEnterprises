import { Router } from 'express';
import { isFormBridgeConfigured } from '../scheduling/formBridge';

/**
 * Legacy Form Bridge compatibility surface.
 *
 * The browser-injected bridge is intentionally retired: browser JavaScript
 * cannot keep a shared secret confidential, and unauthenticated browser posts
 * must not be allowed to create tenant customer records.
 *
 * The authoritative intake path is the authenticated, idempotent,
 * server-to-server endpoint mounted at:
 *   POST /api/scheduling/public/form-bridge
 */
export const formBridgeRouter = Router();

formBridgeRouter.get('/status', (_req, res) => {
  const ready = isFormBridgeConfigured(process.env.PUBLIC_FORM_BRIDGE_SECRET);
  return res.status(ready ? 200 : 503).json({
    ready,
    mode: 'server-to-server',
    browserBridgeEnabled: false,
    secureEndpoint: '/api/scheduling/public/form-bridge',
  });
});

formBridgeRouter.get('/bridge.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  return res.send(
    `'use strict';\nconsole.warn('[VowOS] Browser Form Bridge retired. Configure the authenticated server-to-server form webhook.');\n`,
  );
});

// Preserve method, headers, and body for legitimate legacy webhook clients.
// The destination performs constant-time credential verification, exact
// organization/brand/location resolution, idempotency, and payload redaction.
formBridgeRouter.post('/submit', (_req, res) => {
  return res.redirect(307, '/api/scheduling/public/form-bridge');
});

// Secrets are never accepted in URLs. Old browser integrations fail loudly
// rather than leaking a credential or silently routing a submission.
formBridgeRouter.post('/submit/:secret/:domain', (_req, res) => {
  return res.status(410).json({
    error: 'URL-embedded Form Bridge credentials are retired.',
    secureEndpoint: '/api/scheduling/public/form-bridge',
  });
});
