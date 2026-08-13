import {
  MarketingProvider,
  MarketingConnection,
  MarketingCampaign,
  MarketingContentPost,
  MarketingCreative,
  VendorCoopClaim,
  MarketingAttributionTouch,
  MarketingMetricsSummary,
  DiscoveredLead,
  OutreachDraft,
} from '../types/marketingTypes';

import {
  getTruthfulConnections,
  getTruthfulConnection,
  testProviderConnectionReadonly,
  disconnectTruthfulConnection,
} from '@/lib/services/connectionTruthService';
import { getActiveDataPlane } from '@/lib/supabase';
import { generateRobustDemoData } from '@/lib/demo/demoDataGenerator';

const CONNECTIONS_STORAGE_KEY = 'vowos_marketing_connections_v1';
const CAMPAIGNS_STORAGE_KEY = 'vowos_marketing_campaigns_v1';
const CONTENT_STORAGE_KEY = 'vowos_marketing_content_v1';
const CREATIVES_STORAGE_KEY = 'vowos_marketing_creatives_v1';
const EMERGENCY_PAUSE_KEY = 'vowos_marketing_emergency_pause_v1';
const ROBERTS_TENANT_ORIGIN = 'https://robertsenterprises.vowos.bridgebox.ai';

const isDemoPlane = () => getActiveDataPlane() === 'demo';

export function getMarketingConnections(): MarketingConnection[] {
  return getTruthfulConnections() as MarketingConnection[];
}

export function getMarketingConnection(provider: MarketingProvider): MarketingConnection | undefined {
  return getTruthfulConnection(provider) as MarketingConnection | undefined;
}

export function testConnectionReadonly(provider: MarketingProvider): MarketingConnection {
  return testProviderConnectionReadonly(provider) as MarketingConnection;
}

export function disconnectProviderOAuth(provider: MarketingProvider): MarketingConnection {
  return disconnectTruthfulConnection(provider) as MarketingConnection;
}

export function connectProviderOAuth(provider: MarketingProvider, businessName: string): MarketingConnection {
  const conn = getTruthfulConnection(provider);
  if (conn) {
    conn.status = 'CONNECTED_HEALTHY';
    conn.displayLabel = 'Connected & Healthy';
    conn.isLive = true;
    conn.externalOrganization = {
      id: `${provider}-org-live`,
      name: businessName || `${provider.toUpperCase()} Authorized Portfolio`,
      type: 'organization',
    };
    conn.selectedAccountCount = Math.max(conn.selectedAccountCount, 1);
    conn.lastVerifiedAt = new Date().toISOString();
  }
  return conn as MarketingConnection;
}

