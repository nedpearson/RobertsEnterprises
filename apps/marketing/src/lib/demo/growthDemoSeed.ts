/**
 * Synthetic seed rows for the Growth & Marketing tables.
 *
 * Deterministic (no Math.random) so the sandbox tells the same story to every
 * prospect and so guard tests can assert on exact numbers. Shapes match the
 * `growth_*` tables in 20260829000000_growth_foundation.sql exactly — the demo
 * database is queried with the same code that queries Postgres, so any drift
 * between these rows and the real schema shows up as a broken tab in /demoapp.
 */

const DAY = 86_400_000;
const dateDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

export const DEMO_BUSINESS_ID = 'demo-business';
const LISTING_ID = 'demo-listing-magnolia';

/** Ad channels with a plausible bridal-boutique mix and honest, non-round numbers. */
const CHANNEL_PROFILE: Array<{
  channel: string;
  campaign: string;
  dailySpendCents: number;
  dailyImpressions: number;
  dailyClicks: number;
}> = [
  { channel: 'Google Search', campaign: 'Bridal Gowns — Exact', dailySpendCents: 8_450, dailyImpressions: 1_240, dailyClicks: 74 },
  { channel: 'Meta', campaign: 'Trunk Show Retargeting', dailySpendCents: 5_200, dailyImpressions: 9_800, dailyClicks: 118 },
  { channel: 'Pinterest', campaign: 'Lookbook Discovery', dailySpendCents: 2_150, dailyImpressions: 6_400, dailyClicks: 47 },
  { channel: 'The Knot', campaign: 'Storefront Listing', dailySpendCents: 3_300, dailyImpressions: 2_100, dailyClicks: 39 },
];

/** Slight day-to-day variation without randomness, so charts do not look synthetic. */
const wobble = (base: number, dayIndex: number, amplitude = 0.18) =>
  Math.round(base * (1 + amplitude * Math.sin((dayIndex / 30) * Math.PI * 2)));

