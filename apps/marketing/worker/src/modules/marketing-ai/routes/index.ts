import { Router } from 'express';
import { GovernanceEngine } from '../governance-and-copilot/governance';
import { ExecutiveCopilotAssistant } from '../governance-and-copilot/copilot-assistant';
import { ConstrainedBudgetOptimizer } from '../optimization-and-twin/budget-optimizer';
import { ProperDigitalTwin } from '../optimization-and-twin/digital-twin';
import { LeadScoringModel } from '../predictive-portfolio/lead-scorer';
import { CreativeIntelligenceEngine } from '../creative-intelligence/creative-analyzer';
import { PublicSignalsCollector } from '../competitor-and-trend/public-signals';
import { DataQualityEngine } from '../events-and-quality/data-quality';

export const marketingAIRouter = Router();

// 1. Executive Briefing
marketingAIRouter.get('/brief', (req, res) => {
  const brand = (req.query.brand as string) || 'Proper & Company';
  res.json({
    brand,
    briefDate: new Date().toISOString().slice(0, 10),
    summaryMd: `### Executive Daily Growth Brief — ${brand}\n- **Performance**: Incremental gross profit is up +14.2% week-over-week.\n- **Top Opportunity**: Shift $500 to Google Search for Baton Rouge bridal gowns.\n- **Risk Alert**: High creative fatigue on "Summer Linen Video" reel (>48k impressions).`,
    topGrowthOpportunities: [
      { id: 'opp_1', title: 'Shift budget to Google Search Ads', profitImpactCents: 125000 },
      { id: 'opp_2', title: 'Promote high-margin Pearl Accessories collection', profitImpactCents: 85000 }
    ],
    topRisks: [
      { id: 'risk_1', title: 'Meta Reel Creative Fatigue', severity: 'medium' }
    ],
    recommendedBudgetAdjustments: { meta: -50000, google: +50000 }
  });
});

// 2. Recommendations List & Actions
marketingAIRouter.get('/recommendations', (req, res) => {
  const brand = (req.query.brand as string) || 'Proper & Company';
  res.json({
    recommendations: [
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
    ]
  });
});

marketingAIRouter.post('/recommendations/:id/approve', (req, res) => {
  res.json({ success: true, message: `Recommendation ${req.params.id} approved. Durable job queued.`, idempotencyKey: `idemp_${Date.now()}` });
});

marketingAIRouter.post('/recommendations/:id/dismiss', (req, res) => {
  res.json({ success: true, message: `Recommendation ${req.params.id} dismissed.` });
});

marketingAIRouter.post('/recommendations/:id/snooze', (req, res) => {
  res.json({ success: true, message: `Recommendation ${req.params.id} snoozed for 24 hours.` });
});

// 3. Digital Twin & Optimizer
marketingAIRouter.get('/optimizer', (req, res) => {
  const brand = (req.query.brand as string) || 'Proper & Company';
  const result = ConstrainedBudgetOptimizer.optimizeAllocations({
    brand,
    totalMonthlyLimitCents: 1000000, // $10,000
    currentAllocations: { meta: 500000, google: 350000, pinterest: 150000 },
    capacityConstraints: { batonRougeMaxAppointmentsPerWeek: 30, covingtonMaxAppointmentsPerWeek: 25 }
  });
  res.json(result);
});

marketingAIRouter.post('/scenarios', (req, res) => {
  const result = ProperDigitalTwin.simulateScenario(req.body || {});
  res.json(result);
});

// 4. Copilot NLP Assistant
marketingAIRouter.post('/copilot', async (req, res) => {
  const { question, brand } = req.body;
  const reply = await ExecutiveCopilotAssistant.processUserQuestion(question || '', brand || 'Proper & Company');
  res.json(reply);
});

// 5. Competitors & Trends
marketingAIRouter.get('/competitors', (req, res) => {
  const brand = (req.query.brand as string) || 'Proper & Company';
  res.json({ signals: PublicSignalsCollector.getCompetitorSignals(brand) });
});

marketingAIRouter.get('/trends', (req, res) => {
  res.json({ trends: PublicSignalsCollector.getTrendSignals() });
});

// 6. Data Quality & Governance
marketingAIRouter.get('/data-quality', (req, res) => {
  const brand = (req.query.brand as string) || 'Proper & Company';
  res.json(DataQualityEngine.evaluateQuality(brand));
});

marketingAIRouter.get('/governance', (req, res) => {
  res.json({
    mode: GovernanceEngine.getGovernanceMode(),
    killSwitchState: GovernanceEngine.getKillSwitchState()
  });
});

marketingAIRouter.post('/governance', (req, res) => {
  const { mode, killSwitchKey, killSwitchValue } = req.body;
  if (mode !== undefined) GovernanceEngine.setGovernanceMode(mode);
  if (killSwitchKey) GovernanceEngine.setKillSwitch(killSwitchKey, killSwitchValue);
  res.json({ success: true, mode: GovernanceEngine.getGovernanceMode(), killSwitchState: GovernanceEngine.getKillSwitchState() });
});
