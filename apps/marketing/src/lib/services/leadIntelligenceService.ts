/**
 * Unified Lead Intelligence & Revenue Service
 * Shared single source of truth for Leads (Execution Center) and Marketing (Strategy & Budget Control Center).
 */
import { getActiveDataPlane } from '@/lib/supabase';

export interface LeadSourceTouch {
  id: string;
  leadId: string;
  provider: 'meta' | 'google' | 'tiktok' | 'pinterest' | 'shopify' | 'vowos' | 'klaviyo' | 'call_tracking';
  accountId: string;
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  adId?: string;
  adName?: string;
  creativeId?: string;
  creativeName?: string;
  keyword?: string;
  searchTerm?: string;
  placement?: string;
  device?: string;
  landingPage?: string;
  formId?: string;
  formName?: string;
  source: string;
  medium: string;
  content?: string;
  term?: string;
  clickIdType?: 'fbclid' | 'gclid' | 'ttclid' | 'msclkid';
  clickIdEncrypted?: string;
  sessionId?: string;
  occurredAt: string;
  touchType: 'first_touch' | 'middle_touch' | 'last_touch' | 'conversion_touch';
}

export type CostAllocationMethod =
  | 'direct_provider'
  | 'ad_level_allocated'
  | 'ad_group_allocated'
  | 'campaign_average'
  | 'modeled_estimate'
  | 'unknown';

export interface LeadCostAllocation {
  id: string;
  leadId: string;
  provider: string;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  amountCents: number;
  currency: string;
  allocationMethod: CostAllocationMethod;
  spendWindowStart: string;
  spendWindowEnd: string;
  attributionModel: string;
  confidence: number; // 0 - 100%
  calculatedAt: string;
}

export interface LeadAIScore {
  id: string;
  leadId: string;
  responseProbability: number; // 0 - 1
  bookingProbability: number; // 0 - 1
  attendanceProbability: number; // 0 - 1
  saleProbability: number; // 0 - 1
  expectedRevenueCents: number;
  expectedGrossProfitCents: number;
  expectedCLVCents: number;
  noShowRisk: 'Low' | 'Medium' | 'High';
  cancellationRisk: 'Low' | 'Medium' | 'High';
  recommendedUrgency: 'Immediate (5m)' | 'High (15m)' | 'Normal (1h)' | 'Low';
  recommendedContactChannel: 'SMS' | 'Call' | 'Email';
  explanation: string;
  calculatedAt: string;
}

export interface LeadNextAction {
  id: string;
  leadId: string;
  actionType:
    | 'call_now'
    | 'send_text'
    | 'send_email'
    | 'send_booking_link'
    | 'confirm_appointment'
    | 'offer_alternate_time'
    | 'assign_specialist'
    | 'send_product_options'
    | 'schedule_followup'
    | 'add_to_nurture'
    | 'escalate_to_manager'
    | 'mark_duplicate';
  recommendedChannel: 'SMS' | 'Call' | 'Email';
  dueAt: string;
  confidence: number;
  reason: string;
  suggestedMessageDraft?: string;
  status: 'pending' | 'approved' | 'completed' | 'dismissed';
}

export interface UnifiedLeadRecord {
  id: string;
  brand: 'Proper & Co.' | 'I Do Bridal Couture';
  boutiqueId: 'ido-br' | 'ido-cov' | 'all';
  locationName: string;
  name: string;
  email: string;
  phone: string;
  weddingDate?: string;
  eventDate?: string;
  occasion: string;
  budgetCents: number;
  stage:
    | 'New'
    | 'Contact Attempted'
    | 'Contacted'
    | 'Appointment Requested'
    | 'Appointment Set'
    | 'Confirmed'
    | 'Completed'
    | 'Won'
    | 'Lost'
    | 'Nurture';
  priority: 'High' | 'Medium' | 'Low';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  sourcePlatform: 'Meta (Instagram/FB)' | 'Google Ads' | 'TikTok' | 'Pinterest' | 'Shopify' | 'Website' | 'QR Code' | 'Referral';
  campaignName: string;
  productInterest?: string;
  createdAt: string;
  lastContactedAt?: string;
  firstResponseMinutes?: number;
  slaStatus: 'Met' | 'Warning' | 'Breached' | 'Pending';
  costCents: number;
  costAllocationMethod: CostAllocationMethod;
  touches: LeadSourceTouch[];
  aiScore: LeadAIScore;
  nextAction: LeadNextAction;
  appointmentId?: string;
  contractId?: string;
  invoiceId?: string;
  revenueCents?: number;
  grossProfitCents?: number;
  isSimulatedDemo?: boolean;
}

