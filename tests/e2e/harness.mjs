import http from 'node:http';
import crypto from 'node:crypto';

/**
 * VowOS E2E In-Memory Multi-Tenant Store & Test Harness
 */
export class VowosInMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.businesses = new Map();
    this.brands = new Map();
    this.locations = new Map();
    this.memberships = new Map();
    this.subscriptions = new Map();
    this.featureOverrides = new Map();
    this.modulePreferences = new Map();
    this.customers = new Map();
    this.customerPreferences = new Map();
    this.customerNotes = new Map();
    this.appointments = new Map();
    this.appointmentRequests = new Map();
    this.appointmentHolds = new Map();
    this.gowns = new Map();
    this.purchaseOrders = new Map();
    this.transfers = new Map();
    this.invoices = new Map();
    this.payments = new Map();
    this.refunds = new Map();
    this.staff = new Map();
    this.schedules = new Map();
    this.timeOffRequests = new Map();
    this.timeEntries = new Map();
    this.salesCommissions = new Map();
    this.leads = new Map();
    this.marketingCampaigns = new Map();
    this.attributionTouchpoints = new Map();
    this.seoHealthSnapshots = new Map();
    this.messages = new Map();
    this.durableJobs = new Map();
    this.supportTickets = new Map();
    this.auditLogs = new Map();
    this.webhookEvents = new Map();
    this.processedWebhooks = new Set();
    this.rateLimiters = new Map();

    this.seedDefaultData();
  }

  seedDefaultData() {
    // Seed Businesses
    const bizIdo = {
      id: 'biz_ido_bridal',
      name: 'I Do Bridal Couture',
      slug: 'ido-bridal',
      organization_type: 'boutique',
      subscription_status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString()
    };
    const bizProper = {
      id: 'biz_proper_co',
      name: 'Proper & Company',
      slug: 'proper-co',
      organization_type: 'boutique',
      subscription_status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString()
    };
    const bizTenantB = {
      id: 'biz_tenant_b',
      name: 'Tenant B Bridal',
      slug: 'tenant-b',
      organization_type: 'boutique',
      subscription_status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString()
    };
    const bizComped = {
      id: 'biz_tenant_comped',
      name: 'Roberts Enterprises Flagship',
      slug: 'roberts-flagship',
      organization_type: 'enterprise',
      subscription_status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString()
    };

    this.businesses.set(bizIdo.id, bizIdo);
    this.businesses.set(bizProper.id, bizProper);
    this.businesses.set(bizTenantB.id, bizTenantB);
    this.businesses.set(bizComped.id, bizComped);

    // Seed Brands
    const brandIdo = {
      id: 'brand_ido',
      business_id: bizIdo.id,
      name: 'I Do Bridal Couture',
      slug: 'ido-bridal-couture',
      brand_colors: { primary: '#D4AF37', secondary: '#F5F5DC' }
    };
    const brandProper = {
      id: 'brand_proper',
      business_id: bizProper.id,
      name: 'Proper & Company',
      slug: 'proper-and-company',
      brand_colors: { primary: '#1A365D', secondary: '#E2E8F0' }
    };
    this.brands.set(brandIdo.id, brandIdo);
    this.brands.set(brandProper.id, brandProper);

    // Seed Locations
    const locIdoBr = {
      id: 'ido-br',
      business_id: bizIdo.id,
      brand_id: brandIdo.id,
      name: 'I Do Bridal Couture · Baton Rouge',
      city: 'Baton Rouge',
      address: '4242 Perkins Rd, Baton Rouge, LA 70808',
      phone: '+12255550101',
      email: 'br@idobridalcouture.com'
    };
    const locIdoCov = {
      id: 'ido-cov',
      business_id: bizIdo.id,
      brand_id: brandIdo.id,
      name: 'I Do Bridal Couture · Covington',
      city: 'Covington',
      address: '315 Lee Ln, Covington, LA 70433',
      phone: '+19855550102',
      email: 'cov@idobridalcouture.com'
    };
    const locPcBr = {
      id: 'pc-br',
      business_id: bizProper.id,
      brand_id: brandProper.id,
      name: 'Proper & Company · Baton Rouge',
      city: 'Baton Rouge',
      address: '4343 Perkins Rd, Baton Rouge, LA 70808',
      phone: '+12255550201',
      email: 'br@properandcompany.com'
    };
    const locPcCov = {
      id: 'pc-cov',
      business_id: bizProper.id,
      brand_id: brandProper.id,
      name: 'Proper & Company · Covington',
      city: 'Covington',
      address: '320 Lee Ln, Covington, LA 70433',
      phone: '+19855550202',
      email: 'cov@properandcompany.com'
    };
    const locTenantB = {
      id: 'loc_tb_1',
      business_id: bizTenantB.id,
      name: 'Tenant B Main',
      city: 'New Orleans',
      address: '700 Canal St',
      phone: '+15045550303',
      email: 'main@tenantb.com'
    };

    this.locations.set(locIdoBr.id, locIdoBr);
    this.locations.set(locIdoCov.id, locIdoCov);
    this.locations.set(locPcBr.id, locPcBr);
    this.locations.set(locPcCov.id, locPcCov);
    this.locations.set(locTenantB.id, locTenantB);

    // Seed Subscriptions
    this.subscriptions.set(bizIdo.id, {
      business_id: bizIdo.id,
      plan: 'pro',
      status: 'ACTIVE',
      price_cents: 29900,
      overrides: {}
    });
    this.subscriptions.set(bizProper.id, {
      business_id: bizProper.id,
      plan: 'growth',
      status: 'ACTIVE',
      price_cents: 14900,
      overrides: {}
    });
    this.subscriptions.set(bizTenantB.id, {
      business_id: bizTenantB.id,
      plan: 'essentials',
      status: 'ACTIVE',
      price_cents: 7900,
      overrides: {}
    });
    this.subscriptions.set(bizComped.id, {
      business_id: bizComped.id,
      plan: 'comped',
      status: 'ACTIVE',
      price_cents: 0,
      overrides: {}
    });

    // Seed Staff Members
    const staff1 = {
      id: 'staff_1',
      business_id: bizIdo.id,
      location_id: locIdoBr.id,
      name: 'Claire Dupont',
      email: 'claire@idobridal.com',
      role: 'stylist',
      status: 'ACTIVE',
      commission_rate: 0.10
    };
    const staff2 = {
      id: 'staff_2',
      business_id: bizIdo.id,
      location_id: locIdoCov.id,
      name: 'Sophie Martin',
      email: 'sophie@idobridal.com',
      role: 'stylist',
      status: 'ACTIVE',
      commission_rate: 0.10
    };
    const staffManager = {
      id: 'staff_mgr',
      business_id: bizIdo.id,
      location_id: locIdoBr.id,
      name: 'Emma Watson',
      email: 'emma@idobridal.com',
      role: 'manager',
      status: 'ACTIVE',
      commission_rate: 0.05
    };
    const staffOwner = {
      id: 'staff_owner',
      business_id: bizIdo.id,
      location_id: locIdoBr.id,
      name: 'Ramona Roberts',
      email: 'ramona@robertsenterprises.com',
      role: 'owner',
      status: 'ACTIVE',
      commission_rate: 0.00
    };

    this.staff.set(staff1.id, staff1);
    this.staff.set(staff2.id, staff2);
    this.staff.set(staffManager.id, staffManager);
    this.staff.set(staffOwner.id, staffOwner);

    // Memberships
    this.memberships.set('user_owner', { user_id: 'user_owner', business_id: bizIdo.id, role: 'OWNER', status: 'ACTIVE' });
    this.memberships.set('user_admin', { user_id: 'user_admin', business_id: bizIdo.id, role: 'ADMIN', status: 'ACTIVE' });
    this.memberships.set('user_manager', { user_id: 'user_manager', business_id: bizIdo.id, role: 'MANAGER', status: 'ACTIVE' });
    this.memberships.set('user_stylist', { user_id: 'user_stylist', business_id: bizIdo.id, role: 'STYLIST', status: 'ACTIVE' });
    this.memberships.set('user_tenant_b', { user_id: 'user_tenant_b', business_id: bizTenantB.id, role: 'OWNER', status: 'ACTIVE' });
    this.memberships.set('user_platform_admin', { user_id: 'user_platform_admin', business_id: bizComped.id, role: 'SUPER_ADMIN', is_platform_admin: true, status: 'ACTIVE' });

    // Seed Sample Gown
    const gown1 = {
      id: 'gown_monique_1',
      business_id: bizIdo.id,
      brand_id: brandIdo.id,
      style_name: 'Monique Lhuillier Versailles',
      designer: 'Monique Lhuillier',
      sku: 'ML-VER-001',
      cost_cents: 250000,
      msrp_cents: 650000,
      stock_by_location: {
        'ido-br': 3,
        'ido-cov': 1
      },
      created_at: new Date().toISOString()
    };
    this.gowns.set(gown1.id, gown1);
  }
}

