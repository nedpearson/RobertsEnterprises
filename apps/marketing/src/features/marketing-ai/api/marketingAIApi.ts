import { AIRecommendation, ScenarioResult, CompetitorSignal, TrendSignal, GovernanceMode } from '../types';
import { getActiveDataPlane } from '@/lib/supabase';

const WORKER_BASE_URL = 'http://localhost:8080/api/marketing-ai';

export async function fetchAIBrief(brand: string = 'Proper & Company') {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/brief?brand=${encodeURIComponent(brand)}`);
    if (res.ok) return await res.json();
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker API offline, serving simulated local brief.');
  }

  return {
    brand,
    briefDate: new Date().toISOString().slice(0, 10),
    summaryMd: `### Executive Daily Growth Brief — ${brand}\n- **Performance**: Incremental gross profit is up +14.2% week-over-week.\n- **Top Opportunity**: Shift $500 to Google Search for Baton Rouge bridal gowns.\n- **Risk Alert**: High creative fatigue on "Summer Linen Video" reel (>48k impressions).`,
    topGrowthOpportunities: [
      { id: 'opp_1', title: 'Shift budget to Google Search Ads', profitImpactCents: 125000 },
      { id: 'opp_2', title: 'Promote high-margin Pearl Accessories collection', profitImpactCents: 85000 }
    ],
    topRisks: [{ id: 'risk_1', title: 'Meta Reel Creative Fatigue', severity: 'medium' }],
    recommendedBudgetAdjustments: { meta: -50000, google: +50000 }
  };
}

export async function fetchAIRecommendations(brand: string = 'Proper & Company'): Promise<AIRecommendation[]> {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/recommendations?brand=${encodeURIComponent(brand)}`);
    if (res.ok) {
      const data = await res.json();
      return data.recommendations;
    }
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker API offline, serving simulated local recommendations.');
  }

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
  try {
    const res = await fetch(`${WORKER_BASE_URL}/recommendations/${id}/approve`, { method: 'POST' });
    if (res.ok) return await res.json();
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker offline, simulating approval locally.');
  }
  return { success: true, message: `Recommendation ${id} approved locally.` };
}

export async function runDigitalTwinScenario(params: any): Promise<ScenarioResult> {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (res.ok) return await res.json();
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker offline, calculating scenario locally.');
  }

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

export async function askMarketingCopilot(question: string, brand: string = 'Proper & Company') {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, brand })
    });
    if (res.ok) return await res.json();
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker offline, returning simulated local copilot context.');
  }

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
  try {
    const res = await fetch(`${WORKER_BASE_URL}/competitors?brand=${encodeURIComponent(brand)}`);
    if (res.ok) {
      const data = await res.json();
      return data.signals;
    }
    throw new Error('API Response not ok');
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    console.warn('Worker offline, returning simulated competitor signals.');
  }

  return [
    {
      id: 'comp_sig_1',
      competitorName: 'Baton Rouge Regional Bridal Boutique',
      category: 'local_bridal',
      source: 'meta_ad_library',
      headline: 'Early Trunk Show Promo Ads Launched',
      summary: 'Competitor launched 3 new video ads featuring fall trunk show discounts for upcoming weekend.',
      publicUrl: 'https://facebook.com/ads/library/?id=102938475',
      detectedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
}
