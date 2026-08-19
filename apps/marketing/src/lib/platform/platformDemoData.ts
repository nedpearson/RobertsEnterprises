/**
 * Platform-plane synthetic dataset.
 *
 * WHY THIS EXISTS
 * ---------------
 * Five Platform views (Failed Jobs, Incidents, Integrations, System Health,
 * Release Dashboard) shipped with state initialised to `[]` and no loader —
 * `IncidentsView` never called `setIncidents` at all, and
 * `IntegrationsHealthView` did not even destructure a setter. They could not
 * render a row under any circumstance. This module gives the Platform console a
 * real dataset to exercise those surfaces before VowOS has a customer fleet.
 *
 * ISOLATION CONTRACT (see PLATFORM demo plane in platformDataSource.ts)
 * --------------------------------------------------------------------
 * This data is ONLY served when the Platform demo plane is explicitly active,
 * and every surface that renders it also renders a persistent banner. It must
 * never be summed into real MRR/ARR, churn, SLA, or health. A number a Platform
 * Owner cannot distinguish from production is worse than no number.
 */

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
const inHours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000).toISOString();

export type LifecycleStage =
  | 'TRIAL' | 'IMPLEMENTATION' | 'READY_TO_GO_LIVE' | 'LIVE'
  | 'AT_RISK' | 'PAST_DUE' | 'SUSPENDED' | 'INTERNAL';

export interface DemoOrganization {
  id: string;
  name: string;
  slug: string;
  tenantDomain: string;
  lifecycle: LifecycleStage;
  operationalStatus: 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED' | 'SECURITY_LOCK';
  onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  onboardingPct: number;
  plan: string;
  billingInterval: 'MONTHLY' | 'ANNUAL';
  mrrCents: number;          // 0 for internal/comped — excluded from paying MRR
  comped: boolean;
  internal: boolean;
  businesses: { id: string; name: string; locations: { id: string; name: string; city: string }[] }[];
  userCount: number;
  openTickets: number;
  integrationHealth: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'NOT_CONNECTED';
  createdAt: string;
  lastActivityAt: string;
  csOwner: string;
}

