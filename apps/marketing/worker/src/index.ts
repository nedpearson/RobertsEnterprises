import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runJobPoller } from './jobs/runner';
import { normalizeLegacyRole } from './lib/auth/authorization';
import { platformRouter } from './modules/platform/routes';
import { platformIntegrationsRouter } from './modules/platform/integrations';

dotenv.config();

const prodUrl = process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co';
const prodServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('VowOS worker configuration incomplete: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY required.');
  console.warn('Background privileged job poller disabled until SUPABASE_SERVICE_ROLE_KEY is configured.');
}

const demoUrl = process.env.VITE_DEMO_SUPABASE_URL || prodUrl;
const demoServiceKey = process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY || prodServiceKey;

export const productionSupabase = createClient(prodUrl, prodServiceKey);
export const demoSupabase = createClient(demoUrl, demoServiceKey);

// Maintain the `supabase` export for backwards compatibility while modules are
// incrementally moved to request-scoped database clients.
export const supabase = productionSupabase;

import { marketingAIRouter } from './modules/marketing-ai/routes';

const app = express();
// Railway terminates TLS and forwards the client chain through one reverse
// proxy hop. Trust exactly that hop so express-rate-limit uses the real client
// address without broadly trusting arbitrary X-Forwarded-For chains.
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

export interface RequestContext {
  db: SupabaseClient;
  dataPlane: 'production' | 'demo';
  userId?: string;
  businessId?: string;
  role?: string;
}

/**
 * Global authenticated request context.
 *
 * Tenant selection is fail-closed. An explicit X-Business-Id must belong to
 * the signed-in user and carry one of the four recognized workspace roles.
 * Without an explicit tenant, exactly one active authorized membership may be
 * resolved. Database row order never selects a tenant.
 */
app.use(async (req, _res, next) => {
  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = isDemo ? demoSupabase : productionSupabase;
  const context: RequestContext = {
    db,
    dataPlane: isDemo ? 'demo' : 'production'
  };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const { data: { user }, error } = await db.auth.getUser(token);

    if (!error && user) {
      context.userId = user.id;
      const requestedHeader = req.headers['x-business-id'];
      const selectedBusinessId = typeof requestedHeader === 'string' && requestedHeader.trim()
        ? requestedHeader.trim()
        : null;

      let membershipQuery = db
        .from('business_memberships')
        .select('business_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      if (selectedBusinessId) {
        membershipQuery = membershipQuery.eq('business_id', selectedBusinessId);
      }

      const { data: memberships, error: membershipError } = await membershipQuery.limit(selectedBusinessId ? 1 : 2);
      if (membershipError) {
        console.error('[auth-context] membership resolution failed:', membershipError.message);
      } else if (memberships?.length === 1) {
        const membership = memberships[0] as { business_id: string; role: string };
        const canonicalRole = normalizeLegacyRole(membership.role);
        if (canonicalRole && membership.business_id) {
          context.businessId = membership.business_id;
          context.role = canonicalRole;
        } else {
          console.warn('[auth-context] active membership has an unrecognized workspace role; tenant context denied.');
        }
      }
    }
  }

  (req as any).context = context;
  next();
});

/**
 * Platform-admin guard.
 *
 * Reads the caller's identity from the verified JWT (set by the middleware
 * above) and confirms an active SUPER_ADMIN / PLATFORM_OWNER row in
 * platform_users — the same predicate `public.is_super_admin()` uses in RLS.
 * We check it in application code because these routes run on the service-role
 * client, where `auth.uid()` is NULL and the SQL guard silently passes.
 */
export const requirePlatformAdmin = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const context = (req as any).context as RequestContext;
  if (!context?.userId) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const { data, error } = await context.db
    .from('platform_users')
    .select('platform_role, active')
    .eq('auth_user_id', context.userId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: `Could not resolve platform role: ${error.message}` });
  }

  const role = (data as { platform_role?: string } | null)?.platform_role;
  if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_OWNER') {
    return res.status(403).json({ error: 'Platform administrator access required.' });
  }

  next();
};

/**
 * Tenant provisioning.
 *
 * REGISTRATION ORDER IS LOAD-BEARING: this route was previously registered
 * ABOVE the auth middleware, so Express dispatched it before any of that ran.
 * The result was an internet-reachable, unauthenticated POST that wrote tenants
 * into the production database via a SECURITY DEFINER RPC on the service-role
 * client — and the RPC's own guard (`IF auth.uid() IS NOT NULL AND NOT
 * is_super_admin()`) short-circuits to a pass under the service role, because
 * auth.uid() is NULL there. Do not move this above the middleware.
 */
