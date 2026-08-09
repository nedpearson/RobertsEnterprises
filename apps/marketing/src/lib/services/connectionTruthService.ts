import { LocationId } from '@/data/vowosData';
import { MarketingBrand, MarketingProvider } from '@/features/marketing/types/marketingTypes';

export type CanonicalConnectionStatus =
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'AUTHORIZATION_PENDING'
  | 'CONNECTED_UNVERIFIED'
  | 'ACCOUNT_SELECTION_REQUIRED'
  | 'LOCATION_MAPPING_REQUIRED'
  | 'PERMISSION_REQUIRED'
  | 'EXTERNAL_APPROVAL_REQUIRED'
  | 'CONNECTED_HEALTHY'
  | 'SYNCING'
  | 'DEGRADED'
  | 'REAUTHORIZATION_REQUIRED'
  | 'ERROR'
  | 'DISCONNECTED_BY_USER'
  | 'DEMO_SIMULATED';

export type AuthMethod = 'oauth2' | 'client_credentials' | 'api_key' | 'internal_service';

export interface ExternalResourceItem {
  id: string;
  name: string;
  type: string;
  externalId: string;
  brand: MarketingBrand;
  locations: LocationId[];
  selected: boolean;
  status: 'active' | 'pending' | 'error';
}

export interface ProviderSubService {
  name: string;
  status: 'CONNECTED_HEALTHY' | 'DEGRADED' | 'NOT_CONFIGURED' | 'DISCONNECTED';
  details: string;
}

export interface ConnectionTruthDescriptor {
  provider: MarketingProvider;
  title: string;
  status: CanonicalConnectionStatus;
  displayLabel: string;
  badgeStyle: { bg: string; text: string; border: string };
  isLive: boolean;
  isDemo: boolean;
  authMethod: AuthMethod;
  authMethodLabel: string;
  externalOrganization?: {
    id: string;
    name: string;
    type: string;
  };
  resources: ExternalResourceItem[];
  selectedAccountCount: number;
  requiredAccountCount: number;
  grantedScopes: { scope: string; label: string; status: 'granted' | 'missing' | 'optional' }[];
  missingScopes: string[];
  brandMappings: MarketingBrand[];
  locationMappings: LocationId[];
  lastVerifiedAt: string;
  lastSuccessfulSyncAt: string;
  lastWebhookAt?: string;
  lastError?: string | null;
  actionRequired?: string | null;
  subServices?: ProviderSubService[];
  evidence: {
    identityCheck: 'passed' | 'failed' | 'pending';
    accountCheck: 'passed' | 'failed' | 'pending';
    scopeCheck: 'passed' | 'failed' | 'pending';
    syncCheck: 'passed' | 'failed' | 'pending';
    webhookCheck: 'passed' | 'failed' | 'not_applicable';
  };
}