export const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    id: 'org-roberts', name: 'Roberts Enterprises', slug: 'roberts-enterprises',
    tenantDomain: 'roberts-enterprises.vowos.bridgebox.ai',
    lifecycle: 'INTERNAL', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Enterprise (Internal)', billingInterval: 'ANNUAL', mrrCents: 0, comped: true, internal: true,
    businesses: [
      { id: 'biz-ido', name: 'I Do Bridal Couture', locations: [
        { id: 'loc-ido-br', name: 'Baton Rouge', city: 'Baton Rouge, LA' },
        { id: 'loc-ido-cov', name: 'Covington', city: 'Covington, LA' },
      ]},
      { id: 'biz-proper', name: 'Proper & Co.', locations: [
        { id: 'loc-pc-br', name: 'Perkins Rowe', city: 'Baton Rouge, LA' },
      ]},
    ],
    userCount: 14, openTickets: 0, integrationHealth: 'HEALTHY',
    createdAt: daysAgo(420), lastActivityAt: hoursAgo(2), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-magnolia', name: 'Magnolia Bridal Group', slug: 'magnolia-bridal',
    tenantDomain: 'magnolia-bridal.vowos.bridgebox.ai',
    lifecycle: 'LIVE', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Growth', billingInterval: 'MONTHLY', mrrCents: 44900, comped: false, internal: false,
    businesses: [{ id: 'biz-mag', name: 'Magnolia Bridal', locations: [
      { id: 'loc-mag-dt', name: 'Downtown', city: 'Charleston, SC' },
      { id: 'loc-mag-mp', name: 'Mount Pleasant', city: 'Mt Pleasant, SC' },
    ]}],
    userCount: 11, openTickets: 1, integrationHealth: 'HEALTHY',
    createdAt: daysAgo(190), lastActivityAt: hoursAgo(1), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-everly', name: 'Everly & Ash', slug: 'everly-ash',
    tenantDomain: 'everly-ash.vowos.bridgebox.ai',
    lifecycle: 'LIVE', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Essentials', billingInterval: 'MONTHLY', mrrCents: 19900, comped: false, internal: false,
    businesses: [{ id: 'biz-everly', name: 'Everly & Ash Bridal', locations: [
      { id: 'loc-everly', name: 'Flagship', city: 'Nashville, TN' },
    ]}],
    userCount: 5, openTickets: 0, integrationHealth: 'HEALTHY',
    createdAt: daysAgo(150), lastActivityAt: hoursAgo(6), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-lumiere', name: 'Lumière Formalwear', slug: 'lumiere-formalwear',
    tenantDomain: 'lumiere-formalwear.vowos.bridgebox.ai',
    lifecycle: 'AT_RISK', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Growth', billingInterval: 'MONTHLY', mrrCents: 44900, comped: false, internal: false,
    businesses: [{ id: 'biz-lum', name: 'Lumière', locations: [
      { id: 'loc-lum-a', name: 'Uptown', city: 'Dallas, TX' },
      { id: 'loc-lum-b', name: 'Southlake', city: 'Southlake, TX' },
    ]}],
    userCount: 9, openTickets: 4, integrationHealth: 'FAILED',
    createdAt: daysAgo(240), lastActivityAt: daysAgo(9), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-saintclair', name: 'Saint Clair Bridal', slug: 'saint-clair',
    tenantDomain: 'saint-clair.vowos.bridgebox.ai',
    lifecycle: 'PAST_DUE', operationalStatus: 'READ_ONLY', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Essentials', billingInterval: 'MONTHLY', mrrCents: 19900, comped: false, internal: false,
    businesses: [{ id: 'biz-sc', name: 'Saint Clair', locations: [
      { id: 'loc-sc', name: 'Main Street', city: 'Savannah, GA' },
    ]}],
    userCount: 4, openTickets: 2, integrationHealth: 'DEGRADED',
    createdAt: daysAgo(300), lastActivityAt: daysAgo(3), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-veil', name: 'The Veil Room', slug: 'veil-room',
    tenantDomain: 'veil-room.vowos.bridgebox.ai',
    lifecycle: 'IMPLEMENTATION', operationalStatus: 'ACTIVE', onboardingStatus: 'IN_PROGRESS', onboardingPct: 62,
    plan: 'Growth', billingInterval: 'ANNUAL', mrrCents: 40410, comped: false, internal: false,
    businesses: [{ id: 'biz-veil', name: 'The Veil Room', locations: [
      { id: 'loc-veil', name: 'Design District', city: 'Atlanta, GA' },
    ]}],
    userCount: 6, openTickets: 1, integrationHealth: 'NOT_CONNECTED',
    createdAt: daysAgo(24), lastActivityAt: hoursAgo(20), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-ivory', name: 'Ivory Lane Bridal', slug: 'ivory-lane',
    tenantDomain: 'ivory-lane.vowos.bridgebox.ai',
    lifecycle: 'READY_TO_GO_LIVE', operationalStatus: 'ACTIVE', onboardingStatus: 'IN_PROGRESS', onboardingPct: 94,
    plan: 'Essentials', billingInterval: 'MONTHLY', mrrCents: 19900, comped: false, internal: false,
    businesses: [{ id: 'biz-ivory', name: 'Ivory Lane', locations: [
      { id: 'loc-ivory', name: 'Riverside', city: 'Greenville, SC' },
    ]}],
    userCount: 3, openTickets: 0, integrationHealth: 'HEALTHY',
    createdAt: daysAgo(18), lastActivityAt: hoursAgo(4), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-blanc', name: 'Maison Blanc', slug: 'maison-blanc',
    tenantDomain: 'maison-blanc.vowos.bridgebox.ai',
    lifecycle: 'TRIAL', operationalStatus: 'ACTIVE', onboardingStatus: 'IN_PROGRESS', onboardingPct: 35,
    plan: 'Growth (Trial)', billingInterval: 'MONTHLY', mrrCents: 0, comped: false, internal: false,
    businesses: [{ id: 'biz-blanc', name: 'Maison Blanc', locations: [
      { id: 'loc-blanc', name: 'Magazine St', city: 'New Orleans, LA' },
    ]}],
    userCount: 2, openTickets: 0, integrationHealth: 'NOT_CONNECTED',
    createdAt: daysAgo(6), lastActivityAt: hoursAgo(11), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-hemline', name: 'Hemline & Co.', slug: 'hemline-co',
    tenantDomain: 'hemline-co.vowos.bridgebox.ai',
    lifecycle: 'TRIAL', operationalStatus: 'ACTIVE', onboardingStatus: 'NOT_STARTED', onboardingPct: 8,
    plan: 'Essentials (Trial)', billingInterval: 'MONTHLY', mrrCents: 0, comped: false, internal: false,
    businesses: [{ id: 'biz-hem', name: 'Hemline', locations: [
      { id: 'loc-hem', name: 'Midtown', city: 'Memphis, TN' },
    ]}],
    userCount: 1, openTickets: 0, integrationHealth: 'NOT_CONNECTED',
    createdAt: daysAgo(3), lastActivityAt: daysAgo(2), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-abbott', name: 'Abbott Formal', slug: 'abbott-formal',
    tenantDomain: 'abbott-formal.vowos.bridgebox.ai',
    lifecycle: 'SUSPENDED', operationalStatus: 'SUSPENDED', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Essentials', billingInterval: 'MONTHLY', mrrCents: 0, comped: false, internal: false,
    businesses: [{ id: 'biz-abbott', name: 'Abbott Formal', locations: [
      { id: 'loc-abbott', name: 'Downtown', city: 'Mobile, AL' },
    ]}],
    userCount: 3, openTickets: 3, integrationHealth: 'FAILED',
    createdAt: daysAgo(390), lastActivityAt: daysAgo(41), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-rowan', name: 'Rowan Bridal House', slug: 'rowan-bridal',
    tenantDomain: 'rowan-bridal.vowos.bridgebox.ai',
    lifecycle: 'LIVE', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Growth', billingInterval: 'ANNUAL', mrrCents: 40410, comped: false, internal: false,
    businesses: [{ id: 'biz-rowan', name: 'Rowan Bridal', locations: [
      { id: 'loc-rowan-a', name: 'Highlands', city: 'Louisville, KY' },
      { id: 'loc-rowan-b', name: 'Lexington', city: 'Lexington, KY' },
      { id: 'loc-rowan-c', name: 'Cincinnati', city: 'Cincinnati, OH' },
    ]}],
    userCount: 17, openTickets: 1, integrationHealth: 'DEGRADED',
    createdAt: daysAgo(260), lastActivityAt: hoursAgo(3), csOwner: 'Ned Pearson',
  },
  {
    id: 'org-wren', name: 'Wren & Willow', slug: 'wren-willow',
    tenantDomain: 'wren-willow.vowos.bridgebox.ai',
    lifecycle: 'LIVE', operationalStatus: 'ACTIVE', onboardingStatus: 'COMPLETE', onboardingPct: 100,
    plan: 'Essentials', billingInterval: 'MONTHLY', mrrCents: 19900, comped: false, internal: false,
    businesses: [{ id: 'biz-wren', name: 'Wren & Willow', locations: [
      { id: 'loc-wren', name: 'Market Square', city: 'Knoxville, TN' },
    ]}],
    userCount: 6, openTickets: 0, integrationHealth: 'HEALTHY',
    createdAt: daysAgo(120), lastActivityAt: hoursAgo(9), csOwner: 'Ned Pearson',
  },
];