export interface LeadGenerationAsset {
  id: string;
  brand: 'Proper & Co.' | 'I Do Bridal Couture';
  boutiqueId: 'ido-br' | 'ido-cov' | 'all';
  assetType: 'appointment_page' | 'inquiry_form' | 'event_registration' | 'trunk_show' | 'facebook_lead_form' | 'instagram_lead_form' | 'google_lead_asset' | 'shopify_inquiry' | 'qr_code';
  provider: 'meta' | 'google' | 'tiktok' | 'pinterest' | 'shopify' | 'vowos';
  name: string;
  objective: string;
  destination: string;
  fields: string[];
  routingStrategy: 'round_robin' | 'availability' | 'geographic' | 'specialist';
  assignedStaffId?: string;
  status: 'draft' | 'publishing' | 'active' | 'paused';
  publishedAt?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  leadsGeneratedCount: number;
}

// ── Initial Seed Lead Dataset ──
export const INITIAL_SEED_LEADS: UnifiedLeadRecord[] = [
  {
    id: 'lead-101',
    brand: 'I Do Bridal Couture',
    boutiqueId: 'ido-br',
    locationName: 'Baton Rouge Downtown',
    name: 'Camille Fontenot',
    email: 'camille.f@gmail.com',
    phone: '(225) 555-0142',
    weddingDate: '2026-10-18',
    eventDate: '2026-10-18',
    occasion: 'Bridal Consultation',
    budgetCents: 450000,
    stage: 'Appointment Requested',
    priority: 'High',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Ramsey Roberts',
    sourcePlatform: 'Meta (Instagram/FB)',
    campaignName: 'Baton Rouge Luxury Fall 2026 Lookbook',
    productInterest: 'Monique Lhuillier - Fleur Gown',
    createdAt: '2026-07-27T14:30:00Z',
    lastContactedAt: '2026-07-27T14:34:00Z',
    firstResponseMinutes: 4,
    slaStatus: 'Met',
    costCents: 2450, // $24.50 CPL
    costAllocationMethod: 'direct_provider',
    touches: [
      {
        id: 't-1',
        leadId: 'lead-101',
        provider: 'meta',
        accountId: 'act-9921',
        campaignId: 'cmp-meta-br-fall',
        campaignName: 'Baton Rouge Luxury Fall 2026 Lookbook',
        adGroupId: 'adset-luxury-br',
        adGroupName: 'Baton Rouge 25-40 High Income Brides',
        adId: 'ad-fleur-video',
        adName: 'Fleur Gown 15s Video Reel',
        creativeId: 'cr-8821',
        creativeName: 'Champagne Silk Runway Carousel',
        landingPage: 'https://robertsenterprises.vowos.com/book?campaign=br-fall',
        formId: 'form-meta-101',
        formName: 'Baton Rouge VIP Consultation Request',
        source: 'instagram',
        medium: 'paid_social',
        occurredAt: '2026-07-27T14:30:00Z',
        touchType: 'first_touch',
      },
    ],
    aiScore: {
      id: 'score-101',
      leadId: 'lead-101',
      responseProbability: 0.94,
      bookingProbability: 0.88,
      attendanceProbability: 0.92,
      saleProbability: 0.78,
      expectedRevenueCents: 480000,
      expectedGrossProfitCents: 264000,
      expectedCLVCents: 550000,
      noShowRisk: 'Low',
      cancellationRisk: 'Low',
      recommendedUrgency: 'Immediate (5m)',
      recommendedContactChannel: 'SMS',
      explanation: 'High budget request for Baton Rouge flagship. Instagram engagement on Monique Lhuillier reel with wedding date in 8 months.',
      calculatedAt: '2026-07-27T14:31:00Z',
    },
    nextAction: {
      id: 'act-101',
      leadId: 'lead-101',
      actionType: 'confirm_appointment',
      recommendedChannel: 'SMS',
      dueAt: '2026-07-27T15:00:00Z',
      confidence: 0.96,
      reason: 'Bride requested Saturday 11 AM suite appointment. Confirm suite availability immediately.',
      suggestedMessageDraft: 'Hi Camille! This is Ramsey at I Do Bridal Couture Baton Rouge. We received your request for Saturday at 11 AM! Shall I reserve Suite 1 for you?',
      status: 'pending',
    },
  },
  {
    id: 'lead-102',
    brand: 'Proper & Co.',
    boutiqueId: 'ido-cov',
    locationName: 'Covington Boutique',
    name: 'Helena Vance',
    email: 'helena.vance@yahoo.com',
    phone: '(985) 555-0189',
    weddingDate: '2026-11-05',
    eventDate: '2026-11-05',
    occasion: 'Mother of the Bride',
    budgetCents: 280000,
    stage: 'New',
    priority: 'High',
    assignedEmployeeId: 'emp-2',
    assignedEmployeeName: 'Sarah Jenkins',
    sourcePlatform: 'Google Ads',
    campaignName: 'Covington Mother-of-the-Bride Search',
    productInterest: 'Evening & Gala Collection',
    createdAt: '2026-07-27T16:15:00Z',
    slaStatus: 'Warning',
    costCents: 1870, // $18.70 CPL
    costAllocationMethod: 'ad_level_allocated',
    touches: [
      {
        id: 't-2',
        leadId: 'lead-102',
        provider: 'google',
        accountId: 'gads-5521',
        campaignId: 'cmp-gads-cov-mob',
        campaignName: 'Covington Mother-of-the-Bride Search',
        keyword: 'mother of the bride gowns covington la',
        searchTerm: 'best mother of the bride dress shops near covington',
        landingPage: 'https://properandco.com/collections/mother-of-the-bride',
        source: 'google',
        medium: 'cpc',
        occurredAt: '2026-07-27T16:15:00Z',
        touchType: 'first_touch',
      },
    ],
    aiScore: {
      id: 'score-102',
      leadId: 'lead-102',
      responseProbability: 0.89,
      bookingProbability: 0.82,
      attendanceProbability: 0.85,
      saleProbability: 0.71,
      expectedRevenueCents: 310000,
      expectedGrossProfitCents: 170500,
      expectedCLVCents: 380000,
      noShowRisk: 'Low',
      cancellationRisk: 'Low',
      recommendedUrgency: 'High (15m)',
      recommendedContactChannel: 'Call',
      explanation: 'Active Google Search intent for Covington boutique. Mother-of-the-bride leads historically convert at 71% when called within 15 mins.',
      calculatedAt: '2026-07-27T16:16:00Z',
    },
    nextAction: {
      id: 'act-102',
      leadId: 'lead-102',
      actionType: 'call_now',
      recommendedChannel: 'Call',
      dueAt: '2026-07-27T16:30:00Z',
      confidence: 0.92,
      reason: 'Lead arrived 12 minutes ago from Google Search. Call now before response SLA breach.',
      suggestedMessageDraft: 'Hi Helena, this is Sarah from Proper & Co. Covington! I saw your inquiry for Mother-of-the-Bride styling options and would love to help you find the perfect gown.',
      status: 'pending',
    },
  },
];