app.post('/api/platform/organizations', requirePlatformAdmin, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ success: false, error: 'A JSON object payload is required.' });
    }
    const { data, error } = await productionSupabase.rpc('provision_full_tenant', { payload });
    if (error) {
      console.error('Provisioning RPC Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Provisioning Exception:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Creates tenant users with the Auth admin API. Caller-facing legacy role names
 * are accepted only when they map to one of the four canonical workspace roles;
 * the database always receives the canonical role string. There is no tenant
 * "Support" role — support access is a separate audited platform capability.
 */
app.post('/api/platform/tenant-users', requirePlatformAdmin, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const businessId = typeof req.body?.businessId === 'string' ? req.body.businessId.trim() : '';
  const requestedRole = typeof req.body?.role === 'string' ? req.body.role : '';
  const canonicalRole = normalizeLegacyRole(requestedRole);

  if (!email || !password || !name || !businessId || !canonicalRole) {
    return res.status(400).json({
      error: 'A valid name, email, password, tenant, and recognized workspace role are required.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Temporary password must be at least 8 characters.' });
  }

  const { data: tenant, error: tenantError } = await productionSupabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle();

  if (tenantError) {
    console.error('Tenant user creation tenant lookup failed:', tenantError.message);
    return res.status(500).json({ error: 'Could not validate the tenant.' });
  }
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found.' });
  }

  const { data: created, error: createError } = await productionSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, skip_auto_provision: 'true' },
  });

  if (createError || !created.user) {
    const message = createError?.message || 'Could not create the user account.';
    const status = /already (registered|exists)/i.test(message) ? 409 : 400;
    return res.status(status).json({ error: message });
  }

  try {
    const { error: profileError } = await productionSupabase
      .from('staff_profiles')
      .upsert({ id: created.user.id, business_id: businessId, name, role: canonicalRole }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const { error: membershipError } = await productionSupabase
      .from('business_memberships')
      .upsert({
        user_id: created.user.id,
        business_id: businessId,
        role: canonicalRole,
        status: 'ACTIVE',
      }, { onConflict: 'user_id,business_id' });
    if (membershipError) throw membershipError;

    return res.status(201).json({ userId: created.user.id, role: canonicalRole });
  } catch (error: any) {
    console.error('Tenant user membership creation failed:', error?.message || error);
    await productionSupabase.auth.admin.deleteUser(created.user.id);
    return res.status(500).json({ error: 'Could not attach the user to this tenant.' });
  }
});

// Enforce Context Middleware (applied to routes requiring multi-tenant isolation)
export const requireBusinessContext = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const context = (req as any).context as RequestContext;
  if (!context.businessId || !context.role) {
    const selectedBusinessId = req.headers['x-business-id'];
    if (typeof selectedBusinessId === 'string' && selectedBusinessId.trim()) {
      return res.status(403).json({ error: 'You do not have an active authorized membership for the selected business.' });
    }
    return res.status(409).json({
      error: 'Select an active authorized business workspace and try again.',
      code: 'BUSINESS_CONTEXT_REQUIRED',
    });
  }
  next();
};

// Platform Operations uses service-role data access internally, so every global
// surface is guarded by the verified platform role rather than tenant hierarchy.
app.use('/api/platform/integrations', requirePlatformAdmin, platformIntegrationsRouter);
app.use('/api/platform', requirePlatformAdmin, platformRouter);

// Tenant Config Endpoint for Frontend Bootstrapping
app.get('/api/tenant-config', (req, res) => {
  const isDemo = req.query.mode === 'demo';
  const supabaseUrl = isDemo
    ? (process.env.VITE_DEMO_SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    : process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = isDemo
    ? (process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    : process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Backend missing Supabase configuration.' });
  }

  res.json({
    supabaseUrl,
    supabaseAnonKey,
    brand: {
      primary_color: isDemo ? '#7c3aed' : '#000000'
    }
  });
});

// Mount Marketing AI Router
app.use('/api/marketing-ai', marketingAIRouter);

// Growth & Marketing provider integration (OAuth, sync jobs, setup self-check).
import { growthRouter } from './modules/growth/routes';
import { organizationRouter } from './modules/organization/routes';
// Public, append-only attribution tracking. Mounted BEFORE the authenticated
// router so its two routes are reachable without a session; everything else
// under /api/growth stays behind requireGrowthAccess.
import { trackingRouter } from './modules/growth/tracking';
app.use('/api/growth', trackingRouter);
app.use('/api/growth', growthRouter);
app.use('/api/organization', organizationRouter);

// Background provider sync. Opt-in via GROWTH_SYNC_ENABLED so a second replica
// or a local run never double-syncs a tenant by accident.
import { startGrowthScheduler } from './modules/growth/scheduler';
startGrowthScheduler();

// Mount Scheduling Router
import { schedulingRouter } from './modules/scheduling/routes';
import { startPublicIntakeNotificationScheduler } from './modules/scheduling/public';
app.use('/api/scheduling', schedulingRouter);
startPublicIntakeNotificationScheduler();

// Mount Shopify Router
import { shopifyRouter } from './modules/shopify/routes';
import { fulfillmentRouter, startCustomerJourneyNotificationScheduler } from './modules/fulfillment/routes';
import { communicationsRouter } from './modules/communications/routes';
import { recoveryRouter } from './modules/recovery/routes';
app.use('/api/shopify', shopifyRouter);
app.use('/api/fulfillment', fulfillmentRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/recovery', recoveryRouter);
app.use('/api/form-bridge', require('./modules/form-bridge/routes').formBridgeRouter);
startCustomerJourneyNotificationScheduler();

// Legacy mock OAuth and campaign pause endpoints were deliberately removed.
// Provider OAuth lives under /api/growth and /api/shopify, where authenticated
// tenant context is verified before any service-role mutation is allowed.

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vowos-worker', timestamp: new Date() });
});

async function start() {
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, () => {
    console.log(`🚀 VowOS worker listening on port ${PORT}`);
  });

  console.log('Environment:', process.env.NODE_ENV);

  runJobPoller();
}

start().catch((err) => {
  console.error('Failed to start worker:', err);
});