export const DEMO_FAILED_JOBS = [
  { id: 'job_8f21a', org: 'Lumière Formalwear', orgId: 'org-lumiere', type: 'shopify.orders.sync', status: 'FAILED', attempts: 5,
    lastError: 'HTTP 401 from Shopify Admin API — access token rejected (app uninstalled or scope revoked)',
    nextRetry: '—', impact: 'Online orders have not reached VowOS since ' + daysAgo(4).slice(0, 10), retrySafe: false, correlationId: 'cor_7d1e94' },
  { id: 'job_3b77c', org: 'Rowan Bridal House', orgId: 'org-rowan', type: 'growth.gbp.metrics', status: 'RETRYING', attempts: 2,
    lastError: 'Google Business Profile API quota exceeded (429)', nextRetry: inHours(2).slice(11, 16) + ' UTC',
    impact: 'Local SEO metrics stale for 2 locations', retrySafe: true, correlationId: 'cor_11ab03' },
  { id: 'job_c9e02', org: 'Saint Clair Bridal', orgId: 'org-saintclair', type: 'billing.invoice.charge', status: 'MANUAL_REVIEW', attempts: 3,
    lastError: 'Card declined — insufficient funds', nextRetry: '—',
    impact: 'Account moved to READ_ONLY after 3 failed attempts', retrySafe: false, correlationId: 'cor_55f7c1' },
  { id: 'job_1d440', org: 'Abbott Formal', orgId: 'org-abbott', type: 'messaging.sms.dispatch', status: 'FAILED', attempts: 4,
    lastError: 'Twilio 21610 — recipient has opted out of messages from this number', nextRetry: '—',
    impact: '1 appointment reminder not delivered', retrySafe: false, correlationId: 'cor_9c2280' },
  { id: 'job_6a815', org: 'The Veil Room', orgId: 'org-veil', type: 'import.bridallive.customers', status: 'RETRYING', attempts: 1,
    lastError: 'Row 1,284: required column "wedding_date" missing', nextRetry: inHours(1).slice(11, 16) + ' UTC',
    impact: 'Migration paused at 1,284 of 3,902 customers', retrySafe: true, correlationId: 'cor_402bb9' },
  { id: 'job_f0c73', org: 'Lumière Formalwear', orgId: 'org-lumiere', type: 'growth.attribution.rollup', status: 'FAILED', attempts: 6,
    lastError: 'Upstream dependency shopify.orders.sync has not succeeded — refusing to roll up partial revenue',
    nextRetry: '—', impact: 'ROAS reporting suppressed rather than shown wrong', retrySafe: true, correlationId: 'cor_7d1e94' },
];