// Curated synthetic records used only when the active data plane is demo.
const INITIAL_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-001',
    name: 'Fall 2026 Bridal Consultation Appointments Drive',
    description: 'Targeting newly engaged brides in Baton Rouge & Covington area for 1-on-1 bridal fitting appointments.',
    brand: 'ido',
    locations: ['ido-br', 'ido-cov'],
    objective: 'bridal_appointments',
    providers: ['meta', 'google', 'pinterest'],
    status: 'active',
    approvalStatus: 'approved',
    plannedBudgetCents: 250000,
    approvedBudgetCents: 250000,
    actualSpendCents: 184500,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    targetAudience: 'Engaged Women 22-38, 50-mile radius around Baton Rouge & Covington',
    destinationUrl: `${ROBERTS_TENANT_ORIGIN}/book`,
    utmSource: 'facebook_instagram',
    utmMedium: 'cpc',
    utmCampaign: 'fall_bridal_consultations_2026',
    createdBy: 'Ramsey Roberts',
    approvedBy: 'Ramsey Roberts',
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'camp-002',
    name: 'Proper & Co. New Arrivals & Ready-to-Ship Promo',
    description: 'Promoting Proper & Co. boutique footwear, veil accessories, and cocktail dresses for online & store sales.',
    brand: 'proper',
    locations: ['pc-br', 'pc-cov'],
    objective: 'promote_new_arrivals',
    providers: ['meta', 'tiktok'],
    status: 'active',
    approvalStatus: 'approved',
    plannedBudgetCents: 150000,
    approvedBudgetCents: 150000,
    actualSpendCents: 98000,
    startDate: '2026-07-05',
    endDate: '2026-08-05',
    targetAudience: 'Style-conscious shoppers, cart abandoners & website retargeting',
    destinationUrl: 'https://properandcompany.myshopify.com',
    utmSource: 'meta_tiktok',
    utmMedium: 'social_paid',
    utmCampaign: 'proper_new_arrivals_q3',
    createdBy: 'Marketing Manager',
    approvedBy: 'Ramsey Roberts',
    createdAt: '2026-07-02T14:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'camp-003',
    name: 'Ines Di Santo Exclusive Trunk Show Announcement',
    description: 'Special weekend trunk show event promotion for Baton Rouge boutique featuring the new couture collection.',
    brand: 'ido',
    locations: ['ido-br'],
    objective: 'trunk_show',
    providers: ['meta', 'pinterest'],
    status: 'review',
    approvalStatus: 'pending',
    plannedBudgetCents: 100000,
    approvedBudgetCents: 100000,
    actualSpendCents: 0,
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    targetAudience: 'High-intent luxury bridal shoppers, Pinterest wedding board pinners',
    destinationUrl: `${ROBERTS_TENANT_ORIGIN}/book`,
    utmSource: 'pinterest_meta',
    utmMedium: 'event_ad',
    utmCampaign: 'ines_di_santo_trunkshow_2026',
    vendorCoopId: 'coop-ines-01',
    createdBy: 'Marketing Manager',
    createdAt: '2026-07-20T11:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_CONTENT: MarketingContentPost[] = [
  {
    id: 'post-101',
    brand: 'ido',
    location: 'ido-br',
    provider: 'meta',
    postType: 'image',
    caption: 'Behind the scenes at I Do Bridal Couture Baton Rouge ✨ Every fitting suite is prepared for our weekend brides. Book your private appointment online today! #IDoBridal #BatonRougeBridal #LouisianaBride',
    mediaUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80',
    scheduledAt: '2026-07-28T16:00:00Z',
    status: 'scheduled',
    approvalStatus: 'approved',
    createdBy: 'Social Media Coordinator',
  },
  {
    id: 'post-102',
    brand: 'proper',
    location: 'pc-br',
    postType: 'carousel',
    provider: 'tiktok',
    caption: 'Unboxing the new Proper & Co. satin bridal heels & pearl veils 🤍 Now available in Baton Rouge & online! #ProperAndCo #BridalStyle #ShopBatonRouge',
    mediaUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
    scheduledAt: '2026-07-29T18:30:00Z',
    status: 'scheduled',
    approvalStatus: 'approved',
    createdBy: 'Social Media Coordinator',
  },
];

const INITIAL_CREATIVES: MarketingCreative[] = [
  {
    id: 'cr-201',
    name: 'Luxury Fitting Room Suite Photo',
    brand: 'ido',
    creativeType: 'image',
    headline: 'Find Your Dream Gown at I Do Bridal Couture',
    primaryText: 'Experience Louisiana’s premier bridal salon in Baton Rouge & Covington.',
    description: 'Private fitting suites & personal stylist guidance.',
    callToAction: 'Book Appointment',
    destinationUrl: `${ROBERTS_TENANT_ORIGIN}/book`,
    mediaAssetUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '1:1',
    approvalStatus: 'approved',
    hasBridePhotoConsent: false,
    createdAt: '2026-06-10T09:00:00Z',
  },
  {
    id: 'cr-202',
    name: 'Proper Accessories Carousel Reel',
    brand: 'proper',
    creativeType: 'carousel',
    headline: 'Elevate Your Wedding Day Details',
    primaryText: 'Explore handcrafted veils, shoes, and jewelry at Proper & Co.',
    description: 'Free shipping on orders over $150.',
    callToAction: 'Shop Now',
    destinationUrl: 'https://properandcompany.myshopify.com',
    mediaAssetUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '9:16',
    approvalStatus: 'approved',
    hasBridePhotoConsent: false,
    createdAt: '2026-07-01T14:20:00Z',
  },
];