/**
 * Entitlement Engine
 */
export class EntitlementEngine {
  static PLAN_RANKS = {
    essentials: 1,
    growth: 2,
    pro: 3,
    enterprise: 4,
    comped: 99
  };

  static FEATURE_MIN_PLANS = {
    'appointments.basic': 'essentials',
    'appointments.ai_matching': 'growth',
    'customers.dossier': 'essentials',
    'customers.preferences': 'essentials',
    'customers.try_on': 'growth',
    'sales.invoicing': 'essentials',
    'sales.pos_terminal': 'growth',
    'sales.commissions': 'pro',
    'inventory.stock': 'essentials',
    'inventory.pos': 'growth',
    'inventory.transfers': 'pro',
    'inventory.smart_po': 'enterprise',
    'team.directory': 'essentials',
    'team.timeclock': 'growth',
    'team.scheduling': 'growth',
    'growth.leads': 'growth',
    'growth.attribution': 'pro',
    'growth.marketing_ai': 'enterprise',
    'growth.seo_audit': 'pro',
    'integrations.shopify': 'growth',
    'integrations.twilio': 'growth',
    'reports.standard': 'essentials',
    'reports.custom_builder': 'pro',
    'platform.dlq_management': 'enterprise'
  };

  static evaluate(store, businessId, featureKey, userRole = 'owner') {
    const biz = store.businesses.get(businessId);
    if (!biz) {
      return { allowed: false, reason: 'Business not found', state: 'BLOCKED' };
    }

    if (biz.subscription_status === 'CANCELED' || biz.subscription_status === 'PAST_DUE') {
      return { allowed: false, reason: `Subscription is ${biz.subscription_status}`, state: 'SUBSCRIPTION_LOCKED' };
    }

    // 1. Check Platform Override
    const override = store.featureOverrides.get(`${businessId}:${featureKey}`);
    if (override === 'FORCED_OFF') {
      return { allowed: false, reason: 'Platform forced off', state: 'PLATFORM_DISABLED' };
    }
    if (override === 'FORCED_ON') {
      return { allowed: true, reason: 'Platform forced on override', state: 'OVERRIDE_ENABLED' };
    }

    // 2. Check Module Preferences
    const moduleKey = featureKey.split('.')[0];
    const modulePref = store.modulePreferences.get(`${businessId}:${moduleKey}`);
    if (modulePref === false) {
      return { allowed: false, reason: 'Module disabled by organization preference', state: 'MODULE_DISABLED' };
    }

    // 3. Check Subscription Tier
    const sub = store.subscriptions.get(businessId);
    const currentPlan = (sub?.plan || 'essentials').toLowerCase();

    if (currentPlan === 'comped') {
      return { allowed: true, reason: 'Comped plan has access to all features', state: 'ACTIVE' };
    }

    const minPlan = this.FEATURE_MIN_PLANS[featureKey] || 'essentials';
    const currentRank = this.PLAN_RANKS[currentPlan] || 1;
    const requiredRank = this.PLAN_RANKS[minPlan] || 1;

    if (currentRank < requiredRank) {
      return {
        allowed: false,
        reason: `Feature requires ${minPlan} plan, but business is on ${currentPlan}`,
        state: 'PLAN_LOCKED',
        minimumPlan: minPlan,
        currentPlan
      };
    }

    return { allowed: true, state: 'ACTIVE' };
  }
}