export const DEMO_INCIDENTS = [
  { id: 'INC-2041', severity: 'SEV-2', status: 'MONITORING', title: 'Elevated Shopify webhook latency',
    affected: '3 organizations · 4 stores', started: hoursAgo(5),
    summary: 'Shopify webhook delivery p95 rose to 42s. Orders arrive but with delay. Mitigated by widening the worker pool.' },
  { id: 'INC-2040', severity: 'SEV-3', status: 'RESOLVED', title: 'Google Business Profile quota exhaustion',
    affected: '1 organization · 3 locations', started: daysAgo(2),
    summary: 'Daily GBP quota consumed by a retry storm on Rowan Bridal House. Backoff added.' },
  { id: 'INC-2039', severity: 'SEV-1', status: 'RESOLVED', title: 'Public booking pages returned 502',
    affected: 'All organizations', started: daysAgo(6),
    summary: 'A bad deploy removed the marketing route from server.js. Rolled back in 11 minutes. Post-deploy smoke now resolves redirects.' },
  { id: 'INC-2038', severity: 'SEV-2', status: 'INVESTIGATING', title: 'SMS opt-out list not syncing to reminders',
    affected: '2 organizations', started: hoursAgo(30),
    summary: 'Opt-out state is honoured at send time but not reflected in the UI, so staff re-queue messages that will never deliver.' },
];

export const DEMO_INTEGRATIONS = [
  { id: 'int-1', org: 'Magnolia Bridal Group', orgId: 'org-magnolia', provider: 'Shopify', status: 'HEALTHY',
    external: 'magnolia-bridal.myshopify.com', lastSync: hoursAgo(1), errors24h: 0, scopes: 'read_orders, read_products, write_inventory' },
  { id: 'int-2', org: 'Lumière Formalwear', orgId: 'org-lumiere', provider: 'Shopify', status: 'ACTION REQUIRED',
    external: 'lumiere-formal.myshopify.com', lastSync: daysAgo(4), errors24h: 18, scopes: 'revoked' },
  { id: 'int-3', org: 'Rowan Bridal House', orgId: 'org-rowan', provider: 'Google Business Profile', status: 'ACTION REQUIRED',
    external: '3 locations', lastSync: hoursAgo(26), errors24h: 6, scopes: 'business.manage' },
  { id: 'int-4', org: 'Magnolia Bridal Group', orgId: 'org-magnolia', provider: 'Stripe', status: 'HEALTHY',
    external: 'acct_1Nx…', lastSync: hoursAgo(2), errors24h: 0, scopes: 'charges, payouts' },
  { id: 'int-5', org: 'Everly & Ash', orgId: 'org-everly', provider: 'Google Search Console', status: 'HEALTHY',
    external: 'everlyandash.com', lastSync: hoursAgo(7), errors24h: 0, scopes: 'siteverification, webmasters.readonly' },
  { id: 'int-6', org: 'Saint Clair Bridal', orgId: 'org-saintclair', provider: 'Stripe', status: 'ACTION REQUIRED',
    external: 'acct_1Qa…', lastSync: daysAgo(3), errors24h: 3, scopes: 'charges' },
  { id: 'int-7', org: 'The Veil Room', orgId: 'org-veil', provider: 'Shopify', status: 'UNKNOWN',
    external: 'not connected', lastSync: '—', errors24h: 0, scopes: '—' },
  { id: 'int-8', org: 'Abbott Formal', orgId: 'org-abbott', provider: 'Twilio', status: 'ACTION REQUIRED',
    external: '+1 251…', lastSync: daysAgo(41), errors24h: 4, scopes: 'sms' },
];