const INITIAL_VENDOR_CLAIMS: VendorCoopClaim[] = [
  {
    id: 'coop-ines-01',
    vendorName: 'Ines Di Santo',
    programName: 'Fall 2026 Co-Op Ad Fund',
    brand: 'ido',
    approvedAmountCents: 50000,
    actualSpendCents: 45000,
    claimStatus: 'submitted',
    reimbursementCents: 50000,
    deadlineDate: '2026-08-31',
    notes: '50% matching vendor fund for trunk show social advertising.',
  },
];

const INITIAL_ATTRIBUTION: MarketingAttributionTouch[] = [
  {
    id: 'touch-1',
    customerName: 'Whitney Guidry',
    provider: 'meta',
    campaignName: 'Fall 2026 Bridal Consultation Appointments Drive',
    utmSource: 'facebook_instagram',
    utmMedium: 'cpc',
    occurredAt: '2026-07-12T11:20:00Z',
    appointmentBooked: true,
    saleAmountCents: 345000,
    channelType: 'In-Store Boutique',
  },
  {
    id: 'touch-2',
    customerName: 'Lauren Boudreaux',
    provider: 'google',
    campaignName: 'Baton Rouge Local Search Campaign',
    utmSource: 'google',
    utmMedium: 'search',
    occurredAt: '2026-07-15T15:45:00Z',
    appointmentBooked: true,
    saleAmountCents: 280000,
    channelType: 'In-Store Boutique',
  },
  {
    id: 'touch-3',
    customerName: 'Claire Duplechain',
    provider: 'tiktok',
    campaignName: 'Proper & Co. New Arrivals & Ready-to-Ship Promo',
    utmSource: 'tiktok',
    utmMedium: 'social_paid',
    occurredAt: '2026-07-18T19:10:00Z',
    appointmentBooked: false,
    saleAmountCents: 42000,
    channelType: 'Online Shopify',
  },
];

const DEMO_CAMPAIGN_IDS = new Set(INITIAL_CAMPAIGNS.map((item) => item.id));
const DEMO_CONTENT_IDS = new Set(INITIAL_CONTENT.map((item) => item.id));
const DEMO_CREATIVE_IDS = new Set(INITIAL_CREATIVES.map((item) => item.id));

function readStoredList<T extends { id: string }>(
  storageKey: string,
  demoFallback: T[],
  demoIds: Set<string>,
): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return isDemoPlane() ? demoFallback : [];
    const parsed = JSON.parse(raw) as T[];
    return isDemoPlane() ? parsed : parsed.filter((item) => !demoIds.has(item.id));
  } catch {
    return isDemoPlane() ? demoFallback : [];
  }
}

export function saveMarketingConnections(conns: MarketingConnection[]) {
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(conns));
}

export function getMarketingCampaigns(): MarketingCampaign[] {
  return readStoredList(CAMPAIGNS_STORAGE_KEY, INITIAL_CAMPAIGNS, DEMO_CAMPAIGN_IDS);
}

export function saveMarketingCampaigns(camps: MarketingCampaign[]) {
  localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(camps));
}