/**
 * Crypto Helper Utilities
 */
export class CryptoHelper {
  static generateShopifyHmac(body, secret) {
    const raw = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    return crypto.createHmac('sha256', secret).update(raw).digest('base64');
  }

  static verifyShopifyHmac(body, hmacHeader, secret) {
    if (!hmacHeader) return false;
    const expected = this.generateShopifyHmac(body, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  static generateSignedOAuthState(payload, secret) {
    const jsonStr = JSON.stringify(payload);
    const b64 = Buffer.from(jsonStr).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(b64).digest('hex');
    return `${b64}.${sig}`;
  }

  static verifySignedOAuthState(stateStr, secret) {
    if (!stateStr || typeof stateStr !== 'string') return { valid: false };
    const parts = stateStr.split('.');
    if (parts.length !== 2) return { valid: false };
    const [b64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('hex');
    try {
      const match = crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'));
      if (!match) return { valid: false };
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  static generateTwilioSignature(url, params, authToken) {
    const keys = Object.keys(params).sort();
    let data = url;
    for (const key of keys) {
      data += key + params[key];
    }
    return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64');
  }

  static verifyTwilioSignature(url, params, signature, authToken) {
    if (!signature) return false;
    const expected = this.generateTwilioSignature(url, params, authToken);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }
}

/**
 * In-Memory HTTP Server for E2E Tests
 */
export class VowosTestServer {
  constructor(options = {}) {
    this.store = options.store || new VowosInMemoryStore();
    this.shopifySecret = options.shopifySecret || 'test_shopify_secret_123';
    this.twilioAuthToken = options.twilioAuthToken || 'test_twilio_auth_token_456';
    this.oauthSecret = options.oauthSecret || 'test_supabase_service_role_key_789';
    this.server = null;
    this.port = 0;
    this.baseUrl = '';
  }

  async start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        this.baseUrl = `http://127.0.0.1:${this.port}`;
        resolve(this);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        if (typeof this.server.closeAllConnections === 'function') {
          this.server.closeAllConnections();
        }
        this.server.close(() => {
          setTimeout(resolve, 50);
        });
      } else {
        resolve();
      }
    });
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, this.baseUrl);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Collect Body
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const rawBody = Buffer.concat(chunks);
      const rawBodyString = rawBody.toString('utf8');
      let jsonBody = null;
      let formBody = {};

      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json') && rawBodyString.trim()) {
        try {
          jsonBody = JSON.parse(rawBodyString);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
          return;
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const searchParams = new URLSearchParams(rawBodyString);
        for (const [k, v] of searchParams.entries()) {
          formBody[k] = v;
        }
      }

      // Context Extraction
      const authHeader = req.headers['authorization'] || '';
      const userRole = req.headers['x-user-role'] || 'owner';
      const tenantHeader = req.headers['x-business-id'];
      let businessId = tenantHeader || 'biz_ido_bridal';

      // 1. GET /api/health
      if (method === 'GET' && pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'vowos-worker', timestamp: new Date().toISOString() }));
        return;
      }

      // 2. GET /api/tenant-config
      if (method === 'GET' && pathname === '/api/tenant-config') {
        const mode = parsedUrl.searchParams.get('mode');
        const biz = this.store.businesses.get(businessId);
        if (!biz) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Tenant not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          supabaseUrl: 'https://test-vowos.supabase.co',
          supabaseAnonKey: 'anon-key-test',
          brand: { name: biz.name, slug: biz.slug, primary_color: '#D4AF37' },
          mode: mode || 'production'
        }));
        return;
      }

      // 3. POST /api/platform/organizations (Tenant Provisioning RPC)
      if (method === 'POST' && pathname === '/api/platform/organizations') {
        if (!authHeader.includes('Bearer ') && !req.headers['x-platform-admin']) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized platform access' }));
          return;
        }
        const { orgName, orgSlug, ownerEmail, brandName, locationName, city } = jsonBody || {};
        if (!orgName || !orgSlug) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Organization name and slug are required' }));
          return;
        }
        // Check unique slug
        for (const b of this.store.businesses.values()) {
          if (b.slug === orgSlug) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Slug ${orgSlug} already in use` }));
            return;
          }
        }
        const newBizId = `biz_${crypto.randomUUID()}`;
        const newBrandId = `brand_${crypto.randomUUID()}`;
        const newLocId = `loc_${crypto.randomUUID()}`;

        const newBiz = { id: newBizId, name: orgName, slug: orgSlug, organization_type: 'boutique', subscription_status: 'ACTIVE', onboarding_status: 'COMPLETED', created_at: new Date().toISOString() };
        const newBrand = { id: newBrandId, business_id: newBizId, name: brandName || orgName, slug: orgSlug, brand_colors: { primary: '#000000' } };
        const newLoc = { id: newLocId, business_id: newBizId, brand_id: newBrandId, name: locationName || `${orgName} Main`, city: city || 'New Orleans' };

        this.store.businesses.set(newBizId, newBiz);
        this.store.brands.set(newBrandId, newBrand);
        this.store.locations.set(newLocId, newLoc);
        this.store.subscriptions.set(newBizId, { business_id: newBizId, plan: 'growth', status: 'ACTIVE', price_cents: 14900 });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, businessId: newBizId, brandId: newBrandId, locationId: newLocId }));
        return;
      }

      // 4. POST /api/campaigns/pause-all (Emergency Pause All Campaigns)
      if (method === 'POST' && pathname === '/api/campaigns/pause-all') {
        const { brand } = jsonBody || {};
        if (!brand) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Brand required' }));
          return;
        }
        const jobId = crypto.randomUUID();
        const job = {
          id: jobId,
          business_id: businessId,
          queue_name: 'emergency_pause_all',
          payload: { brand },
          status: 'pending',
          attempts: 0,
          max_attempts: 5,
          created_at: new Date().toISOString(),
          next_retry_at: new Date().toISOString()
        };
        this.store.durableJobs.set(jobId, job);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobId, message: 'Emergency pause queued successfully' }));
        return;
      }

      // 5. POST /api/platform/jobs/:id/retry (DLQ Manual Retry)
      if (method === 'POST' && pathname.startsWith('/api/platform/jobs/') && pathname.endsWith('/retry')) {
        const jobId = pathname.split('/')[4];
        const job = this.store.durableJobs.get(jobId);
        if (!job) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Job with ID ${jobId} not found` }));
          return;
        }
        job.status = 'pending';
        job.attempts = 0;
        job.locked_at = null;
        job.locked_by = null;
        job.error_message = null;
        job.next_retry_at = new Date().toISOString();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, job }));
        return;
      }

      // 6. GET /api/platform/jobs
      if (method === 'GET' && pathname === '/api/platform/jobs') {
        const jobs = Array.from(this.store.durableJobs.values());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jobs, total: jobs.length }));
        return;
      }

      // 7. GET /api/growth/connect/:provider (Google/Meta OAuth Connect)
      if (method === 'GET' && pathname.startsWith('/api/growth/connect/')) {
        const provider = pathname.split('/').pop();
        const requestedBiz = parsedUrl.searchParams.get('businessId') || businessId;
        if (requestedBiz !== businessId && requestedBiz !== 'biz_ido_bridal') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Requested business does not match your membership.' }));
          return;
        }
        const state = CryptoHelper.generateSignedOAuthState({ businessId, provider }, this.oauthSecret);
        const consentUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=google_client_id&response_type=code&scope=https://www.googleapis.com/auth/webmasters.readonly&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: consentUrl, state }));
        return;
      }

      // 8. GET /api/growth/callback (OAuth Callback)
      if (method === 'GET' && pathname === '/api/growth/callback') {
        const stateParam = parsedUrl.searchParams.get('state');
        const code = parsedUrl.searchParams.get('code');
        if (!stateParam || !code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid state or missing code.' }));
          return;
        }
        const verified = CryptoHelper.verifySignedOAuthState(stateParam, this.oauthSecret);
        if (!verified.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid state.' }));
          return;
        }
        res.writeHead(302, { Location: `/growth?connected=1&provider=${verified.payload.provider}` });
        res.end();
        return;
      }

      // 9. POST /api/growth/track (Public Attribution Pixel)
      if (method === 'POST' && pathname === '/api/growth/track') {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const currentCount = (this.store.rateLimiters.get(`track:${ip}`) || 0) + 1;
        this.store.rateLimiters.set(`track:${ip}`, currentCount);
        if (currentCount > 120) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }));
          return;
        }

        const { businessId: targetBizId, sessionId, source, medium, campaign } = jsonBody || {};
        if (!targetBizId || !this.store.businesses.has(targetBizId)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Business not found' }));
          return;
        }

        let channel = 'Direct';
        if (source === 'google' && medium === 'cpc') channel = 'Google Search';
        else if (source === 'facebook' || source === 'meta' || source === 'instagram') channel = 'Meta';
        else if (source === 'theknot') channel = 'The Knot';

        const touchpointId = crypto.randomUUID();
        this.store.attributionTouchpoints.set(touchpointId, {
          id: touchpointId,
          business_id: targetBizId,
          session_id: sessionId,
          source,
          medium,
          campaign,
          channel,
          created_at: new Date().toISOString()
        });

        res.writeHead(204);
        res.end();
        return;
      }

      // 10. POST /api/growth/track/identify (Attribution Lead Linking)
      if (method === 'POST' && pathname === '/api/growth/track/identify') {
        const { businessId: targetBizId, sessionId, leadId, customerId } = jsonBody || {};
        let updatedCount = 0;
        for (const tp of this.store.attributionTouchpoints.values()) {
          if (tp.business_id === targetBizId && tp.session_id === sessionId) {
            tp.lead_id = leadId;
            tp.customer_id = customerId;
            updatedCount++;
          }
        }
        res.writeHead(204);
        res.end();
        return;
      }

      // 11. POST /api/growth/sync/meta-ads
      if (method === 'POST' && pathname === '/api/growth/sync/meta-ads') {
        if (userRole === 'stylist' || userRole === 'staff') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Growth tools require an Owner, Admin, or Manager role.' }));
          return;
        }
        const campId = crypto.randomUUID();
        this.store.marketingCampaigns.set(campId, {
          id: campId,
          business_id: businessId,
          name: 'Spring Bridal Showcase',
          channel: 'Meta',
          spend_cents: 45000,
          impressions: 12000,
          clicks: 340,
          conversions: 18
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, adAccounts: ['act_123456'], recordsWritten: 12, spendDays: 30 }));
        return;
      }

      // 12. POST /api/shopify/webhooks/orders/create
      if (method === 'POST' && pathname === '/api/shopify/webhooks/orders/create') {
        const hmac = req.headers['x-shopify-hmac-sha256'];
        if (!hmac) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing X-Shopify-Hmac-Sha256 header' }));
          return;
        }
        const isValid = CryptoHelper.verifyShopifyHmac(rawBody, hmac, this.shopifySecret);
        if (!isValid) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid HMAC signature' }));
          return;
        }

        const order = jsonBody;
        if (!order || !order.customer) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'Ignored: Not an order with a customer' }));
          return;
        }

        // Idempotency check
        const orderKey = `shopify_order_${order.id}`;
        if (this.store.processedWebhooks.has(orderKey)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Already processed (idempotent)' }));
          return;
        }
        this.store.processedWebhooks.add(orderKey);

        // Store / Brand routing
        let targetBiz = 'biz_ido_bridal';
        let storeProp = '';
        if (order.line_items && order.line_items[0]?.properties) {
          const p = order.line_items[0].properties.find(x => x.name === 'Store' || x.name === 'Location');
          if (p) storeProp = p.value;
        }
        if (storeProp.startsWith('pc-') || storeProp.toLowerCase().includes('proper')) {
          targetBiz = 'biz_proper_co';
        }

        // Upsert customer
        const custId = `cust_${crypto.randomUUID()}`;
        const cust = {
          id: custId,
          business_id: targetBiz,
          name: `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Valued Bride',
          email: order.customer.email,
          phone: order.customer.phone || '+12255550199',
          spend_cents: Math.round(parseFloat(order.total_price || '0') * 100),
          sms_opt_in: true,
          created_at: new Date().toISOString()
        };
        this.store.customers.set(custId, cust);

        // Insert lead
        const leadId = `lead_${crypto.randomUUID()}`;
        this.store.leads.set(leadId, {
          id: leadId,
          business_id: targetBiz,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          source: 'Shopify Storefront',
          budget_cents: 300000,
          wedding_date: '2026-10-24',
          stage: 'Appointment Set',
          ai_priority_score: 94
        });

        // Insert appointment request
        const reqId = `appreq_${crypto.randomUUID()}`;
        this.store.appointmentRequests.set(reqId, {
          id: reqId,
          customer_id: custId,
          business_id: targetBiz,
          intake_source: 'Shopify Storefront',
          preferred_date_1: '2026-09-15',
          preferred_window_1: 'morning',
          status: 'submitted',
          notes: `Bridal Appointment from Shopify order #${order.id}`
        });

        // Log message
        const msgId = `msg_${crypto.randomUUID()}`;
        this.store.messages.set(msgId, {
          id: msgId,
          business_id: targetBiz,
          customer_id: custId,
          sender: 'Business',
          content: `Hi ${cust.name}, thank you for your order! We received your appointment request.`,
          channel: 'sms',
          direction: 'outbound',
          status: 'sent',
          sent_at: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, customerId: custId, leadId, appointmentRequestId: reqId, businessId: targetBiz }));
        return;
      }

      // 13. POST /api/communications/send-sms
      if (method === 'POST' && pathname === '/api/communications/send-sms') {
        const { customerId, message, businessId: targetBiz } = jsonBody || {};
        const cust = this.store.customers.get(customerId);
        if (!cust) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Customer not found' }));
          return;
        }
        if (!cust.phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Customer does not have a phone number' }));
          return;
        }
        if (!cust.sms_opt_in) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Customer has not opted in to SMS' }));
          return;
        }
        if (!message || !message.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message content cannot be empty' }));
          return;
        }

        const msgId = `SM_${crypto.randomUUID()}`;
        this.store.messages.set(msgId, {
          id: msgId,
          business_id: targetBiz || cust.business_id,
          customer_id: cust.id,
          sender: 'Business',
          content: message,
          channel: 'sms',
          direction: 'outbound',
          status: 'sent',
          external_id: msgId,
          sent_at: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, messageId: msgId }));
        return;
      }

      // 14. POST /api/communications/twilio-webhook
      if (method === 'POST' && pathname === '/api/communications/twilio-webhook') {
        const sig = req.headers['x-twilio-signature'];
        const fullUrl = `${this.baseUrl}${req.url}`;
        if (sig) {
          const valid = CryptoHelper.verifyTwilioSignature(fullUrl, formBody, sig, this.twilioAuthToken);
          if (!valid) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden: Invalid Twilio Signature');
            return;
          }
        }

        const { From, To, Body, MessageSid } = formBody;
        if (!From || !Body) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Missing From or Body');
          return;
        }

        // Find or create customer
        let cust = null;
        for (const c of this.store.customers.values()) {
          if (c.phone === From) {
            cust = c;
            break;
          }
        }
        if (!cust) {
          const newCustId = `cust_${crypto.randomUUID()}`;
          cust = {
            id: newCustId,
            business_id: 'biz_ido_bridal',
            name: `Bride ${From.slice(-4)}`,
            email: `bride_${From.replace(/\D/g, '')}@example.com`,
            phone: From,
            sms_opt_in: true,
            created_at: new Date().toISOString()
          };
          this.store.customers.set(newCustId, cust);
        }

        // Log inbound message
        const msgId = MessageSid || `msg_${crypto.randomUUID()}`;
        this.store.messages.set(msgId, {
          id: msgId,
          business_id: cust.business_id,
          customer_id: cust.id,
          sender: 'Customer',
          content: Body,
          channel: 'sms',
          direction: 'inbound',
          status: 'received',
          external_id: MessageSid || msgId,
          sent_at: new Date().toISOString()
        });

        // If body is YES / CONFIRM, confirm customer's pending appointment
        if (Body.trim().toUpperCase() === 'YES' || Body.trim().toUpperCase() === 'CONFIRM') {
          for (const apt of this.store.appointments.values()) {
            if (apt.customer_id === cust.id && apt.status === 'booked') {
              apt.status = 'confirmed';
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }

      // 15. POST /api/scheduling/public/book
      if (method === 'POST' && pathname === '/api/scheduling/public/book') {
        const { name, email, phone, weddingDate, store: storeKey, date, time } = jsonBody || {};
        if (!name || !email || !date) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name, email, and date are required' }));
          return;
        }

        // Check if date is in past
        const bookDate = new Date(`${date}T12:00:00Z`);
        if (bookDate < new Date('2026-01-01T00:00:00Z')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot book appointment in the past' }));
          return;
        }

        let targetBiz = 'biz_ido_bridal';
        if (storeKey?.startsWith('pc-') || storeKey?.toLowerCase().includes('proper')) {
          targetBiz = 'biz_proper_co';
        }

        const custId = `cust_${crypto.randomUUID()}`;
        this.store.customers.set(custId, {
          id: custId,
          business_id: targetBiz,
          name,
          email,
          phone: phone || '+12255550199',
          wedding_date: weddingDate || '2026-11-14',
          sms_opt_in: true,
          created_at: new Date().toISOString()
        });

        const reqId = `appreq_${crypto.randomUUID()}`;
        this.store.appointmentRequests.set(reqId, {
          id: reqId,
          customer_id: custId,
          business_id: targetBiz,
          store: storeKey || 'ido-br',
          preferred_date_1: date,
          preferred_window_1: time || '10:00 AM',
          status: 'submitted',
          intake_source: 'Online Public Booking'
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, requestId: reqId, customerId: custId, businessId: targetBiz, store: storeKey || 'ido-br', date, time }));
        return;
      }

      // Default Fallback
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Route ${method} ${pathname} not found` }));
    });
  }

  // Background Job Processing Simulation
  runPendingJobs() {
    const jobs = Array.from(this.store.durableJobs.values()).filter(j => j.status === 'pending');
    for (const job of jobs) {
      job.status = 'running';
      job.locked_at = new Date().toISOString();
      job.locked_by = `worker-${process.pid}`;
      job.attempts = (job.attempts || 0) + 1;

      if (job.payload?.simulateFailure) {
        if (job.attempts >= (job.max_attempts || 5)) {
          job.status = 'dead-letter';
          job.error_message = job.payload.failureMessage || 'Job failed maximum retries';
          job.locked_at = null;
          job.locked_by = null;
        } else {
          job.status = 'pending';
          const delaySec = Math.pow(2, job.attempts) * 10;
          job.next_retry_at = new Date(Date.now() + delaySec * 1000).toISOString();
          job.error_message = job.payload.failureMessage || 'Transient processing failure';
          job.locked_at = null;
          job.locked_by = null;
        }
      } else {
        // Success
        job.status = 'completed';
        job.locked_at = null;
        job.locked_by = null;
      }
    }
  }
}