export const DEMO_SYSTEM_HEALTH = [
  { name: 'Web (marketing + app)', status: 'OPERATIONAL', latencyMs: 118, failureRate: 0.0, lastCheck: hoursAgo(0.02), affectedOrgs: 0 },
  { name: 'Worker / API', status: 'OPERATIONAL', latencyMs: 74, failureRate: 0.001, lastCheck: hoursAgo(0.02), affectedOrgs: 0 },
  { name: 'Database (Postgres)', status: 'OPERATIONAL', latencyMs: 11, failureRate: 0.0, lastCheck: hoursAgo(0.03), affectedOrgs: 0 },
  { name: 'Supabase Auth', status: 'OPERATIONAL', latencyMs: 96, failureRate: 0.0, lastCheck: hoursAgo(0.03), affectedOrgs: 0 },
  { name: 'Background jobs', status: 'DEGRADED', latencyMs: 2400, failureRate: 0.041, lastCheck: hoursAgo(0.05), affectedOrgs: 3 },
  { name: 'Email delivery', status: 'OPERATIONAL', latencyMs: 320, failureRate: 0.002, lastCheck: hoursAgo(0.1), affectedOrgs: 0 },
  { name: 'SMS (Twilio)', status: 'DEGRADED', latencyMs: 610, failureRate: 0.028, lastCheck: hoursAgo(0.1), affectedOrgs: 2 },
  { name: 'Payments (Stripe)', status: 'OPERATIONAL', latencyMs: 240, failureRate: 0.0, lastCheck: hoursAgo(0.08), affectedOrgs: 0 },
  { name: 'Shopify sync', status: 'PARTIAL_OUTAGE', latencyMs: 42000, failureRate: 0.19, lastCheck: hoursAgo(0.05), affectedOrgs: 3 },
  { name: 'Google APIs', status: 'DEGRADED', latencyMs: 880, failureRate: 0.06, lastCheck: hoursAgo(0.07), affectedOrgs: 1 },
];

export const DEMO_RELEASES = [
  { id: 'rel-41', version: '2026.08.19', stage: 'PRODUCTION', deployedAt: hoursAgo(4), commit: '9bcf0fe', notes: 'Nine-workspace navigation, Customer 360, canonical Settings engine.', status: 'HEALTHY' },
  { id: 'rel-40', version: '2026.08.18', stage: 'PRODUCTION', deployedAt: daysAgo(1), commit: '86ce6b8', notes: 'Credential purge, 27 runtime ReferenceErrors fixed.', status: 'HEALTHY' },
  { id: 'rel-39', version: '2026.08.17', stage: 'PRODUCTION', deployedAt: daysAgo(2), commit: 'ffee340', notes: 'Booking intake, per-store attribution.', status: 'SUPERSEDED' },
  { id: 'rel-38', version: '2026.08.16', stage: 'ROLLED_BACK', deployedAt: daysAgo(3), commit: '6fc5a90', notes: 'Removed marketing.html — root served 502. Rolled back.', status: 'FAILED' },
];

/** Aggregations the Command Center needs. Paying MRR excludes internal/comped and trials. */
export function summarizeOrganizations(orgs: DemoOrganization[] = DEMO_ORGANIZATIONS) {
  const paying = orgs.filter((o) => !o.internal && !o.comped && o.mrrCents > 0);
  const mrrCents = paying.reduce((s, o) => s + o.mrrCents, 0);
  return {
    total: orgs.length,
    active: orgs.filter((o) => o.operationalStatus === 'ACTIVE').length,
    trials: orgs.filter((o) => o.lifecycle === 'TRIAL').length,
    internal: orgs.filter((o) => o.internal || o.comped).length,
    suspended: orgs.filter((o) => o.operationalStatus === 'SUSPENDED').length,
    pastDue: orgs.filter((o) => o.lifecycle === 'PAST_DUE').length,
    atRisk: orgs.filter((o) => o.lifecycle === 'AT_RISK').length,
    inOnboarding: orgs.filter((o) => o.onboardingStatus !== 'COMPLETE').length,
    users: orgs.reduce((s, o) => s + o.userCount, 0),
    locations: orgs.reduce((s, o) => s + o.businesses.reduce((b, x) => b + x.locations.length, 0), 0),
    openTickets: orgs.reduce((s, o) => s + o.openTickets, 0),
    payingCount: paying.length,
    mrrCents,
    arrCents: mrrCents * 12,
  };
}
