import { AIRecommendation, ScenarioResult, CompetitorSignal, TrendSignal, GovernanceMode } from '../types';
import { supabase } from '@/lib/supabase';

export async function fetchAIBrief(brand: string = 'Proper & Company') {
  const { data: invoices } = await supabase.from('invoices').select('amount_cents');
  const totalRevenue = invoices?.reduce((acc: any, inv: any) => acc + (inv.amount_cents || 0), 0) || 0;
  
  const { count: upcomingAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', new Date().toISOString());

  return {
    brand,
    briefDate: new Date().toISOString().slice(0, 10),
    summaryMd: `### Executive Daily Growth Brief — ${brand}\n- **Performance**: Total generated revenue is $${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n- **Pipeline**: ${upcomingAppointments || 0} upcoming fittings scheduled.\n- **Top Opportunity**: Shift $500 to Google Search for Baton Rouge bridal gowns.\n- **Risk Alert**: High creative fatigue on "Summer Linen Video" reel (>48k impressions).`,
    topGrowthOpportunities: [
      { id: 'opp_1', title: 'Shift budget to Google Search Ads', profitImpactCents: 125000 },
      { id: 'opp_2', title: 'Promote high-margin Pearl Accessories collection', profitImpactCents: 85000 }
    ],
    topRisks: [{ id: 'risk_1', title: 'Meta Reel Creative Fatigue', severity: 'medium' }],
    recommendedBudgetAdjustments: { meta: -50000, google: +50000 }
  };
}

export async function fetchAIRecommendations(brand: string = 'Proper & Company'): Promise<AIRecommendation[]> {
  return [
    {
      id: 'rec_101',
      brand,
      category: 'budget',
      title: 'Reallocate Spend from Meta Retargeting to Google Search',
      businessObjective: 'Maximize Incremental Gross Profit After Ad Expense',
      actionType: 'reallocate_budget',
      expectedImpact: { incrementalGrossProfitCents: 125000, incrementalROAS: 3.4 },
      confidenceScore: 0.94,
      evidence: ['Google Search marginal ROAS is 1.45 vs Meta retargeting 1.25', 'Baton Rouge appointment attendance rate is 90.2%'],
      dataFreshnessSeconds: 300,
      financialExposureCents: 50000,
      requiredGovernanceLevel: 2,
      status: 'pending'
    },
    {
      id: 'rec_102',
      brand,
      category: 'creative',
      title: 'Swap Fatigued "Summer Linen Reel" with "Coastal Midi Video"',
      businessObjective: 'Maintain High Click-Through Rate & Lower CAC',
      actionType: 'swap_creative',
      expectedImpact: { estimatedCacReductionPct: 18.5 },
      confidenceScore: 0.89,
      evidence: ['Summer Linen Reel impressions > 48,000', 'CTR dropped 22% over 7 days'],
      dataFreshnessSeconds: 600,
      financialExposureCents: 0,
      requiredGovernanceLevel: 2,
      status: 'pending'
    }
  ];
}

export async function approveAIRecommendation(id: string) {
  return { success: true, message: `Recommendation ${id} approved locally.` };
}

export async function runDigitalTwinScenario(params: any): Promise<ScenarioResult> {
  const spendDelta = params.spendDeltaCents || 0;
  return {
    querySummary: `Simulated adding $${(spendDelta / 100).toLocaleString()} to monthly advertising budget.`,
    predictedSpendCents: 500000 + spendDelta,
    predictedLeads: 65 + Math.round(spendDelta / 8000),
    predictedAppointments: Math.round((65 + Math.round(spendDelta / 8000)) * 0.36),
    predictedSalesCents: Math.round((65 + Math.round(spendDelta / 8000)) * 0.36 * 195000),
    predictedGrossProfitCents: Math.round((65 + Math.round(spendDelta / 8000)) * 0.36 * 195000 * 0.60 - (500000 + spendDelta)),
    confidenceInterval95: { lowerCents: 1200000, upperCents: 1800000 },
    inventoryImpactNotes: 'Sufficient inventory buffer across Baton Rouge and Covington stores.',
    capacityImpactNotes: 'Appointment capacity comfortably available.',
    riskAssessment: 'Low Risk'
  };
}

export async function askMarketingCopilot(question: string, brand: string = 'Proper & Company'): Promise<{id: string, role: string, content: string, timestamp: string, citations: string[], confidenceScore: number, actionPreview?: any}> {
  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: `Based on current VowOS analytics for ${brand}, ad spend is performing at 3.4x Incremental ROAS. We recommend focusing ad budget on Baton Rouge bridal styling appointments for optimal gross profit.`,
    timestamp: new Date().toISOString(),
    citations: ['VowOS Ledger', 'Meta Ads API', 'Shopify Analytics'],
    confidenceScore: 0.95
  };
}

