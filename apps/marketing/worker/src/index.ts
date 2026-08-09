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

if (process.env.NODE_ENV === 'production' && (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.INTEGRATION_ENCRYPTION_KEY)) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY and INTEGRATION_ENCRYPTION_KEY are required in production.');
}

export const productionSupabase = createClient(prodUrl, prodServiceKey);
export const demoSupabase = createClient(demoUrl, demoServiceKey);

// Backwards compatibility for jobs that have not yet been converted to request context.
export const supabase = productionSupabase;

import { marketingAIRouter } from './modules/marketing-ai/routes';
import { integrationsRouter } from './modules/integrations/routes';
import { schedulingRouter } from './modules/scheduling/routes';

const app = express();
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || [
  'http://localhost:5173',
  'https://robertsenterprises.bridgebox.ai',
  'https://vowos.bridgebox.ai',
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by VowOS marketing CORS policy.'));
  },
}));

app.use(express.json({
  limit: '2mb',
  verify(req, _res, buffer) {
    (req as any).rawBody = Buffer.from(buffer);
  },
}));

export interface RequestContext {
  db: SupabaseClient;
  dataPlane: 'production' | 'demo';
  userId?: string;
  businessId?: string;
  role?: string;
}

// Global authentication and data-plane middleware. The browser cannot self-assert its role;
// membership is resolved from the authenticated Supabase user on every worker request.
app.use(async (req, _res, next) => {
  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = isDemo ? demoSupabase : productionSupabase;
  const requestContext: RequestContext = {
    db,
    dataPlane: isDemo ? 'demo' : 'production',
  };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const { data: { user }, error } = await db.auth.getUser(token);

    if (!error && user) {
      requestContext.userId = user.id;
      const { data: memberships } = await db
        .from('business_memberships')
        .select('business_id, role')
        .eq('user_id', user.id);

      const requestedBusinessId = typeof req.headers['x-business-id'] === 'string'
        ? req.headers['x-business-id']
        : undefined;
      const membership = requestedBusinessId
        ? memberships?.find((item: any) => item.business_id === requestedBusinessId)
        : memberships?.[0];

      if (membership) {
        requestContext.businessId = membership.business_id;
        requestContext.role = membership.role;
      }
    }
  }

  (req as any).context = requestContext;
  next();
});

export const requireBusinessContext = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestContext = (req as any).context as RequestContext;
  if (!requestContext?.userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!requestContext.businessId) {
    return res.status(403).json({ error: 'Multi-tenant isolation requires an active business context.' });
  }
  next();
};

const requireRole = (roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestContext = (req as any).context as RequestContext;
  if (!requestContext?.userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!requestContext.businessId) return res.status(403).json({ error: 'Active business membership required.' });

  const allowed = roles.map((role) => role.toLowerCase());
  const actual = (requestContext.role || '').toLowerCase();
  if (!allowed.includes(actual)) {
    return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
  }
  next();
};

// Canonical APIs
app.use('/api/integrations', integrationsRouter);
app.use('/api/marketing-ai', marketingAIRouter);
app.use('/api/scheduling', schedulingRouter);

app.post('/api/campaigns/pause-all', requireRole(['Owner', 'Manager']), async (req, res) => {
  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Brand required' });

  try {
    const requestContext = (req as any).context as RequestContext;
    await requestContext.db.from('durable_jobs').insert({
      queue_name: 'emergency_pause_all',
      payload: {
        businessId: requestContext.businessId,
        requestedBy: requestContext.userId,
        brand,
        timestamp: new Date().toISOString(),
      },
    });
    res.json({ success: true, message: 'Emergency pause queued successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vowos-worker', timestamp: new Date().toISOString() });
});

async function start() {
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, () => {
    console.log(`VowOS marketing worker listening on port ${PORT}`);
  });

  console.log('Environment:', process.env.NODE_ENV);
  runJobPoller();
}

start().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exitCode = 1;
});
