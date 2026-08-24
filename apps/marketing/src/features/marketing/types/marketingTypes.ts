import { LocationId } from '@/data/vowosData';
import { ConnectionTruthDescriptor } from '@/lib/services/connectionTruthService';

export type { ConnectionTruthDescriptor };

export type MarketingProvider = 'meta' | 'google' | 'tiktok' | 'pinterest' | 'linkedin' | 'shopify' | 'klaviyo' | 'call_tracking' | 'web_forms';
export type MarketingBrand = 'ido' | 'proper';
export type MarketingObjective =
  | 'bridal_appointments'
  | 'styling_appointments'
  | 'promote_new_arrivals'
  | 'sell_online'
  | 'trunk_show'
  | 'sample_sale'
  | 'store_event'
  | 'brand_awareness'
  | 'lead_generation'
  | 'website_retargeting'
  | 'cart_abandonment'
  | 'mother_of_the_bride'
  | 'formal_gala'
  | 'mardi_gras'
  | 'accessories';

export type CampaignStatus = 'draft' | 'review' | 'approved' | 'publishing' | 'active' | 'paused' | 'completed' | 'rejected';
export type PostStatus = 'idea' | 'draft' | 'awaiting_approval' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type CreativeType = 'image' | 'video' | 'carousel' | 'story_reel' | 'pin' | 'lead_form' | 'product_ad';
export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5' | '2:3';

export interface MarketingConnection extends ConnectionTruthDescriptor {
  externalBusinessId?: string;
  externalBusinessName?: string;
  connectedAt?: string;
  tokenHealth?: 'Healthy' | 'Expiring Soon' | 'Expired';
  accounts?: MarketingAccount[];
}

export interface MarketingAccount {
  id: string;
  connectionId: string;
  accountType: 'ad_account' | 'page' | 'instagram_prof' | 'analytics' | 'merchant_center' | 'pixel';
  externalAccountId: string;
  externalAccountName: string;
  brand: MarketingBrand;
  locations: LocationId[];
  active: boolean;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  brand: MarketingBrand;
  locations: LocationId[];
  objective: MarketingObjective;
  providers: MarketingProvider[];
  status: CampaignStatus;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  plannedBudgetCents: number;
  approvedBudgetCents: number;
  actualSpendCents: number;
  attributedRevenueCents?: number;
  startDate: string;
  endDate: string;
  targetAudience: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  productId?: string;
  collectionId?: string;
  vendorCoopId?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingContentPost {
  id: string;
  brand: MarketingBrand;
  location: LocationId;
  provider: MarketingProvider;
  postType: 'image' | 'video' | 'carousel' | 'story' | 'reel';
  caption: string;
  mediaUrl: string;
  scheduledAt: string;
  publishedAt?: string;
  status: PostStatus;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  destinationUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  createdBy: string;
}

export interface MarketingCreative {
  id: string;
  name: string;
  brand: MarketingBrand;
  creativeType: CreativeType;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  destinationUrl: string;
  mediaAssetUrl: string;
  aspectRatio: AspectRatio;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  hasBridePhotoConsent: boolean;
  createdAt: string;
}

export interface MarketingAudience {
  id: string;
  name: string;
  brand: MarketingBrand;
  provider: MarketingProvider;
  audienceType: 'website_visitors' | 'cart_abandoners' | 'past_purchasers' | 'lead_form' | 'lookalike' | 'custom_list';
  estimatedSize: number;
  consentVerified: boolean;
  lastSyncedAt: string;
}

export interface MarketingBudget {
  id: string;
  brand: MarketingBrand;
  location: LocationId | 'all';
  provider: MarketingProvider | 'all';
  period: string;
  plannedCents: number;
  approvedCents: number;
  actualSpendCents: number;
  vendorCoopCents: number;
  reimbursedCents: number;
  warningThresholdPct: number;
  hardStopCents: number;
  status: 'on_track' | 'warning' | 'hard_stopped';
}

export interface VendorCoopClaim {
  id: string;
  vendorName: string;
  programName: string;
  brand: MarketingBrand;
  approvedAmountCents: number;
  actualSpendCents: number;
  claimStatus: 'draft' | 'submitted' | 'approved' | 'reimbursed';
  reimbursementCents: number;
  deadlineDate: string;
  notes: string;
}

export interface MarketingAttributionTouch {
  id: string;
  leadId?: string;
  customerName: string;
  provider: MarketingProvider;
  campaignName: string;
  utmSource: string;
  utmMedium: string;
  occurredAt: string;
  appointmentBooked: boolean;
  saleAmountCents: number;
  channelType: 'Online Shopify' | 'In-Store Boutique';
}

export interface MarketingAutomationRule {
  id: string;
  name: string;
  brand: MarketingBrand;
  triggerType: 'inventory_zero' | 'budget_warning' | 'unassigned_lead' | 'low_roas' | 'event_expired';
  condition: string;
  action: string;
  active: boolean;
  requiresApproval: boolean;
  lastTriggeredAt?: string;
}

export interface MarketingMetricsSummary {
  totalApprovedBudgetCents: number;
  actualSpendCents: number;
  remainingBudgetCents: number;
  spendPacingPct: number;
  activeCampaignsCount: number;
  pendingApprovalsCount: number;
  leadsGeneratedCount: number;
  costPerLeadCents: number;
  appointmentsBookedCount: number;
  costPerAppointmentCents: number;
  attributedRevenueCents: number;
  roasMultiplier: number;
  marketingEfficiencyRatioPct: number;
  shopifyRevenueCents: number;
  inStoreRevenueCents: number;
  emergencyPauseActive: boolean;
}

export interface DiscoveredLead {
  id: string;
  source: 'reddit' | 'tiktok' | 'instagram' | 'facebook_group' | 'pinterest';
  author: string;
  content: string;
  intentScore: 'High' | 'Medium' | 'Low';
  discoveredAt: string;
  url: string;
  brand: MarketingBrand;
}

export interface OutreachDraft {
  id: string;
  leadId: string;
  draftContent: string;
  generatedAt: string;
  status: 'pending_approval' | 'approved_sent' | 'rejected';
}