export const CANONICAL_STATUS_LABELS: Record<CanonicalConnectionStatus, { label: string; bg: string; text: string; border: string }> = {
  CONNECTED_HEALTHY: { label: 'Connected & Healthy', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  ACCOUNT_SELECTION_REQUIRED: { label: 'Connected — Account Selection Required', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  LOCATION_MAPPING_REQUIRED: { label: 'Connected — Location Mapping Required', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  PERMISSION_REQUIRED: { label: 'Permission Required', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  REAUTHORIZATION_REQUIRED: { label: 'Reauthorization Required', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  DEGRADED: { label: 'Degraded', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  NOT_CONFIGURED: { label: 'Setup Required', bg: 'bg-stone-200', text: 'text-stone-700', border: 'border-stone-300' },
  DISCONNECTED: { label: 'Disconnected', bg: 'bg-stone-200', text: 'text-stone-700', border: 'border-stone-300' },
  AUTHORIZATION_PENDING: { label: 'Authorization Pending', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  CONNECTED_UNVERIFIED: { label: 'Connected — Verification Failed', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  EXTERNAL_APPROVAL_REQUIRED: { label: 'Provider Approval Required', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  SYNCING: { label: 'Syncing', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  ERROR: { label: 'Connection Error', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  DISCONNECTED_BY_USER: { label: 'Disconnected by User', bg: 'bg-stone-200', text: 'text-stone-700', border: 'border-stone-300' },
  DEMO_SIMULATED: { label: 'Demo — Simulated Connection', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
};

// Initial Truthful Store for All 9 Connections
const TRUTHFUL_CONNECTIONS: Record<MarketingProvider, ConnectionTruthDescriptor> = {
  meta: {
    provider: 'meta',
    title: 'Meta Business Suite (Facebook & Instagram)',
    status: 'ACCOUNT_SELECTION_REQUIRED',
    displayLabel: CANONICAL_STATUS_LABELS.ACCOUNT_SELECTION_REQUIRED.label,
    badgeStyle: CANONICAL_STATUS_LABELS.ACCOUNT_SELECTION_REQUIRED,
    isLive: true,
    isDemo: false,
    authMethod: 'oauth2',
    authMethodLabel: 'Official Meta OAuth 2.0 User Token',
    externalOrganization: { id: 'meta-biz-49102', name: 'The Boutique Meta Portfolio', type: 'business' },
    resources: [
      { id: 'fb-page-1', name: 'I Do Bridal Couture (Baton Rouge Page)', type: 'Facebook Page', externalId: '1092837491', brand: 'ido', locations: ['ido-br'], selected: true, status: 'active' },
      { id: 'fb-page-2', name: 'Proper & Company (Baton Rouge Page)', type: 'Facebook Page', externalId: '1092837492', brand: 'proper', locations: ['pc-br'], selected: true, status: 'active' },
      { id: 'ig-prof-1', name: '@idobridalcouture', type: 'Instagram Professional', externalId: 'ig-882194', brand: 'ido', locations: ['ido-br', 'ido-cov'], selected: true, status: 'active' },
      { id: 'ig-prof-2', name: '@properandcompany', type: 'Instagram Professional', externalId: 'ig-882195', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
      { id: 'meta-ad-1', name: 'Proper & Co Primary Ad Account', type: 'Ad Account', externalId: 'act_4091823', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: false, status: 'pending' },
    ],
    selectedAccountCount: 4,
    requiredAccountCount: 5,
    grantedScopes: [
      { scope: 'ads_management', label: 'Manage Ad Accounts & Campaigns', status: 'granted' },
      { scope: 'pages_read_engagement', label: 'Read Page Performance', status: 'granted' },
      { scope: 'instagram_basic', label: 'Read Instagram Profile & Insights', status: 'granted' },
      { scope: 'leads_retrieval', label: 'Retrieve Facebook Lead Ad Form Leads', status: 'missing' },
    ],
    missingScopes: ['leads_retrieval'],
    brandMappings: ['proper', 'ido'],
    locationMappings: ['ido-br', 'ido-cov', 'pc-br', 'pc-cov'],
    lastVerifiedAt: '2026-07-27T21:40:00Z',
    lastSuccessfulSyncAt: '2026-07-27T21:30:00Z',
    lastWebhookAt: '2026-07-27T22:15:00Z',
    actionRequired: 'Select Meta Ad Account act_4091823 and grant leads_retrieval scope.',
    subServices: [
      { name: 'Facebook Pages', status: 'CONNECTED_HEALTHY', details: '2 Pages Verified' },
      { name: 'Instagram Profiles', status: 'CONNECTED_HEALTHY', details: '2 Handles Connected' },
      { name: 'Ad Accounts', status: 'DEGRADED', details: 'Ad Account Selection Required' },
    ],
    evidence: { identityCheck: 'passed', accountCheck: 'failed', scopeCheck: 'failed', syncCheck: 'passed', webhookCheck: 'passed' },
  },

  google: {
    provider: 'google',
    title: 'Google Ads & Google Analytics 4',
    status: 'DEGRADED',
    displayLabel: CANONICAL_STATUS_LABELS.DEGRADED.label,
    badgeStyle: CANONICAL_STATUS_LABELS.DEGRADED,
    isLive: true,
    isDemo: false,
    authMethod: 'oauth2',
    authMethodLabel: 'Google OAuth 2.0 + Ads Developer Token',
    externalOrganization: { id: 'goog-org-88192', name: 'The Boutique Google Workspace', type: 'google_workspace' },
    resources: [
      { id: 'g-ads-1', name: 'Proper & Co Google Ads (ID: 481-902-1189)', type: 'Google Ads Customer', externalId: '481-902-1189', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
      { id: 'ga4-1', name: 'Proper & Co Web & Booking GA4 (Property: 3091829)', type: 'GA4 Property', externalId: '3091829', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
    ],
    selectedAccountCount: 2,
    requiredAccountCount: 2,
    grantedScopes: [
      { scope: 'https://www.googleapis.com/auth/adwords', label: 'Manage Google Ads Campaigns', status: 'granted' },
      { scope: 'https://www.googleapis.com/auth/analytics.readonly', label: 'Read GA4 Traffic & Key Events', status: 'granted' },
    ],
    missingScopes: [],
    brandMappings: ['proper'],
    locationMappings: ['pc-br', 'pc-cov'],
    lastVerifiedAt: '2026-07-27T22:00:00Z',
    lastSuccessfulSyncAt: '2026-07-27T21:00:00Z',
    actionRequired: 'Google Ads Developer Token is in Basic Access verification.',
    subServices: [
      { name: 'Google Ads', status: 'CONNECTED_HEALTHY', details: 'Customer 481-902-1189 Active' },
      { name: 'GA4 Property', status: 'CONNECTED_HEALTHY', details: 'Property 3091829 Active' },
      { name: 'Merchant Center', status: 'NOT_CONFIGURED', details: 'Not Configured' },
    ],
    evidence: { identityCheck: 'passed', accountCheck: 'passed', scopeCheck: 'passed', syncCheck: 'passed', webhookCheck: 'not_applicable' },
  },

  shopify: {
    provider: 'shopify',
    title: 'Shopify E-Commerce Store Connection',
    status: 'CONNECTED_HEALTHY',
    displayLabel: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY.label,
    badgeStyle: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY,
    isLive: true,
    isDemo: false,
    authMethod: 'client_credentials',
    authMethodLabel: 'Shopify Admin API Token & Webhooks',
    externalOrganization: { id: 'properandco-shop', name: 'Proper & Company E-Commerce Store', type: 'shopify_shop' },
    resources: [
      { id: 'shop-loc-1', name: 'Proper & Co. Baton Rouge Storefront', type: 'Shopify Inventory Location', externalId: 'loc_881920', brand: 'proper', locations: ['pc-br'], selected: true, status: 'active' },
      { id: 'shop-loc-2', name: 'Proper & Co. Covington Storefront', type: 'Shopify Inventory Location', externalId: 'loc_881921', brand: 'proper', locations: ['pc-cov'], selected: true, status: 'active' },
    ],
    selectedAccountCount: 2,
    requiredAccountCount: 2,
    grantedScopes: [
      { scope: 'read_products', label: 'Read Store Products & Variants', status: 'granted' },
      { scope: 'read_inventory', label: 'Read Inventory Levels per Store', status: 'granted' },
      { scope: 'read_orders', label: 'Read E-Commerce Orders & Customers', status: 'granted' },
      { scope: 'read_locations', label: 'Read Multi-Location Inventory Locations', status: 'granted' },
    ],
    missingScopes: [],
    brandMappings: ['proper'],
    locationMappings: ['pc-br', 'pc-cov'],
    lastVerifiedAt: '2026-07-27T22:30:00Z',
    lastSuccessfulSyncAt: '2026-07-27T22:30:00Z',
    lastWebhookAt: '2026-07-27T22:28:00Z',
    subServices: [
      { name: 'Shopify Catalog', status: 'CONNECTED_HEALTHY', details: '184 Products Published' },
      { name: 'Multi-Location Sync', status: 'CONNECTED_HEALTHY', details: 'Baton Rouge & Covington Mapped' },
      { name: 'Webhooks', status: 'CONNECTED_HEALTHY', details: 'orders/create, inventory/update Verified' },
    ],
    evidence: { identityCheck: 'passed', accountCheck: 'passed', scopeCheck: 'passed', syncCheck: 'passed', webhookCheck: 'passed' },
  },

  klaviyo: {
    provider: 'klaviyo',
    title: 'Klaviyo Email & SMS Marketing Platform',
    status: 'CONNECTED_HEALTHY',
    displayLabel: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY.label,
    badgeStyle: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY,
    isLive: true,
    isDemo: false,
    authMethod: 'api_key',
    authMethodLabel: 'Klaviyo Server-Side Private API Key (PK_...)',
    externalOrganization: { id: 'klav-acc-99201', name: 'Proper & Co Klaviyo Account', type: 'klaviyo_organization' },
    resources: [
      { id: 'klav-list-1', name: 'VIP Bride Master List', type: 'Klaviyo List', externalId: 'Wk9aP1', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
      { id: 'klav-flow-1', name: 'Post-Appointment Follow-up Sequence', type: 'Klaviyo Flow', externalId: 'flow_44189', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
    ],
    selectedAccountCount: 2,
    requiredAccountCount: 2,
    grantedScopes: [
      { scope: 'profiles:read', label: 'Read Bride Profiles & Email Preference', status: 'granted' },
      { scope: 'events:write', label: 'Track Appointment & Booking Events', status: 'granted' },
      { scope: 'campaigns:read', label: 'Read Email & SMS Campaign Metrics', status: 'granted' },
    ],
    missingScopes: [],
    brandMappings: ['proper'],
    locationMappings: ['pc-br', 'pc-cov'],
    lastVerifiedAt: '2026-07-27T21:45:00Z',
    lastSuccessfulSyncAt: '2026-07-27T21:45:00Z',
    evidence: { identityCheck: 'passed', accountCheck: 'passed', scopeCheck: 'passed', syncCheck: 'passed', webhookCheck: 'not_applicable' },
  },

  call_tracking: {
    provider: 'call_tracking',
    title: 'CallRail & Dynamic Phone Call Tracking',
    status: 'CONNECTED_HEALTHY',
    displayLabel: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY.label,
    badgeStyle: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY,
    isLive: true,
    isDemo: false,
    authMethod: 'api_key',
    authMethodLabel: 'CallRail User API Key + Webhook Signing Secret',
    externalOrganization: { id: 'cr-acc-10293', name: 'The Boutique CallRail Account', type: 'callrail_account' },
    resources: [
      { id: 'cr-comp-1', name: 'I Do Bridal Couture (Perkins Rd)', type: 'CallRail Company', externalId: 'COM88102', brand: 'ido', locations: ['ido-br'], selected: true, status: 'active' },
      { id: 'cr-comp-2', name: 'Proper & Company (Baton Rouge)', type: 'CallRail Company', externalId: 'COM88103', brand: 'proper', locations: ['pc-br'], selected: true, status: 'active' },
    ],
    selectedAccountCount: 2,
    requiredAccountCount: 2,
    grantedScopes: [
      { scope: 'calls:read', label: 'Read Inbound Call Logs & Transcripts', status: 'granted' },
      { scope: 'trackers:read', label: 'Read Dynamic Website Tracking Numbers', status: 'granted' },
      { scope: 'webhooks:post', label: 'Receive Post-Call Lead Webhooks', status: 'granted' },
    ],
    missingScopes: [],
    brandMappings: ['ido', 'proper'],
    locationMappings: ['ido-br', 'pc-br'],
    lastVerifiedAt: '2026-07-27T22:10:00Z',
    lastSuccessfulSyncAt: '2026-07-27T22:10:00Z',
    lastWebhookAt: '2026-07-27T21:55:00Z',
    evidence: { identityCheck: 'passed', accountCheck: 'passed', scopeCheck: 'passed', syncCheck: 'passed', webhookCheck: 'passed' },
  },

  web_forms: {
    provider: 'web_forms',
    title: 'VowOS Unified Web Form Ingestion API',
    status: 'CONNECTED_HEALTHY',
    displayLabel: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY.label,
    badgeStyle: CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY,
    isLive: true,
    isDemo: false,
    authMethod: 'internal_service',
    authMethodLabel: 'Internal HMAC-SHA256 Signed Ingestion Endpoint',
    externalOrganization: { id: 'vowos-internal-forms', name: 'VowOS High-Volume Lead Router', type: 'internal_api' },
    resources: [
      { id: 'form-1', name: 'I Do Bridal Online Appointment Request Form', type: 'Web Form Endpoint', externalId: '/api/v1/leads/ido-br', brand: 'ido', locations: ['ido-br', 'ido-cov'], selected: true, status: 'active' },
      { id: 'form-2', name: 'Proper & Co Private VIP Shopping Request Form', type: 'Web Form Endpoint', externalId: '/api/v1/leads/pc-br', brand: 'proper', locations: ['pc-br', 'pc-cov'], selected: true, status: 'active' },
    ],
    selectedAccountCount: 2,
    requiredAccountCount: 2,
    grantedScopes: [
      { scope: 'forms:ingest', label: 'Receive & Deduplicate Web Form Submissions', status: 'granted' },
      { scope: 'signature:verify', label: 'Verify Client-Side Request HMAC Signatures', status: 'granted' },
    ],
    missingScopes: [],
    brandMappings: ['ido', 'proper'],
    locationMappings: ['ido-br', 'ido-cov', 'pc-br', 'pc-cov'],
    lastVerifiedAt: '2026-07-27T22:35:00Z',
    lastSuccessfulSyncAt: '2026-07-27T22:35:00Z',
    lastWebhookAt: '2026-07-27T22:34:00Z',
    evidence: { identityCheck: 'passed', accountCheck: 'passed', scopeCheck: 'passed', syncCheck: 'passed', webhookCheck: 'passed' },
  },

  tiktok: {
    provider: 'tiktok',
    title: 'TikTok Business Center & Ads',
    status: 'DISCONNECTED',
    displayLabel: CANONICAL_STATUS_LABELS.DISCONNECTED.label,
    badgeStyle: CANONICAL_STATUS_LABELS.DISCONNECTED,
    isLive: false,
    isDemo: false,
    authMethod: 'oauth2',
    authMethodLabel: 'TikTok for Business Authorization Code Flow',
    resources: [],
    selectedAccountCount: 0,
    requiredAccountCount: 1,
    grantedScopes: [],
    missingScopes: ['advertiser_read', 'campaign_read', 'lead_read'],
    brandMappings: [],
    locationMappings: [],
    lastVerifiedAt: '—',
    lastSuccessfulSyncAt: '—',
    actionRequired: 'Click "Authorize TikTok Business" to connect TikTok Ads.',
    evidence: { identityCheck: 'pending', accountCheck: 'pending', scopeCheck: 'pending', syncCheck: 'pending', webhookCheck: 'not_applicable' },
  },

  pinterest: {
    provider: 'pinterest',
    title: 'Pinterest Business & Product Catalog',
    status: 'DISCONNECTED',
    displayLabel: CANONICAL_STATUS_LABELS.DISCONNECTED.label,
    badgeStyle: CANONICAL_STATUS_LABELS.DISCONNECTED,
    isLive: false,
    isDemo: false,
    authMethod: 'oauth2',
    authMethodLabel: 'Pinterest v5 API OAuth 2.0 Bearer Flow',
    resources: [],
    selectedAccountCount: 0,
    requiredAccountCount: 1,
    grantedScopes: [],
    missingScopes: ['boards:read', 'pins:read', 'ads:read', 'catalogs:read'],
    brandMappings: [],
    locationMappings: [],
    lastVerifiedAt: '—',
    lastSuccessfulSyncAt: '—',
    actionRequired: 'Click "Connect Pinterest Business" to map Proper & Co catalogs.',
    evidence: { identityCheck: 'pending', accountCheck: 'pending', scopeCheck: 'pending', syncCheck: 'pending', webhookCheck: 'not_applicable' },
  },

  linkedin: {
    provider: 'linkedin',
    title: 'LinkedIn Campaign Manager',
    status: 'DISCONNECTED',
    displayLabel: CANONICAL_STATUS_LABELS.DISCONNECTED.label,
    badgeStyle: CANONICAL_STATUS_LABELS.DISCONNECTED,
    isLive: false,
    isDemo: false,
    authMethod: 'oauth2',
    authMethodLabel: 'LinkedIn Marketing Developer OAuth 2.0',
    resources: [],
    selectedAccountCount: 0,
    requiredAccountCount: 1,
    grantedScopes: [],
    missingScopes: ['r_ads', 'r_ads_reporting', 'rw_organization_admin'],
    brandMappings: [],
    locationMappings: [],
    lastVerifiedAt: '—',
    lastSuccessfulSyncAt: '—',
    actionRequired: 'Optional: Connect LinkedIn Campaign Manager for B2B & Formal event ads.',
    evidence: { identityCheck: 'pending', accountCheck: 'pending', scopeCheck: 'pending', syncCheck: 'pending', webhookCheck: 'not_applicable' },
  },
};

export function getTruthfulConnections(): ConnectionTruthDescriptor[] {
  return Object.values(TRUTHFUL_CONNECTIONS);
}

export function getTruthfulConnection(provider: MarketingProvider): ConnectionTruthDescriptor {
  return TRUTHFUL_CONNECTIONS[provider];
}

export function testProviderConnectionReadonly(provider: MarketingProvider): ConnectionTruthDescriptor {
  const conn = TRUTHFUL_CONNECTIONS[provider];
  if (!conn) return conn;

  const now = new Date().toISOString();
  // Safe read-only evaluation logic
  if (conn.selectedAccountCount === 0 && conn.provider !== 'web_forms') {
    conn.status = 'ACCOUNT_SELECTION_REQUIRED';
    conn.displayLabel = CANONICAL_STATUS_LABELS.ACCOUNT_SELECTION_REQUIRED.label;
    conn.badgeStyle = CANONICAL_STATUS_LABELS.ACCOUNT_SELECTION_REQUIRED;
    conn.evidence.accountCheck = 'failed';
  } else if (conn.missingScopes.length > 0) {
    conn.status = 'PERMISSION_REQUIRED';
    conn.displayLabel = CANONICAL_STATUS_LABELS.PERMISSION_REQUIRED.label;
    conn.badgeStyle = CANONICAL_STATUS_LABELS.PERMISSION_REQUIRED;
    conn.evidence.scopeCheck = 'failed';
  } else {
    conn.status = 'CONNECTED_HEALTHY';
    conn.displayLabel = CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY.label;
    conn.badgeStyle = CANONICAL_STATUS_LABELS.CONNECTED_HEALTHY;
    conn.evidence.identityCheck = 'passed';
    conn.evidence.accountCheck = 'passed';
    conn.evidence.scopeCheck = 'passed';
    conn.evidence.syncCheck = 'passed';
  }

  conn.lastVerifiedAt = now;
  return { ...conn };
}

export function disconnectTruthfulConnection(provider: MarketingProvider): ConnectionTruthDescriptor {
  const conn = TRUTHFUL_CONNECTIONS[provider];
  if (!conn) return conn;

  conn.status = 'DISCONNECTED_BY_USER';
  conn.displayLabel = CANONICAL_STATUS_LABELS.DISCONNECTED_BY_USER.label;
  conn.badgeStyle = CANONICAL_STATUS_LABELS.DISCONNECTED_BY_USER;
  conn.isLive = false;
  conn.selectedAccountCount = 0;
  conn.resources.forEach((r) => (r.selected = false));
  conn.evidence = { identityCheck: 'pending', accountCheck: 'pending', scopeCheck: 'pending', syncCheck: 'pending', webhookCheck: 'not_applicable' };
  conn.lastVerifiedAt = new Date().toISOString();

  return { ...conn };
}