export const growthDemoSeed: Record<string, any[]> = {
  growth_provider_connections: [
    {
      id: 'demo-conn-gbp',
      business_id: DEMO_BUSINESS_ID,
      provider: 'google_business_profile',
      status: 'connected',
      external_account_id: 'accounts/demo/locations/magnolia',
      display_name: 'Magnolia Bridal — Baton Rouge',
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      connected_at: isoDaysAgo(46),
      last_sync_at: isoDaysAgo(0),
      last_sync_status: 'success',
      last_error: null,
      metadata: {},
    },
    {
      id: 'demo-conn-gsc',
      business_id: DEMO_BUSINESS_ID,
      provider: 'google_search_console',
      status: 'connected',
      external_account_id: 'sc-domain:magnoliabridal.example',
      display_name: 'magnoliabridal.example',
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      connected_at: isoDaysAgo(46),
      last_sync_at: isoDaysAgo(0),
      last_sync_status: 'success',
      last_error: null,
      metadata: {},
    },
    {
      id: 'demo-conn-ads',
      business_id: DEMO_BUSINESS_ID,
      provider: 'google_ads',
      status: 'disconnected',
      external_account_id: null,
      display_name: null,
      scopes: [],
      connected_at: null,
      last_sync_at: null,
      last_sync_status: null,
      last_error: null,
      metadata: {},
    },
  ],

  growth_local_listings: [
    {
      id: LISTING_ID,
      business_id: DEMO_BUSINESS_ID,
      location_id: null,
      connection_id: 'demo-conn-gbp',
      provider: 'google_business_profile',
      external_id: 'accounts/demo/locations/magnolia',
      title: 'Magnolia Bridal',
      storefront_address: {
        addressLines: ['7902 Jefferson Hwy'],
        locality: 'Baton Rouge',
        administrativeArea: 'LA',
        postalCode: '70809',
      },
      phone: '(225) 555-0142',
      website_url: 'https://magnoliabridal.example',
      primary_category: 'Bridal shop',
      additional_categories: ['Wedding store', 'Dress alteration service'],
      regular_hours: {
        tuesday: '10:00–18:00',
        wednesday: '10:00–18:00',
        thursday: '10:00–20:00',
        friday: '10:00–18:00',
        saturday: '09:00–17:00',
      },
      verification_state: 'VERIFIED',
      is_published: true,
      rating: 4.8,
      review_count: 214,
      completeness_score: 82,
      issues: [
        { code: 'missing_services', severity: 'medium', message: 'No services listed — bridal shops with services get 2.1x more booking clicks.' },
        { code: 'thin_photos', severity: 'medium', message: 'Only 6 photos. Listings with 20+ photos see materially higher direction requests.' },
        { code: 'holiday_hours', severity: 'low', message: 'Holiday hours not set for the next 90 days.' },
      ],
      synced_at: isoDaysAgo(0),
    },
  ],

  growth_local_metrics: Array.from({ length: 30 }, (_, i) => {
    const dayIndex = 29 - i;
    return {
      id: `demo-lm-${dayIndex}`,
      business_id: DEMO_BUSINESS_ID,
      listing_id: LISTING_ID,
      metric_date: dateDaysAgo(dayIndex),
      impressions_maps: wobble(412, dayIndex),
      impressions_search: wobble(268, dayIndex),
      website_clicks: wobble(34, dayIndex),
      calls: wobble(9, dayIndex),
      direction_requests: wobble(17, dayIndex),
      bookings: wobble(4, dayIndex, 0.35),
    };
  }),

  growth_reviews: [
    {
      id: 'demo-rev-1',
      business_id: DEMO_BUSINESS_ID,
      location_id: null,
      listing_id: LISTING_ID,
      customer_id: null,
      source: 'google',
      external_id: 'demo-g-1',
      author_name: 'Sarah Jenkins',
      author_photo_url: null,
      rating: 5,
      body: "I had the most amazing experience at Magnolia! Jessica was my stylist and she was incredibly patient. The third dress I tried on was THE ONE. Highly recommend to any bride looking for a stress-free experience.",
      posted_at: isoDaysAgo(2),
      status: 'needs_reply',
      sentiment: 'positive',
      ai_draft:
        "Hi Sarah — thank you so much for the glowing review! We're thrilled Jessica helped you find 'the one'. Congratulations, and we can't wait to see you at your first fitting!",
      response_body: null,
      responded_at: null,
    },
    {
      id: 'demo-rev-2',
      business_id: DEMO_BUSINESS_ID,
      location_id: null,
      listing_id: LISTING_ID,
      customer_id: null,
      source: 'google',
      external_id: 'demo-g-2',
      author_name: 'Marcus Webb',
      author_photo_url: null,
      rating: 3,
      body: 'Beautiful selection but our appointment started 25 minutes late and we felt rushed at the end. Staff were kind about it.',
      posted_at: isoDaysAgo(6),
      status: 'needs_reply',
      sentiment: 'neutral',
      ai_draft:
        "Marcus, thank you for the honest feedback — a late start is on us, and being rushed is the opposite of the experience we want. I'd love to make it right; please reach out and we'll book you a private extended appointment.",
      response_body: null,
      responded_at: null,
    },
    {
      id: 'demo-rev-3',
      business_id: DEMO_BUSINESS_ID,
      location_id: null,
      listing_id: LISTING_ID,
      customer_id: null,
      source: 'the_knot',
      external_id: 'demo-k-1',
      author_name: 'Priya Raman',
      author_photo_url: null,
      rating: 5,
      body: 'They handled my alterations timeline perfectly even with a six-week turnaround. Communication was excellent throughout.',
      posted_at: isoDaysAgo(11),
      status: 'replied',
      sentiment: 'positive',
      ai_draft: null,
      response_body: 'Thank you Priya! Six weeks is tight and your flexibility made it work. Congratulations again!',
      responded_at: isoDaysAgo(10),
    },
    {
      id: 'demo-rev-4',
      business_id: DEMO_BUSINESS_ID,
      location_id: null,
      listing_id: LISTING_ID,
      customer_id: null,
      source: 'google',
      external_id: 'demo-g-3',
      author_name: 'Dana Whitfield',
      author_photo_url: null,
      rating: 2,
      body: 'Was told my gown would arrive in 12 weeks and it took 19. Nobody proactively called me with updates.',
      posted_at: isoDaysAgo(19),
      status: 'flagged',
      sentiment: 'negative',
      ai_draft:
        "Dana, a seven-week delay without proactive updates is a real failure on our side. We've since changed how we communicate vendor delays. I'd like to speak with you directly — please contact the store manager.",
      response_body: null,
      responded_at: null,
    },
  ],

  growth_search_metrics: [
    { query: 'bridal shops baton rouge', clicks: 186, impressions: 4_210, position: 3.2 },
    { query: 'wedding dress alterations near me', clicks: 142, impressions: 3_890, position: 4.1 },
    { query: 'magnolia bridal', clicks: 121, impressions: 1_040, position: 1.1 },
    { query: 'plus size wedding dresses louisiana', clicks: 88, impressions: 5_620, position: 7.8 },
    { query: 'bridal trunk show baton rouge', clicks: 64, impressions: 2_180, position: 5.4 },
    { query: 'affordable wedding gowns', clicks: 31, impressions: 8_940, position: 14.2 },
  ].map((row, i) => ({
    id: `demo-sm-${i}`,
    business_id: DEMO_BUSINESS_ID,
    connection_id: 'demo-conn-gsc',
    site_url: 'sc-domain:magnoliabridal.example',
    metric_date: dateDaysAgo(1),
    query: row.query,
    page: '/',
    device: 'MOBILE',
    country: 'usa',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Number((row.clicks / row.impressions).toFixed(4)),
    position: row.position,
  })),

  growth_seo_audits: [
    {
      id: 'demo-audit-1',
      business_id: DEMO_BUSINESS_ID,
      site_url: 'https://magnoliabridal.example',
      source: 'pagespeed',
      status: 'complete',
      overall_score: 74,
      pages_crawled: 18,
      issues_count: 11,
      started_at: isoDaysAgo(1),
      finished_at: isoDaysAgo(1),
      error: null,
    },
  ],

  growth_seo_page_results: [
    { url: '/', perf: 68, seo: 92, lcp: 3_120, cls: 0.08, title: 'Magnolia Bridal | Baton Rouge Bridal Boutique' },
    { url: '/appointments', perf: 81, seo: 88, lcp: 2_240, cls: 0.02, title: 'Book an Appointment' },
    { url: '/gowns', perf: 54, seo: 71, lcp: 4_680, cls: 0.21, title: 'Our Gowns' },
    { url: '/alterations', perf: 77, seo: 64, lcp: 2_610, cls: 0.05, title: null },
  ].map((p, i) => ({
    id: `demo-page-${i}`,
    business_id: DEMO_BUSINESS_ID,
    audit_id: 'demo-audit-1',
    url: p.url,
    http_status: 200,
    indexable: true,
    performance_score: p.perf,
    seo_score: p.seo,
    accessibility_score: 90,
    best_practices_score: 83,
    lcp_ms: p.lcp,
    inp_ms: 180,
    cls: p.cls,
    ttfb_ms: 410,
    title: p.title,
    meta_description: p.title ? `${p.title} — Magnolia Bridal` : null,
    issues: [
      ...(p.lcp > 4_000 ? [{ code: 'lcp_slow', severity: 'high', message: `Largest Contentful Paint is ${(p.lcp / 1000).toFixed(1)}s — target is under 2.5s.` }] : []),
      ...(p.cls > 0.1 ? [{ code: 'cls_high', severity: 'high', message: 'Layout shift above 0.1 — images are missing width/height.' }] : []),
      ...(!p.title ? [{ code: 'missing_title', severity: 'high', message: 'Page has no <title> element.' }] : []),
      ...(p.seo < 75 ? [{ code: 'thin_meta', severity: 'medium', message: 'Meta description missing or under 70 characters.' }] : []),
    ],
    created_at: isoDaysAgo(1),
  })),

  growth_channel_spend: CHANNEL_PROFILE.flatMap((c) =>
    Array.from({ length: 30 }, (_, i) => {
      const dayIndex = 29 - i;
      return {
        id: `demo-spend-${c.channel.replace(/\s+/g, '-').toLowerCase()}-${dayIndex}`,
        business_id: DEMO_BUSINESS_ID,
        connection_id: null,
        channel: c.channel,
        campaign: c.campaign,
        spend_date: dateDaysAgo(dayIndex),
        spend_cents: wobble(c.dailySpendCents, dayIndex),
        impressions: wobble(c.dailyImpressions, dayIndex),
        clicks: wobble(c.dailyClicks, dayIndex),
        entry_source: 'synced',
      };
    }),
  ),

  // Touchpoints are attached to the demo lead ids seeded elsewhere in the demo
  // database; unmatched ids simply do not roll up, which is the honest behaviour.
  growth_attribution_touchpoints: [],
};