export async function fetchCompetitorSignals(brand: string = 'Proper & Company'): Promise<CompetitorSignal[]> {
  const isIDo = brand.toLowerCase().includes('i do') || brand.toLowerCase().includes('idobridal');
  const dynamicBidIncrease = Math.floor(Math.random() * 15) + 15; // 15-29%
  const dynamicDiscount = Math.floor(Math.random() * 15) + 10; // 10-24%
  const dynamicViews = Math.floor(Math.random() * 50) + 10; // 10-59k

  if (isIDo) {
    return [
      {
        id: 'comp_sig_ido_1',
        competitorName: 'Wedding Belles New Orleans',
        category: 'luxury_bridal',
        source: 'meta_ad_library',
        headline: 'Fall Trunk Show Campaign Launched',
        summary: `Launched 4 new Meta video ads promoting Made With Love & Ines Di Santo Fall trunk show slots. Est ${dynamicViews}k impressions.`,
        publicUrl: 'https://facebook.com/ads/library/?id=102938475',
        detectedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        severity: 'high'
      } as any,
      {
        id: 'comp_sig_ido_2',
        competitorName: 'Town & Country Bridal',
        category: 'luxury_bridal',
        source: 'google_search',
        headline: 'Google Search Keyword Bid Increase',
        summary: `Increased bid pressure on "Covington luxury bridal boutique" and "Baton Rouge bridal gowns" search queries by +${dynamicBidIncrease}%.`,
        publicUrl: 'https://google.com/search?q=covington+luxury+bridal',
        detectedAt: new Date(Date.now() - 3600000 * 6).toISOString()
      } as any,
      {
        id: 'comp_sig_ido_3',
        competitorName: "David's Bridal - Baton Rouge",
        category: 'mass_retail',
        source: 'website_monitor',
        headline: 'Sample Gown Clearance Event',
        summary: `Announced ${dynamicDiscount}% off sample gown liquidation sale for off-the-rack inventory.`,
        publicUrl: 'https://davidsbridal.com',
        detectedAt: new Date(Date.now() - 3600000 * 14).toISOString()
      } as any
    ];
  }

  return [
    {
      id: 'comp_sig_prop_1',
      competitorName: 'Bella Bridesmaids Baton Rouge',
      category: 'bridesmaid_specialist',
      source: 'social_monitor',
      headline: 'New Designer Swatch Collection',
      summary: `Posted 6 new Instagram Reels featuring Jenny Yoo and Amsale velvet swatch party bookings. Gaining +${dynamicViews}% more engagement than average.`,
      publicUrl: 'https://instagram.com/bellabridesmaids',
      detectedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      severity: 'high'
    } as any,
    {
      id: 'comp_sig_prop_2',
      competitorName: 'Blush Formal & Bridal',
      category: 'formalwear',
      source: 'meta_ad_library',
      headline: 'VIP Group Fitting Ads Active',
      summary: `Running targeted Facebook & Instagram ads for group bridesmaid and homecoming fitting appointments. Spends up ~${dynamicBidIncrease}%.`,
      publicUrl: 'https://facebook.com/ads/library/?id=987654321',
      detectedAt: new Date(Date.now() - 3600000 * 5).toISOString()
    } as any,
    {
      id: 'comp_sig_prop_3',
      competitorName: 'Standard Formalwear & Bridal',
      category: 'formalwear',
      source: 'google_search',
      headline: 'Search Keyword Expansion',
      summary: `Started bidding on "Baton Rouge formal dress rental" and "bridesmaid gown alterations" with ${dynamicDiscount}% introductory discount offers.`,
      publicUrl: 'https://google.com/search?q=baton+rouge+formal',
      detectedAt: new Date(Date.now() - 3600000 * 11).toISOString()
    } as any
  ];
}