export function createCampaign(data: Partial<MarketingCampaign>): MarketingCampaign {
  const list = getMarketingCampaigns();
  const newCamp: MarketingCampaign = {
    id: `camp-${Date.now()}`,
    name: data.name || 'New Marketing Campaign',
    description: data.description || '',
    brand: data.brand || 'ido',
    locations: data.locations || ['ido-br'],
    objective: data.objective || 'bridal_appointments',
    providers: data.providers || ['meta'],
    status: 'draft',
    approvalStatus: 'pending',
    plannedBudgetCents: data.plannedBudgetCents || 100000,
    approvedBudgetCents: data.approvedBudgetCents || 100000,
    actualSpendCents: 0,
    startDate: data.startDate || new Date().toISOString().slice(0, 10),
    endDate: data.endDate || new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    targetAudience: data.targetAudience || 'Target local audience',
    destinationUrl: data.destinationUrl || ROBERTS_TENANT_ORIGIN,
    utmSource: data.providers?.join('_') || 'meta',
    utmMedium: 'cpc',
    utmCampaign: (data.name || 'campaign').toLowerCase().replace(/\s+/g, '_'),
    createdBy: 'Ramsey Roberts',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const nextList = [newCamp, ...list];
  saveMarketingCampaigns(nextList);
  return newCamp;
}

export function updateCampaignStatus(id: string, status: MarketingCampaign['status']) {
  const list = getMarketingCampaigns();
  const nextList = list.map((campaign) =>
    campaign.id === id ? { ...campaign, status, updatedAt: new Date().toISOString() } : campaign,
  );
  saveMarketingCampaigns(nextList);
}

export function getEmergencyPauseStatus(): boolean {
  return localStorage.getItem(EMERGENCY_PAUSE_KEY) === 'true';
}

export function setEmergencyPauseStatus(paused: boolean) {
  localStorage.setItem(EMERGENCY_PAUSE_KEY, String(paused));

  if (!paused) return;

  const list = getMarketingCampaigns();
  const nextList = list.map((campaign) =>
    campaign.status === 'active' ? { ...campaign, status: 'paused' as const } : campaign,
  );
  saveMarketingCampaigns(nextList);

  // Demo is a closed synthetic data plane: never invoke live provider mutations.
  if (isDemoPlane()) return;

  // Same-origin request prevents localhost/provider leakage in production browsers.
  fetch('/api/campaigns/pause-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand: 'Proper & Company' }),
  }).catch((error) => console.error('Failed to queue emergency pause job', error));
}

export function getMarketingContentPosts(): MarketingContentPost[] {
  return readStoredList(CONTENT_STORAGE_KEY, INITIAL_CONTENT, DEMO_CONTENT_IDS);
}

export function saveMarketingContentPosts(posts: MarketingContentPost[]) {
  localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(posts));
}

export function createContentPost(post: Partial<MarketingContentPost>): MarketingContentPost {
  const list = getMarketingContentPosts();
  const newPost: MarketingContentPost = {
    id: `post-${Date.now()}`,
    brand: post.brand || 'ido',
    location: post.location || 'ido-br',
    provider: post.provider || 'meta',
    postType: post.postType || 'image',
    caption: post.caption || '',
    mediaUrl:
      post.mediaUrl ||
      'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80',
    scheduledAt: post.scheduledAt || new Date().toISOString(),
    status: 'scheduled',
    approvalStatus: 'approved',
    createdBy: 'Social Media Coordinator',
  };
  saveMarketingContentPosts([newPost, ...list]);
  return newPost;
}

export function getMarketingCreatives(): MarketingCreative[] {
  return readStoredList(CREATIVES_STORAGE_KEY, INITIAL_CREATIVES, DEMO_CREATIVE_IDS);
}

export function getVendorCoopClaims(): VendorCoopClaim[] {
  return isDemoPlane() ? INITIAL_VENDOR_CLAIMS : [];
}

export function getAttributionTouches(): MarketingAttributionTouch[] {
  return isDemoPlane() ? INITIAL_ATTRIBUTION : [];
}

