import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runJobPoller } from './jobs/runner';

dotenv.config();

const controlPlaneUrl = process.env.VITE_SUPABASE_URL || 'https://klzzdgqxahglnifuwgke.databasepad.com';
const controlPlaneKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-key';

export const controlPlaneDb = createClient(controlPlaneUrl, controlPlaneKey);

// Legacy export to satisfy older engine imports (deprecated)
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://klzzdgqxahglnifuwgke.databasepad.com',
  process.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key'
);

import { marketingAIRouter } from './modules/marketing-ai/routes';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

export interface RequestContext {
  db: SupabaseClient;
  tenantId: string;
  userId?: string;
  role?: string;
}

// Global Auth / Data Plane Middleware
app.use(async (req, res, next) => {
  // Determine Tenant via Hostname
  const hostname = req.headers['x-forwarded-host'] || req.hostname;
  
  // Lookup tenant in Control Plane
  const { data: tenant, error: tenantErr } = await controlPlaneDb
    .from('vowos_tenants')
    .select('id, db_url, anon_key')
    .eq('primary_domain', hostname)
    .maybeSingle();
    
  if (tenantErr || !tenant) {
    // If not found by primary domain, fallback to default for local dev without domains configured
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
       // We'll let it pass for local health checks, but data requests will fail
       (req as any).context = {};
       return next();
    }
    return res.status(404).json({ error: 'Tenant not found for this domain.' });
  }

  // Parse ENV vars if used for local dev
  const dbUrl = tenant.db_url.startsWith('ENV:') ? process.env[tenant.db_url.split(':')[1]]! : tenant.db_url;
  const anonKey = tenant.anon_key.startsWith('ENV:') ? process.env[tenant.anon_key.split(':')[1]]! : tenant.anon_key;

  // Instantiate the Tenant Data Plane Client
  const authHeader = req.headers.authorization;
  const db = createClient(dbUrl, anonKey, {
    global: { headers: { Authorization: authHeader || '' } }
  });

  const context: RequestContext = {
    db,
    tenantId: tenant.id
  };

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await db.auth.getUser(token);
    
    if (!error && user) {
      context.userId = user.id;
      // Fetch role securely from Control Plane
      const { data: membership } = await controlPlaneDb
        .from('vowos_tenant_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (membership) {
        context.role = membership.role;
      }
    }
  }

  (req as any).context = context;
  next();
});

// Enforce Context Middleware (applied to routes requiring multi-tenant isolation)
export const requireBusinessContext = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const context = (req as any).context as RequestContext;
  if (!context.tenantId) {
    return res.status(403).json({ error: 'Multi-tenant isolation requires an active tenant context.' });
  }
  next();
};

// RBAC Middleware securely using Control Plane roles
const requireRole = (roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const context = (req as any).context as RequestContext;
  if (!context.userId || !context.role) {
    return res.status(401).json({ error: 'Missing or invalid authentication.' });
  }
  
  if (!roles.includes(context.role)) {
    return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
  }
  next();
};

// Mount Marketing AI Router
app.use('/api/marketing-ai', marketingAIRouter);

// Mount Legacy APIs ported from old Node Monolith
import { legacyRouter } from './modules/legacy/routes';
app.use('/api', legacyRouter);

// Mount Scheduling Router
import { schedulingRouter } from './modules/scheduling/routes';
app.use('/api/scheduling', schedulingRouter);

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
    const context = (req as any).context as RequestContext;
    if (!context.db) throw new Error('No tenant database connection');
    
    // Queue the durable job in the Tenant Data Plane
    await context.db.from('durable_jobs').insert({
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

// Tenant Configuration Endpoint (Called by Frontend on boot)
app.get('/api/tenant-config', async (req, res) => {
  try {
    const hostname = req.headers['x-forwarded-host'] || req.hostname;
    
    // Default fallback for local testing if no domains map
    let domainToLookup = hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      domainToLookup = 'robertsenterprises.bridgebox.ai'; // Fallback to Roberts for local dev
    }

    // Special case for Central Sign-In / Control Plane Domain
    if (domainToLookup === 'vowos.bridgebox.ai' || domainToLookup === 'vowos.localhost') {
       return res.json({
         id: 'vowos-control-plane',
         name: 'VowOS Platform',
         supabaseUrl: controlPlaneUrl,
         supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key',
         brand: { primary_color: '#000000', secondary_color: '#ffffff', font_family: 'Inter' },
         subscription: { plan_id: 'enterprise', status: 'active' },
         isControlPlane: true
       });
    }

    const { data: tenant, error: tenantErr } = await controlPlaneDb
      .from('vowos_tenants')
      .select('id, name, db_url, anon_key')
      .eq('primary_domain', domainToLookup)
      .maybeSingle();

    if (tenantErr || !tenant) {
      return res.status(404).json({ error: 'Tenant configuration not found for this domain.' });
    }
    
    const { data: brand } = await controlPlaneDb
      .from('vowos_tenant_brands')
      .select('logo_url, primary_color, secondary_color, font_family')
      .eq('tenant_id', tenant.id)
      .maybeSingle();
      
    const { data: subscription } = await controlPlaneDb
      .from('vowos_subscriptions')
      .select('plan_id, status')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    // Parse ENV vars if used for local dev
    const dbUrl = tenant.db_url.startsWith('ENV:') ? process.env[tenant.db_url.split(':')[1]]! : tenant.db_url;
    const anonKey = tenant.anon_key.startsWith('ENV:') ? process.env[tenant.anon_key.split(':')[1]]! : tenant.anon_key;

    res.json({
      id: tenant.id,
      name: tenant.name,
      supabaseUrl: dbUrl,
      supabaseAnonKey: anonKey,
      brand: brand || { primary_color: '#000000', secondary_color: '#ffffff', font_family: 'Inter' },
      subscription: subscription || { plan_id: 'essentials', status: 'active' }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
