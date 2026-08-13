import { createClient, SupabaseClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runJobPoller } from './jobs/runner';
import {
  DATA_PLANE_URL,
  DATA_PLANE_ANON_KEY,
  SERVICE_ROLE_KEY,
  DEMO_ORGANIZATION_ID,
  PLATFORM_HOSTS,
  TENANT_SUFFIX,
  publicDataPlaneDb,
  privilegedDataPlaneDb,
  controlPlaneDb,
  supabase,
  RequestContext,
  requireBusinessContext,
  requireRole
} from './shared';
import { marketingAIRouter } from './modules/marketing-ai/routes';
import { legacyRouter } from './modules/legacy/routes';
import { schedulingRouter } from './modules/scheduling/routes';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '64kb' }));

interface ResolvedOrganization {
  id: string;
  name: string;
  display_name?: string | null;
  slug: string;
  status?: string | null;
  subscription_status?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
}

function requestHostname(req: express.Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const raw = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.hostname || '';
  return raw.split(',')[0].trim().split(':')[0].toLowerCase();
}

function isDemoRequest(req: express.Request): boolean {
  if (req.query.mode === 'demo') return true;
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  try {
    const url = referer ? new URL(referer) : null;
    return url?.hostname === 'vowos.bridgebox.ai' && url.pathname.startsWith('/demo');
  } catch {
    return false;
  }
}

function tenantSlugFromHost(hostname: string): string | null {
  if (!hostname.endsWith(TENANT_SUFFIX)) return null;
  const slug = hostname.slice(0, -TENANT_SUFFIX.length);
  if (!slug || slug.includes('.')) return null;
  return slug;
}

async function resolveOrganization(slug: string): Promise<ResolvedOrganization | null> {
  const columns =
    'id,name,display_name,slug,status,subscription_status,primary_color,secondary_color,accent_color,logo_url';

  // Prefer the server-only service role when configured. Only the explicitly
  // selected safe fields are ever returned to clients.
  if (privilegedDataPlaneDb) {
    const { data, error } = await privilegedDataPlaneDb
      .from('businesses')
      .select(columns)
      .eq('slug', slug)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error) throw new Error(`Tenant resolution failed: ${error.message}`);
    return data as ResolvedOrganization | null;
  }

  // Fallback to the SECURITY DEFINER RPC installed by the canonical tenant
  // resolver migration. This returns only non-sensitive organization metadata.
  if (!publicDataPlaneDb) return null;
  const { data, error } = await publicDataPlaneDb.rpc('resolve_public_organization_by_slug', {
    p_slug: slug,
  });
  if (error) throw new Error(`Tenant resolution failed: ${error.message}`);
  const record = Array.isArray(data) ? data[0] : data;
  return (record as ResolvedOrganization | null) || null;
}

function requirePublicDataPlane(res: express.Response): boolean {
  if (DATA_PLANE_URL && DATA_PLANE_ANON_KEY && publicDataPlaneDb) return true;
  res.status(503).json({ error: 'VowOS data plane is not configured.' });
  return false;
}

// Canonical tenant/auth context middleware.
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/tenant-config') return next();
  if (!requirePublicDataPlane(res)) return;

  const hostname = requestHostname(req);
  const demo = isDemoRequest(req);
  const platform = PLATFORM_HOSTS.has(hostname) && !demo;

  try {
    let tenantId: string | undefined;
    let tenantSlug: string | undefined;

    if (demo) {
      tenantId = DEMO_ORGANIZATION_ID;
      tenantSlug = 'demo';
    } else if (!platform) {
      const slug = tenantSlugFromHost(hostname);
      if (!slug) return res.status(404).json({ error: 'Tenant not found for this domain.' });
      const organization = await resolveOrganization(slug);
      if (!organization) return res.status(404).json({ error: 'Tenant not found for this domain.' });
      tenantId = organization.id;
      tenantSlug = organization.slug;
    }

    const authHeader = req.headers.authorization;
    const db = createClient(DATA_PLANE_URL!, DATA_PLANE_ANON_KEY!, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const context: RequestContext = {
      db,
      tenantId,
      tenantSlug,
      isDemo: demo,
      isPlatform: platform,
    };

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length);
      const {
        data: { user },
        error,
      } = await db.auth.getUser(token);

      if (!error && user) {
        context.userId = user.id;

        if (tenantId) {
          const { data: membership, error: membershipError } = await db
            .from('business_memberships')
            .select('role,status')
            .eq('user_id', user.id)
            .eq('business_id', tenantId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

          if (membershipError) {
            console.warn('Membership resolution failed for authenticated user.');
          } else if (membership) {
            context.role = membership.role;
          }
        }
      }
    }

    (req as any).context = context;
    next();
  } catch (error) {
    console.error('Tenant context resolution failed:', error instanceof Error ? error.message : error);
    res.status(503).json({ error: 'Tenant configuration is temporarily unavailable.' });
  }
});



