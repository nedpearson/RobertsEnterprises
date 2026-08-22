import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runJobPoller } from './jobs/runner';

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
export const supabase = productionSupabase;

import { marketingAIRouter } from './modules/marketing-ai/routes';
import { growthRouter } from './modules/growth/routes';
import { googleAdsRouter } from './modules/growth/googleAdsRoutes';
import { trackingRouter } from './modules/growth/tracking';
import { reconciliationRouter } from './modules/growth/reconciliationRoutes';
import { startGrowthScheduler } from './modules/growth/scheduler';
import { organizationRouter } from './modules/organization/routes';
import { schedulingRouter } from './modules/scheduling/routes';
import { startPublicIntakeNotificationScheduler } from './modules/scheduling/public';
import { shopifyRouter } from './modules/shopify/routes';
import { fulfillmentRouter, startCustomerJourneyNotificationScheduler } from './modules/fulfillment/routes';
import { communicationsRouter } from './modules/communications/routes';
import { recoveryRouter } from './modules/recovery/routes';

const app = express();
app.use(helmet());
app.use(cors());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

export interface RequestContext {
  db: SupabaseClient;
  dataPlane: 'production' | 'demo';
  userId?: string;
  businessId?: string;
  role?: string;
}

/**
 * Shared request context for non-Growth modules. Growth has a stricter service-
 * role guard in modules/growth/auth.ts; this middleware never authorizes a
 * privileged Growth write by itself.
 */
app.use(async (req, _res, next) => {
  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = isDemo ? demoSupabase : productionSupabase;
  const context: RequestContext = { db, dataPlane: isDemo ? 'demo' : 'production' };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const { data: { user }, error } = await db.auth.getUser(token);
    if (!error && user) {
      context.userId = user.id;
      const requestedBusiness =
        typeof req.headers['x-business-id'] === 'string' ? req.headers['x-business-id'].trim() : '';
      let query = db
        .from('business_memberships')
        .select('business_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');
      if (requestedBusiness) query = query.eq('business_id', requestedBusiness);
      const { data: memberships } = await query.limit(requestedBusiness ? 1 : 2);
      if (memberships?.length === 1) {
        context.businessId = memberships[0].business_id;
        context.role = memberships[0].role;
      }
    }
  }

  (req as any).context = context;
  next();
});

export const requirePlatformAdmin = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const context = (req as any).context as RequestContext;
  if (!context?.userId) return res.status(401).json({ error: 'Sign in required.' });

  const { data, error } = await context.db
    .from('platform_users')
    .select('platform_role, active')
    .eq('auth_user_id', context.userId)
    .eq('active', true)
    .maybeSingle();
  if (error) return res.status(500).json({ error: `Could not resolve platform role: ${error.message}` });

  const role = (data as { platform_role?: string } | null)?.platform_role;
  if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_OWNER') {
    return res.status(403).json({ error: 'Platform administrator access required.' });
  }
  next();
};

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
  } catch (error: any) {
    console.error('Provisioning Exception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PLATFORM_TENANT_ROLES = new Set(['Owner', 'Manager', 'Stylist', 'Support']);

app.post('/api/platform/tenant-users', requirePlatformAdmin, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const businessId = typeof req.body?.businessId === 'string' ? req.body.businessId : '';
  const role = typeof req.body?.role === 'string' ? req.body.role : '';

  if (!email || !password || !name || !businessId || !PLATFORM_TENANT_ROLES.has(role)) {
    return res.status(400).json({ error: 'A valid name, email, password, tenant, and role are required.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Temporary password must be at least 8 characters.' });

  const { data: tenant, error: tenantError } = await productionSupabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle();
  if (tenantError) return res.status(500).json({ error: 'Could not validate the tenant.' });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

  const { data: created, error: createError } = await productionSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, skip_auto_provision: 'true' },
  });
  if (createError || !created.user) {
    const message = createError?.message || 'Could not create the user account.';
    return res.status(/already (registered|exists)/i.test(message) ? 409 : 400).json({ error: message });
  }

  try {
    const { error: profileError } = await productionSupabase
      .from('staff_profiles')
      .upsert({ id: created.user.id, business_id: businessId, name, role }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const { error: membershipError } = await productionSupabase
      .from('business_memberships')
      .upsert(
        { user_id: created.user.id, business_id: businessId, role, status: 'ACTIVE' },
        { onConflict: 'user_id,business_id' },
      );
    if (membershipError) throw membershipError;

    return res.status(201).json({ userId: created.user.id });
  } catch (error: any) {
    console.error('Tenant user membership creation failed:', error?.message || error);
    await productionSupabase.auth.admin.deleteUser(created.user.id);
    return res.status(500).json({ error: 'Could not attach the user to this tenant.' });
  }
});

export const requireBusinessContext = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const context = (req as any).context as RequestContext;
  if (!context.businessId) {
    return res.status(403).json({ error: 'Multi-tenant isolation requires an active business context.' });
  }
  next();
};

app.get('/api/tenant-config', (req, res) => {
  const isDemo = req.query.mode === 'demo';
  const supabaseUrl = isDemo
    ? process.env.VITE_DEMO_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    : process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = isDemo
    ? process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Backend missing Supabase configuration.' });
  }
  return res.json({ supabaseUrl, supabaseAnonKey });
});

// Marketing and Growth. Public tracking is mounted before authenticated routers.
app.use('/api/marketing-ai', marketingAIRouter);
app.use('/api/growth', trackingRouter);
app.use('/api/growth', growthRouter);
app.use('/api/growth', googleAdsRouter);
app.use('/api/growth', reconciliationRouter);
app.use('/api/organization', organizationRouter);

// Operational modules.
app.use('/api/scheduling', schedulingRouter);
app.use('/api/shopify', shopifyRouter);
app.use('/api/fulfillment', fulfillmentRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/recovery', recoveryRouter);

// Background schedulers are internally idempotent/feature-gated.
startGrowthScheduler();
startPublicIntakeNotificationScheduler();
startCustomerJourneyNotificationScheduler();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vowos-worker', timestamp: new Date().toISOString() });
});

async function start() {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`VowOS worker listening on port ${PORT}`);
  });
  console.log('Environment:', process.env.NODE_ENV);
  runJobPoller();
}

start().catch((error) => {
  console.error('Failed to start worker:', error);
});
