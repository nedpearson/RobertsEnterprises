/**
 * Growth & Marketing domain types.
 *
 * These mirror the tenant-safe `growth_*` tables. Production UI must render
 * truthful empty/connection states when provider data is unavailable; demo data
 * is isolated to the demo data plane.
 */

export type GrowthProvider =
  | 'google_business_profile'
  | 'google_search_console'
  | 'google_analytics'
  | 'google_ads'
  | 'meta_ads'
  | 'meta_social'
  | 'tiktok'
  | 'tiktok_ads'
  | 'pinterest'
  | 'pinterest_ads'
  | 'youtube'
  | 'linkedin_ads'
  | 'shopify'
  | 'website'
  | 'manual';

export type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'revoked';
export type DataFreshnessState = 'live' | 'fresh' | 'delayed' | 'stale' | 'failed' | 'unavailable';

export interface ProviderConnection {
  id: string;
  business_id: string;
  location_id?: string | null;
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

/** Canonical paid campaign row from growth_ad_campaigns. */
export interface GrowthCampaign {
  id: string;
  business_id: string;
  location_id: string | null;
  connection_id: string | null;
  network: string;
  external_id: string;
  ad_account_id: string | null;
  name: string;
  objective: string | null;
  status: string | null;
  daily_budget_cents: number | null;
  lifetime_budget_cents: number | null;
  currency_code: string;
  started_at: string | null;
  ended_at: string | null;
  synced_at: string | null;
  metadata: Record<string, unknown>;
}

/** Canonical daily paid-campaign fact from growth_ad_metrics. */
export interface CampaignDailyMetric {
  id: string;
  business_id: string;
  campaign_id: string;
  metric_date: string;
  spend_cents: number;
  impressions: number;
  reach: number;
  clicks: number;
  frequency: number | null;
  ctr: number | null;
  cpc_cents: number | null;
  cpm_cents: number | null;
  conversions: number;
  conversion_value_cents: number;
  leads: number;
  qualified_leads: number;
  appointments_booked: number;
  appointments_attended: number;
  sales: number;
  revenue_cents: number;
  gross_profit_cents: number;
  platform_reported_conversions: number;
  synced_at: string | null;
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  provider: string;
  locationId: string | null;
  status: string | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualifiedLeads: number;
  appointmentsBooked: number;
  appointmentsAttended: number;
  sales: number;
  revenueCents: number;
  grossProfitCents: number;
  platformReportedConversions: number;
  ctr: number | null;
  cpcCents: number | null;
  cplCents: number | null;
  costPerAppointmentCents: number | null;
  cacCents: number | null;
  roas: number | null;
  grossProfitRoas: number | null;
  freshnessAt: string | null;
}

export interface MoneyMapChannel {
  channel: string;
  spendCents: number;
  revenueCents: number;
  grossProfitCents: number;
  leads: number;
  appointments: number;
  sales: number;
  roas: number | null;
  grossProfitRoas: number | null;
}

export interface GrowthAIRecommendation {
  id: string;
  business_id: string;
  location_id: string | null;
  category: string;
  title: string;
  action_type: string;
  rationale: string;
  expected_impact: Record<string, unknown>;
  confidence_score: number | null;
  risk_level: 'low' | 'medium' | 'high';
  evidence: Array<string | Record<string, unknown>>;
  data_window_start: string | null;
  data_window_end: string | null;
  data_freshness_seconds: number | null;
  financial_exposure_cents: number;
  governance_level: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'dismissed' | 'snoozed' | 'executed' | 'expired';
  expires_at: string | null;
  created_at: string;
}

export interface GrowthCompetitor {
  id: string;
  business_id: string;
  location_id: string | null;
  name: string;
  website_url: string | null;
  competitor_type: 'direct' | 'indirect' | 'national' | 'unknown';
  google_profile_url: string | null;
  social_profiles: Record<string, string>;
  verified_by_user: boolean;
  active: boolean;
  created_at: string;
}

export interface GrowthCompetitorSignal {
  id: string;
  business_id: string;
  location_id: string | null;
  competitor_id: string;
  source: string;
  signal_type: string;
  headline: string | null;
  summary: string | null;
  public_url: string | null;
  evidence_quality: 'measured' | 'estimated' | 'unavailable';
  methodology: string | null;
  detected_at: string;
}

export interface GrowthDataHealth {
  score: number;
  freshnessScore: number;
  connectionScore: number;
  attributionCoveragePct: number | null;
  state: DataFreshnessState;
  lastUpdatedAt: string | null;
  issues: Array<{
    code: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    action?: string;
  }>;
}

/** Rolled-up per-channel performance, joining spend to attributed revenue. */
export interface ChannelPerformance {
  channel: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
  appointments: number;
  customers: number;
  revenueCents: number;
  grossProfitCents?: number;
  sales?: number;
  qualifiedLeads?: number;
  appointmentsAttended?: number;
  /** Revenue / spend. null when there is no spend to divide by. */
  roas: number | null;
  /** Cost per acquired lead. null when there are no leads or no spend. */
  cacCents: number | null;
  cplCents?: number | null;
  costPerAppointmentCents?: number | null;
  grossProfitRoas?: number | null;
}

export interface GrowthSummary {
  rangeDays: number;
  totalSpendCents: number;
  attributedRevenueCents: number;
  attributedGrossProfitCents?: number;
  leads: number;
  qualifiedLeads?: number;
  bookedAppointments: number;
  attendedAppointments?: number;
  sales?: number;
  newCustomers: number;
  blendedRoas: number | null;
  blendedGrossProfitRoas?: number | null;
  blendedCacCents: number | null;
  costPerAppointmentCents?: number | null;
  attributionCoveragePct?: number | null;
  channels: ChannelPerformance[];
  /** True when no spend and no touchpoints exist yet — render the empty state. */
  isEmpty: boolean;
}
