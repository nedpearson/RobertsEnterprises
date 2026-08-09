import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runJobPoller } from './jobs/runner';

dotenv.config();

const prodUrl = process.env.VITE_SUPABASE_URL || 'https://klzzdgqxahglnifuwgke.databasepad.com';
const prodServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-key';

const demoUrl = process.env.VITE_DEMO_SUPABASE_URL || 'https://demo-klzzdgqxahglnifuwgke.databasepad.com';
const demoServiceKey = process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY || 'fake-key';

export const productionSupabase = createClient(prodUrl, prodServiceKey);
export const demoSupabase = createClient(demoUrl, demoServiceKey);

// Maintain the `supabase` export for backwards compatibility, but log a warning.
// In a fully compliant refactor, this is removed and `req.context.db` is passed everywhere.
export const supabase = productionSupabase;

import { marketingAIRouter } from './modules/marketing-ai/routes';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// Mount Marketing AI Router
app.use('/api/marketing-ai', marketingAIRouter);

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
