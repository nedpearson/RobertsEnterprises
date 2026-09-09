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

formBridgeRouter.post('/submit/:secret/:domain', (req, res) => {
  // Re-enable URL-embedded secret for Globo Zapier webhook which doesn't support headers
  req.headers['authorization'] = `Bearer ${req.params.secret}`;
  // Attach domain as an internal header or just let the main handler read it?
  // Actually, just redirect internally using res.redirect 307 so the main handler gets the authorization header? No, redirect drops headers.
  // We can just call the public endpoint directly, but it's easier to just re-write the URL and pass it to the main router?
  // Actually, we can just do a redirect with the secret in the query string? No, the public endpoint expects Authorization header.
  // So we can proxy it internally! Wait, just rewrite the req.url and req.headers and call next('route')? No, the other route is in a different router.
});