/** Single service class for lead operations */
export class LeadIntelligenceService {
  private static instance: LeadIntelligenceService;
  private leads: UnifiedLeadRecord[] = getActiveDataPlane() === 'demo' ? [...INITIAL_SEED_LEADS] : [];
  private assets: LeadGenerationAsset[] = getActiveDataPlane() === 'demo' ? [
    {
      id: 'asset-1',
      brand: 'I Do Bridal Couture',
      boutiqueId: 'ido-br',
      assetType: 'appointment_page',
      provider: 'vowos',
      name: 'Baton Rouge VIP Suite Booking Page',
      objective: 'Generate appointments',
      destination: '/book',
      fields: ['First Name', 'Last Name', 'Email', 'Phone', 'Wedding Date', 'Budget'],
      routingStrategy: 'round_robin',
      status: 'active',
      publishedAt: '2026-01-15T00:00:00Z',
      utmSource: 'vowos',
      utmMedium: 'organic',
      utmCampaign: 'br-suite-booking',
      leadsGeneratedCount: 142,
    },
    {
      id: 'asset-2',
      brand: 'Proper & Co.',
      boutiqueId: 'ido-cov',
      assetType: 'facebook_lead_form',
      provider: 'meta',
      name: 'Covington Trunk Show Lead Form',
      objective: 'Generate event registrations',
      destination: 'meta_lead_form_cov_882',
      fields: ['First Name', 'Email', 'Phone', 'Occasion'],
      routingStrategy: 'specialist',
      status: 'active',
      publishedAt: '2026-02-01T00:00:00Z',
      utmSource: 'facebook',
      utmMedium: 'paid_social',
      utmCampaign: 'cov-trunk-show-2026',
      leadsGeneratedCount: 89,
    },
  ] : [];

  public static getInstance(): LeadIntelligenceService {
    if (!LeadIntelligenceService.instance) {
      LeadIntelligenceService.instance = new LeadIntelligenceService();
    }
    return LeadIntelligenceService.instance;
  }

  public getLeads(): UnifiedLeadRecord[] {
    return this.leads;
  }

  public getLeadById(id: string): UnifiedLeadRecord | undefined {
    return this.leads.find((l) => l.id === id);
  }

  public getAssets(): LeadGenerationAsset[] {
    return this.assets;
  }

  public createAsset(asset: Omit<LeadGenerationAsset, 'id' | 'leadsGeneratedCount' | 'status'>): LeadGenerationAsset {
    const newAsset: LeadGenerationAsset = {
      ...asset,
      id: `asset-${Date.now()}`,
      status: 'active',
      publishedAt: new Date().toISOString(),
      leadsGeneratedCount: 0,
    };
    this.assets.unshift(newAsset);
    return newAsset;
  }

  public advanceStage(leadId: string, nextStage: UnifiedLeadRecord['stage']): UnifiedLeadRecord | undefined {
    const lead = this.leads.find((l) => l.id === leadId);
    if (lead) {
      lead.stage = nextStage;
      if (nextStage === 'Contacted' || nextStage === 'Contact Attempted') {
        lead.lastContactedAt = new Date().toISOString();
        lead.slaStatus = 'Met';
      }
    }
    return lead;
  }
}

export const leadService = LeadIntelligenceService.getInstance();
