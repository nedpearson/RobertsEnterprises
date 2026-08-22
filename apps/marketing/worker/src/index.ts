import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Maintain the `supabase` export for backwards compatibility, but log a warning.
// In a fully compliant refactor, this is removed and `req.context.db` is passed everywhere.
export const supabase = productionSupabase;

import { marketingAIRouter } from './modules/marketing-ai/routes';

const app = express();
app.use(helmet());
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

// Global Auth / Data Plane Middleware
app.use(async (req, res, next) => {
  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = isDemo ? demoSupabase : productionSupabase;
  const context: RequestContext = {
    db,
    dataPlane: isDemo ? 'demo' : 'production'
  };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // In a real app, verify the JWT using the appropriate Supabase project secret
    // For now, we fetch the user from Supabase to validate the token
    const { data: { user }, error } = await db.auth.getUser(token);
    
    if (!error && user) {
      context.userId = user.id;
      // Ideally, the business_id is in the JWT app_metadata or we look it up
      // For this foundation, we simulate looking it up from business_memberships
      const { data: membership } = await db
        .from('business_memberships')
        .select('business_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        context.businessId = membership.business_id;
        context.role = membership.role;
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
    // Executes with service_role to bypass RLS for provisioning — authorisation
    // is enforced by requirePlatformAdmin above, not by the RPC.
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

// Enforce Context Middleware (applied to routes requiring multi-tenant isolation)
export const requireBusinessContext = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const context = (req as any).context as RequestContext;
  if (!context.businessId) {
    return res.status(403).json({ error: 'Multi-tenant isolation requires an active business context.' });
  }
  next();
};

// RBAC Middleware
const requireRole = (roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  
  // In a real implementation, verify JWT and extract user role
  // For demonstration, we'll check a mock header or assume the role is provided
  const userRole = req.headers['x-user-role'] as string || 'staff';
  if (!roles.includes(userRole)) {
    return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
  }
  next();
};

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
      primary_color: isDemo ? '#7c3aed' : '#000000' // Purple for demo, black for standard
    }
  });
});

// Mount Marketing AI Router
app.use('/api/marketing-ai', marketingAIRouter);

// Growth & Marketing provider integration (OAuth, sync jobs, setup self-check).
import { growthRouter } from './modules/growth/routes';
// Public, append-only attribution tracking. Mounted BEFORE the authenticated
// router so its two routes are reachable without a session; everything else
// under /api/growth stays behind requireGrowthAccess.
import { trackingRouter } from './modules/growth/tracking';
app.use('/api/growth', trackingRouter);
app.use('/api/growth', growthRouter);

// Background provider sync. Opt-in via GROWTH_SYNC_ENABLED so a second replica
// or a local run never double-syncs a tenant by accident.
import { startGrowthScheduler } from './modules/growth/scheduler';
startGrowthScheduler();

// Mount Scheduling Router
import { schedulingRouter } from './modules/scheduling/routes';
app.use('/api/scheduling', schedulingRouter);

// Mount Shopify Router
import { shopifyRouter } from './modules/shopify/routes';
import { communicationsRouter } from './modules/communications/routes';
import { recoveryRouter } from './modules/recovery/routes';
app.use('/api/shopify', shopifyRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/recovery', recoveryRouter);

// OAuth Connect Endpoint
app.get('/api/auth/connect/:provider', (req, res) => {
  const { provider } = req.params;
  const { brand } = req.query;
  
  // Real implementation would redirect to provider's authorization URL
  console.log(`Initiating OAuth for ${provider} - Brand: ${brand}`);
  res.redirect(`http://localhost:5173/marketing/connections?success=true&provider=${provider}`);
});

// OAuth Callback Endpoint
app.get('/api/auth/callback/:provider', async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  
  // Real implementation would exchange code for tokens securely and store in `provider_connections` table
  console.log(`Received OAuth callback for ${provider}. Code: ${code}`);
  
  res.send('Authorization successful. You can close this window.');
});

app.post('/api/campaigns/pause-all', requireRole(['owner', 'manager']), async (req, res) => {
  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Brand required' });
  
  try {
    console.log(`🚨 Received EMERGENCY PAUSE request for ${brand}`);
    // Queue the durable job
    await supabase.from('durable_jobs').insert({
      queue_name: 'emergency_pause_all',
      payload: { brand, timestamp: new Date().toISOString() }
    });
    res.json({ success: true, message: 'Emergency pause queued successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'vowos-worker', timestamp: new Date() });
});

async function start() {
  const PORT = process.env.PORT || 8080;
  
  app.listen(PORT, () => {
    console.log(`🚀 Proper & Co Autonomous Marketing Worker listening on port ${PORT}`);
  });
  
  console.log('Environment:', process.env.NODE_ENV);
  
  // Start the background job poller
  runJobPoller();
}

start().catch((err) => {
  console.error('Failed to start worker:', err);
});
