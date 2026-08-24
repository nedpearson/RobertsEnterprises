/**
 * Growth & Marketing domain types.
 *
 * These mirror the `growth_*` tables created in
 * supabase/migrations/20260829000000_growth_foundation.sql. Rows are read and
 * written through the shared `supabase` client, which the demo data plane
 * proxies to the in-memory demo database — so the same components and the same
 * queries serve both a live tenant and the /demoapp sandbox with no branching.
 */

export type GrowthProvider =
  | 'google_business_profile'
  | 'google_search_console'
  | 'google_analytics'
  | 'google_ads'
  | 'meta_ads'
  | 'manual';

export type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'revoked';

export interface ProviderConnection {
  id: string;
  business_id: string;
  provider: GrowthProvider;
  status: ConnectionStatus;
  external_account_id: string | null;
  display_name: string | null;
  scopes: string[];
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
}

export type ReviewSource = 'google' | 'yelp' | 'facebook' | 'the_knot' | 'wedding_wire' | 'manual';
export type ReviewStatus = 'needs_reply' | 'replied' | 'flagged' | 'ignored';

export interface GrowthReview {
  id: string;
  business_id: string;
  location_id: string | null;
  source: ReviewSource;
  author_name: string | null;
  author_photo_url: string | null;
  rating: number;
  body: string | null;
  posted_at: string;
  status: ReviewStatus;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  ai_draft: string | null;
  response_body: string | null;
  responded_at: string | null;
}

export interface LocalListing {
  id: string;
  business_id: string;
  location_id: string | null;
  provider: GrowthProvider;
  external_id: string | null;
  title: string;
  storefront_address: Record<string, unknown>;
  phone: string | null;
  website_url: string | null;
  primary_category: string | null;
  verification_state: string | null;
  is_published: boolean;
  rating: number | null;
  review_count: number;
  completeness_score: number | null;
  regular_hours: Record<string, unknown>;
  issues: Array<{ code: string; severity: 'high' | 'medium' | 'low'; message: string }>;
  synced_at: string | null;
}

export interface LocalMetric {
  id: string;
  business_id: string;
  listing_id: string;
  metric_date: string;
  impressions_maps: number;
  impressions_search: number;
  website_clicks: number;
  calls: number;
  direction_requests: number;
  bookings: number;
}

export interface SearchMetric {
  id: string;
  business_id: string;
  site_url: string;
  metric_date: string;
  query: string | null;
  page: string | null;
  device: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
}

export interface SeoAudit {
  id: string;
  business_id: string;
  site_url: string;
  source: 'pagespeed' | 'internal_crawl' | 'manual';
  status: 'running' | 'complete' | 'failed';
  overall_score: number | null;
  pages_crawled: number;
  issues_count: number;
  started_at: string;
  finished_at: string | null;
}

export interface SeoPageResult {
  id: string;
  business_id: string;
  audit_id: string;
  url: string;
  http_status: number | null;
  indexable: boolean | null;
  performance_score: number | null;
  seo_score: number | null;
  accessibility_score: number | null;
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  title: string | null;
  issues: Array<{ code: string; severity: 'high' | 'medium' | 'low'; message: string }>;
}

export interface AttributionTouchpoint {
  id: string;
  business_id: string;
  lead_id: string | null;
  customer_id: string | null;
  occurred_at: string;
  channel: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  landing_path: string | null;
  is_first_touch: boolean;
  is_last_touch: boolean;
  cost_cents: number | null;
}

export interface ChannelSpend {
  id: string;
  business_id: string;
  channel: string;
  campaign: string | null;
  spend_date: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  entry_source: 'manual' | 'synced';
}

export interface ChannelPerformance {
  channel: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
  appointments: number;
  customers: number;
  revenueCents: number;
  roas: number | null;
  cacCents: number | null;
}

export interface GrowthSummary {
  rangeDays: number;
  totalSpendCents: number;
  attributedRevenueCents: number;
  leads: number;
  bookedAppointments: number;
  newCustomers: number;
  blendedRoas: number | null;
  blendedCacCents: number | null;
  channels: ChannelPerformance[];
  isEmpty: boolean;
}