export function getMarketingMetricsSummary(
  brandFilter: string = 'all',
  locationFilter: string = 'all',
): MarketingMetricsSummary {
  const campaigns = getMarketingCampaigns();
  const filtered = campaigns.filter((campaign) => {
    if (brandFilter !== 'all' && campaign.brand !== brandFilter) return false;
    if (locationFilter !== 'all' && !campaign.locations.includes(locationFilter as never)) return false;
    return true;
  });

  const totalApproved = filtered.reduce((sum, campaign) => sum + campaign.approvedBudgetCents, 0);
  let actualSpend = filtered.reduce((sum, campaign) => sum + campaign.actualSpendCents, 0);
  const activeCount = filtered.filter((campaign) => campaign.status === 'active').length;
  const pendingApprovals = filtered.filter((campaign) => campaign.approvalStatus === 'pending').length;

  const attribution = getAttributionTouches();
  let leadsGenerated = attribution.length;
  let appointmentsBooked = attribution.filter((touch) => touch.appointmentBooked).length;
  let attributedRevenue = attribution.reduce((sum, touch) => sum + touch.saleAmountCents, 0);
  let shopifyRevenue = attribution
    .filter((touch) => touch.channelType === 'Online Shopify')
    .reduce((sum, touch) => sum + touch.saleAmountCents, 0);
  let inStoreRevenue = attribution
    .filter((touch) => touch.channelType === 'In-Store Boutique')
    .reduce((sum, touch) => sum + touch.saleAmountCents, 0);

  if (isDemoPlane()) {
    const robust = generateRobustDemoData(12345);
    actualSpend = robust.totals.spendCents;
    leadsGenerated = robust.totals.paidLeads;
    appointmentsBooked = robust.totals.paidAppointments;
    attributedRevenue = robust.totals.attributedRevenueCents;
    shopifyRevenue = robust.totals.shopifyRevenueCents;
    inStoreRevenue = robust.totals.inStoreRevenueCents;
  }

  const roas = actualSpend > 0 ? Number((attributedRevenue / actualSpend).toFixed(2)) : 0;
  const marketingEfficiencyRatioPct =
    actualSpend > 0 ? Number(((attributedRevenue / actualSpend) * 100).toFixed(1)) : 0;

  return {
    totalApprovedBudgetCents: totalApproved,
    actualSpendCents: actualSpend,
    remainingBudgetCents: Math.max(0, totalApproved - actualSpend),
    spendPacingPct: totalApproved > 0 ? Math.round((actualSpend / totalApproved) * 100) : 0,
    activeCampaignsCount: activeCount,
    pendingApprovalsCount: pendingApprovals,
    leadsGeneratedCount: leadsGenerated,
    costPerLeadCents: leadsGenerated > 0 ? Math.round(actualSpend / leadsGenerated) : 0,
    appointmentsBookedCount: appointmentsBooked,
    costPerAppointmentCents:
      appointmentsBooked > 0 ? Math.round(actualSpend / appointmentsBooked) : 0,
    attributedRevenueCents: attributedRevenue,
    roasMultiplier: roas,
    marketingEfficiencyRatioPct,
    shopifyRevenueCents: shopifyRevenue,
    inStoreRevenueCents: inStoreRevenue,
    emergencyPauseActive: getEmergencyPauseStatus(),
  };
}

const INITIAL_SEED_LEADS: DiscoveredLead[] = isDemoPlane()
  ? [
      {
        id: 'lead_1',
        source: 'reddit',
        author: 'u/BatonRougeBride27',
        content:
          'Just got engaged over the weekend! Where are the best places in BR or Covington to look for modern bridal gowns?',
        intentScore: 'High',
        discoveredAt: new Date(Date.now() - 3_600_000).toISOString(),
        url: 'https://reddit.com/r/batonrouge',
        brand: 'ido',
      },
      {
        id: 'lead_2',
        source: 'tiktok',
        author: '@summer_style_louisiana',
        content:
          'Looking for some cute linen sets for a bachelorette trip to 30A next month, any local boutique recs?',
        intentScore: 'High',
        discoveredAt: new Date(Date.now() - 7_200_000).toISOString(),
        url: 'https://tiktok.com',
        brand: 'proper',
      },
    ]
  : [];

export function getDiscoveredLeads(brandFilter: string = 'all'): DiscoveredLead[] {
  if (brandFilter === 'all') return INITIAL_SEED_LEADS;
  return INITIAL_SEED_LEADS.filter((lead) => lead.brand === brandFilter);
}

export function generateSimulatedOutreach(leadId: string): Promise<OutreachDraft> {
  if (!isDemoPlane()) {
    return Promise.reject(new Error('AI Outreach Generation requires active backend or demo mode.'));
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `draft_${Date.now()}`,
        leadId,
        draftContent:
          "Hi there! Congratulations! We saw you're looking for outfits in the area. We have exactly that style at our boutique. We'd love to host you whenever you're ready!",
        generatedAt: new Date().toISOString(),
        status: 'pending_approval',
      });
    }, 1500);
  });
}