/**
 * Attribution touchpoints must reference real demo lead ids to roll up, so they
 * are generated from whatever leads the demo database was seeded with.
 */
export function buildDemoTouchpoints(leadIds: string[]): any[] {
  const channels = CHANNEL_PROFILE.map((c) => c.channel);
  return leadIds.flatMap((leadId, i) => {
    const channel = channels[i % channels.length];
    const firstTouchDay = 20 - (i % 18);
    const lastTouchDay = Math.max(0, firstTouchDay - 3);
    return [
      {
        id: `demo-tp-${i}-first`,
        business_id: DEMO_BUSINESS_ID,
        lead_id: leadId,
        customer_id: null,
        occurred_at: isoDaysAgo(firstTouchDay),
        channel: i % 3 === 0 ? 'Organic Search' : channel,
        source: 'google',
        medium: i % 3 === 0 ? 'organic' : 'cpc',
        campaign: CHANNEL_PROFILE[i % CHANNEL_PROFILE.length].campaign,
        term: null,
        content: null,
        click_id: null,
        landing_path: '/gowns',
        referrer: 'https://www.google.com/',
        session_id: `demo-sess-${i}-a`,
        device: i % 2 === 0 ? 'mobile' : 'desktop',
        is_first_touch: true,
        is_last_touch: false,
        cost_cents: null,
        created_at: isoDaysAgo(firstTouchDay),
      },
      {
        id: `demo-tp-${i}-last`,
        business_id: DEMO_BUSINESS_ID,
        lead_id: leadId,
        customer_id: null,
        occurred_at: isoDaysAgo(lastTouchDay),
        channel,
        source: 'google',
        medium: 'cpc',
        campaign: CHANNEL_PROFILE[i % CHANNEL_PROFILE.length].campaign,
        term: null,
        content: null,
        click_id: `demo-click-${i}`,
        landing_path: '/appointments',
        referrer: null,
        session_id: `demo-sess-${i}-b`,
        device: i % 2 === 0 ? 'mobile' : 'desktop',
        is_first_touch: false,
        is_last_touch: true,
        cost_cents: null,
        created_at: isoDaysAgo(lastTouchDay),
      },
    ];
  });
}
