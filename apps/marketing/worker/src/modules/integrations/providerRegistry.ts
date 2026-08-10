export type IntegrationProvider =
  | 'meta'
  | 'google'
  | 'tiktok'
  | 'pinterest'
  | 'linkedin'
  | 'shopify'
  | 'klaviyo'
  | 'call_tracking'
  | 'web_forms';

export type IntegrationAuthMode = 'oauth2' | 'api_key' | 'internal';

export interface ProviderSubServiceDefinition {
  id: string;
  label: string;
  description: string;
  scopes?: string[];
  configurationEnv?: string[];
}

export interface ProviderDefinition {
  id: IntegrationProvider;
  title: string;
  category: 'social' | 'google' | 'commerce' | 'messaging' | 'attribution' | 'website';
  authMode: IntegrationAuthMode;
  description: string;
  clientIdEnv?: string;
  clientSecretEnv?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  defaultScopes?: string[];
  scopesEnv?: string;
  verifyUrl?: string;
  subServices: ProviderSubServiceDefinition[];
  requiresContext?: 'shop';
}

const GOOGLE_BASE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/content',
];

export const PROVIDERS: Record<IntegrationProvider, ProviderDefinition> = {
  meta: {
    id: 'meta',
    title: 'Meta Business Suite',
    category: 'social',
    authMode: 'oauth2',
    description: 'Facebook Pages, Instagram Professional, Meta Ads, Lead Ads, Pixel and Conversions API.',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    authorizationUrl: process.env.META_OAUTH_AUTHORIZE_URL || 'https://www.facebook.com/dialog/oauth',
    tokenUrl: process.env.META_OAUTH_TOKEN_URL || 'https://graph.facebook.com/oauth/access_token',
    defaultScopes: [
      'ads_read',
      'ads_management',
      'business_management',
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_insights',
      'leads_retrieval',
    ],
    scopesEnv: 'META_OAUTH_SCOPES',
    verifyUrl: process.env.META_VERIFY_URL || 'https://graph.facebook.com/me?fields=id,name',
    subServices: [
      { id: 'facebook_pages', label: 'Facebook Pages', description: 'Page identity, engagement and publishing resources.' },
      { id: 'instagram', label: 'Instagram Business', description: 'Professional profile and insight access.' },
      { id: 'meta_ads', label: 'Meta Ads', description: 'Campaigns, ad sets, ads and spend.' },
      { id: 'lead_ads', label: 'Meta Lead Ads', description: 'Lead form retrieval and webhook ingestion.' },
      { id: 'meta_pixel', label: 'Meta Pixel', description: 'Browser event measurement.' },
      { id: 'capi', label: 'Conversions API', description: 'Server-side conversion measurement and deduplication.' },
    ],
  },
  google: {
    id: 'google',
    title: 'Google Marketing & Business',
    category: 'google',
    authMode: 'oauth2',
    description: 'Google Ads, Analytics 4, Business Profile, Search Console, Merchant Center, YouTube and Tag Manager.',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: GOOGLE_BASE_SCOPES,
    scopesEnv: 'GOOGLE_OAUTH_SCOPES',
    verifyUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    subServices: [
      { id: 'google_ads', label: 'Google Ads', description: 'Search, Performance Max and conversion data.', configurationEnv: ['GOOGLE_ADS_DEVELOPER_TOKEN'] },
      { id: 'ga4', label: 'Google Analytics 4', description: 'Traffic, events, key events and attribution.' },
      { id: 'business_profile', label: 'Google Business Profile', description: 'Locations, profile performance and local presence.' },
      { id: 'search_console', label: 'Google Search Console', description: 'Organic search queries and landing-page performance.' },
      { id: 'merchant_center', label: 'Google Merchant Center', description: 'Commerce catalog and product feed health.' },
      { id: 'youtube', label: 'YouTube', description: 'Channel and video analytics.' },
      { id: 'tag_manager', label: 'Google Tag Manager', description: 'Measurement container visibility and tag governance.' },
    ],
  },
  tiktok: {
    id: 'tiktok',
    title: 'TikTok for Business',
    category: 'social',
    authMode: 'oauth2',
    description: 'TikTok Ads, audiences, creative performance and Events API.',
    clientIdEnv: 'TIKTOK_CLIENT_ID',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    authorizationUrl: process.env.TIKTOK_OAUTH_AUTHORIZE_URL,
    tokenUrl: process.env.TIKTOK_OAUTH_TOKEN_URL,
    defaultScopes: [],
    scopesEnv: 'TIKTOK_OAUTH_SCOPES',
    verifyUrl: process.env.TIKTOK_VERIFY_URL,
    subServices: [
      { id: 'tiktok_ads', label: 'TikTok Ads', description: 'Campaign, ad group, ad and reporting access.' },
      { id: 'tiktok_audiences', label: 'TikTok Audiences', description: 'Audience management and retargeting.' },
      { id: 'tiktok_events', label: 'TikTok Events API', description: 'Server-side conversion events.' },
    ],
  },
  pinterest: {
    id: 'pinterest',
    title: 'Pinterest Business',
    category: 'social',
    authMode: 'oauth2',
    description: 'Pinterest Ads, pins, boards, catalogs and shopping attribution.',
    clientIdEnv: 'PINTEREST_APP_ID',
    clientSecretEnv: 'PINTEREST_APP_SECRET',
    authorizationUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    defaultScopes: ['ads:read', 'ads:write', 'boards:read', 'pins:read', 'user_accounts:read', 'catalogs:read'],
    scopesEnv: 'PINTEREST_OAUTH_SCOPES',
    verifyUrl: 'https://api.pinterest.com/v5/user_account',
    subServices: [
      { id: 'pinterest_ads', label: 'Pinterest Ads', description: 'Advertising, spend and conversion reporting.' },
      { id: 'pinterest_organic', label: 'Pins & Boards', description: 'Organic content and engagement.' },
      { id: 'pinterest_catalogs', label: 'Pinterest Catalogs', description: 'Product catalog and shopping visibility.' },
    ],
  },
  linkedin: {
    id: 'linkedin',
    title: 'LinkedIn Campaign Manager',
    category: 'social',
    authMode: 'oauth2',
    description: 'LinkedIn organization presence, Campaign Manager and ad reporting.',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    defaultScopes: ['openid', 'profile', 'email'],
    scopesEnv: 'LINKEDIN_OAUTH_SCOPES',
    verifyUrl: 'https://api.linkedin.com/v2/userinfo',
    subServices: [
      { id: 'linkedin_pages', label: 'LinkedIn Organization', description: 'Organization identity and organic presence.' },
      { id: 'linkedin_ads', label: 'LinkedIn Ads', description: 'Campaign Manager and reporting; requires approved marketing scopes.' },
    ],
  },
  shopify: {
    id: 'shopify',
    title: 'Shopify',
    category: 'commerce',
    authMode: 'oauth2',
    description: 'Products, inventory, orders, customers, locations and ecommerce attribution.',
    clientIdEnv: 'SHOPIFY_CLIENT_ID',
    clientSecretEnv: 'SHOPIFY_CLIENT_SECRET',
    defaultScopes: ['read_products', 'read_inventory', 'read_orders', 'read_locations', 'read_customers'],
    scopesEnv: 'SHOPIFY_OAUTH_SCOPES',
    subServices: [
      { id: 'shopify_catalog', label: 'Catalog', description: 'Products and variants.' },
      { id: 'shopify_inventory', label: 'Inventory', description: 'Inventory levels and locations.' },
      { id: 'shopify_orders', label: 'Orders & Customers', description: 'Revenue and customer attribution.' },
      { id: 'shopify_webhooks', label: 'Webhooks', description: 'Near-real-time order and inventory events.' },
    ],
    requiresContext: 'shop',
  },
  klaviyo: {
    id: 'klaviyo',
    title: 'Klaviyo',
    category: 'messaging',
    authMode: 'api_key',
    description: 'Email/SMS profiles, campaigns, flows and lifecycle events.',
    subServices: [
      { id: 'klaviyo_profiles', label: 'Profiles & Consent', description: 'Customer profiles and communication consent.' },
      { id: 'klaviyo_campaigns', label: 'Campaigns', description: 'Email/SMS campaign performance.' },
      { id: 'klaviyo_flows', label: 'Flows', description: 'Automated lifecycle messaging.' },
    ],
  },
  call_tracking: {
    id: 'call_tracking',
    title: 'CallRail / Call Tracking',
    category: 'attribution',
    authMode: 'api_key',
    description: 'Call attribution, dynamic number insertion and lead-source matching.',
    subServices: [
      { id: 'calls', label: 'Call Attribution', description: 'Calls, source, campaign and landing-page attribution.' },
      { id: 'dni', label: 'Dynamic Number Insertion', description: 'Website visitor source-to-call matching.' },
      { id: 'call_webhooks', label: 'Call Webhooks', description: 'Near-real-time inbound call events.' },
    ],
  },
  web_forms: {
    id: 'web_forms',
    title: 'Website Forms & Booking Intake',
    category: 'website',
    authMode: 'internal',
    description: 'Signed VowOS inbound endpoint for website lead and booking forms.',
    subServices: [
      { id: 'lead_forms', label: 'Lead Forms', description: 'Website inquiry and lead form ingestion.' },
      { id: 'booking_forms', label: 'Booking Forms', description: 'Online appointment request attribution.' },
      { id: 'utm_capture', label: 'UTM & Click IDs', description: 'UTM, gclid, fbclid and other attribution identifiers.' },
    ],
  },
};

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export function configuredScopes(provider: ProviderDefinition): string[] {
  const configured = provider.scopesEnv ? process.env[provider.scopesEnv]?.trim() : undefined;
  if (!configured) return provider.defaultScopes || [];
  return configured.split(/[ ,]+/).map((scope) => scope.trim()).filter(Boolean);
}

export function providerConfiguration(provider: ProviderDefinition) {
  const missing: string[] = [];
  if (provider.authMode === 'oauth2') {
    if (provider.clientIdEnv && !process.env[provider.clientIdEnv]) missing.push(provider.clientIdEnv);
    if (provider.clientSecretEnv && !process.env[provider.clientSecretEnv]) missing.push(provider.clientSecretEnv);
    if (provider.id !== 'shopify' && !provider.authorizationUrl) missing.push(`${provider.id.toUpperCase()}_OAUTH_AUTHORIZE_URL`);
    if (provider.id !== 'shopify' && !provider.tokenUrl) missing.push(`${provider.id.toUpperCase()}_OAUTH_TOKEN_URL`);
  }
  return { configured: missing.length === 0, missing };
}