app.use('/api/marketing-ai', marketingAIRouter);
app.use('/api', legacyRouter);
app.use('/api/scheduling', schedulingRouter);

// Legacy placeholder OAuth endpoints previously logged provider authorization
// codes and redirected to localhost. Fail closed until each provider-specific
// secure OAuth implementation is configured.
app.get('/api/auth/connect/:provider', (_req, res) => {
  res.status(501).json({
    error: 'This provider connection must be completed through the secure Integrations setup.',
  });
});

app.get('/api/auth/callback/:provider', (_req, res) => {
  res.status(501).send('This OAuth callback is not configured for this provider.');
});

app.post('/api/campaigns/pause-all', requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Brand required' });

  try {
    const context = (req as any).context as RequestContext;
    if (context.isDemo) {
      return res.status(409).json({ error: 'Live provider mutations are disabled in demo mode.' });
    }
    if (!context.db || !context.tenantId) throw new Error('No tenant database connection');

    const { error } = await context.db.from('durable_jobs').insert({
      business_id: context.tenantId,
      queue_name: 'emergency_pause_all',
      payload: { brand, timestamp: new Date().toISOString() },
    });
    if (error) throw error;

    res.json({ success: true, message: 'Emergency pause queued successfully' });
  } catch (err: any) {
    console.error('Emergency pause queueing failed:', err?.message || err);
    res.status(500).json({ error: 'Unable to queue emergency pause.' });
  }
});

app.get('/api/health', (_req, res) => {
  const configured = Boolean(DATA_PLANE_URL && DATA_PLANE_ANON_KEY);
  res.status(configured ? 200 : 503).json({
    status: configured ? 'ok' : 'degraded',
    service: 'vowos-worker',
    dataPlaneConfigured: configured,
    privilegedOperationsConfigured: Boolean(SERVICE_ROLE_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Safe tenant bootstrap endpoint. It never returns a service-role credential.
app.get('/api/tenant-config', async (req, res) => {
  if (!requirePublicDataPlane(res)) return;

  try {
    const hostname = requestHostname(req);
    const demo = isDemoRequest(req);

    if (demo) {
      return res.json({
        tenantId: DEMO_ORGANIZATION_ID,
        tenantName: 'VowOS Demo',
        slug: 'demo',
        supabaseUrl: DATA_PLANE_URL,
        supabaseAnonKey: DATA_PLANE_ANON_KEY,
        brand: {
          primary_color: '#D55162',
          secondary_color: '#FFFFFF',
          accent_color: '#7C3AED',
        },
        subscription: { plan_id: 'demo', status: 'ACTIVE' },
        isDemo: true,
      });
    }

    if (PLATFORM_HOSTS.has(hostname)) {
      return res.json({
        tenantId: null,
        tenantName: 'VowOS Platform',
        slug: null,
        supabaseUrl: DATA_PLANE_URL,
        supabaseAnonKey: DATA_PLANE_ANON_KEY,
        brand: { primary_color: '#111111', secondary_color: '#FFFFFF' },
        isControlPlane: true,
      });
    }

    const slug = tenantSlugFromHost(hostname);
    if (!slug) return res.status(404).json({ error: 'Tenant configuration not found for this domain.' });

    const organization = await resolveOrganization(slug);
    if (!organization) {
      return res.status(404).json({ error: 'Tenant configuration not found for this domain.' });
    }

    return res.json({
      tenantId: organization.id,
      tenantName: organization.display_name || organization.name,
      slug: organization.slug,
      supabaseUrl: DATA_PLANE_URL,
      supabaseAnonKey: DATA_PLANE_ANON_KEY,
      brand: {
        primary_color: organization.primary_color || '#D55162',
        secondary_color: organization.secondary_color || '#FFFFFF',
        accent_color: organization.accent_color || undefined,
        logo_url: organization.logo_url || undefined,
      },
      subscription: { status: organization.subscription_status || 'TRIAL' },
      isDemo: false,
    });
  } catch (err: any) {
    console.error('Tenant configuration lookup failed:', err?.message || err);
    res.status(503).json({ error: 'Tenant configuration is temporarily unavailable.' });
  }
});

async function start() {
  const port = Number(process.env.PORT || 8080);

  if (!DATA_PLANE_URL || !DATA_PLANE_ANON_KEY) {
    console.error('VowOS worker configuration incomplete: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY required.');
  }

  app.listen(port, () => {
    console.log(`VowOS worker listening on port ${port}`);
  });

  if (SERVICE_ROLE_KEY && DATA_PLANE_URL) {
    runJobPoller();
  } else {
    console.warn('Background privileged job poller disabled until SUPABASE_SERVICE_ROLE_KEY is configured.');
  }
}

start().catch((err) => {
  console.error('Failed to start worker:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
