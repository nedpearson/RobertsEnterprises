export type GovernanceMode = 0 | 1 | 2 | 3;

export interface AIRecommendation {
  id: string;
  brand: string;
  category: 'budget' | 'creative' | 'lead' | 'product' | 'campaign';
  title: string;
  businessObjective: string;
  actionType: string;
  expectedImpact: Record<string, any>;
  confidenceScore: number;
  evidence: string[];
  dataFreshnessSeconds: number;
  financialExposureCents: number;
  requiredGovernanceLevel: GovernanceMode;
  status: 'pending' | 'approved' | 'dismissed' | 'snoozed' | 'executed';
  dismissalReason?: string;
}

export interface ScenarioResult {
  querySummary: string;
  predictedSpendCents: number;
  predictedLeads: number;
  predictedAppointments: number;
  predictedSalesCents: number;
  predictedGrossProfitCents: number;
  confidenceInterval95: { lowerCents: number; upperCents: number };
  inventoryImpactNotes: string;
  capacityImpactNotes: string;
  riskAssessment: 'Low Risk' | 'Moderate Risk' | 'High Risk';
}

export interface CompetitorSignal {
  id: string;
  competitorName: string;
  category: string;
  source: string;
  headline: string;
  summary: string;
  publicUrl: string;
  detectedAt: string;
}

export interface TrendSignal {
  keyword: string;
  category: string;
  growthVelocityPct: number;
  relevanceScore: number;
  matchedProductCount: number;
  detectedAt: string;
}
