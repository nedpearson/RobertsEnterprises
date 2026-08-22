import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { requireGrowthAccess, growthContextOf, type GrowthContext } from '../../growth/auth';
import { growthDb } from '../../growth/client';

export const marketingAIRouter = Router();

export type MarketingAIContext = GrowthContext;

/** Compatibility exports retained for existing tests/imports. */
export const requireMarketingAIAuth = requireGrowthAccess;
export function requireAIRole(allowedRoles: string[]) {
  const normalized = new Set(allowedRoles.map((role) => role.toUpperCase()));
  return (req: Request, res: Response, next: NextFunction) => {
    const context = growthContextOf(req);
    if (!normalized.has(context.role.toUpperCase())) {
      return res.status(403).json({ error: 'Insufficient permissions for this action.' });
    }
    next();
  };
}

marketingAIRouter.use(requireGrowthAccess);

const dateDaysAgo = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

interface CampaignRow {
  id: string;
  network: string;
  name: string;
  status: string | null;
  location_id: string | null;
}

interface MetricRow {
  campaign_id: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  qualified_leads: number;
  appointments_booked: number;
  appointments_attended: number;
  sales: number;
  revenue_cents: number;
  gross_profit_cents: number;
  platform_reported_conversions: number;
}

interface CampaignFact {
  id: string;
  network: string;
  name: string;
  status: string | null;
  locationId: string | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualifiedLeads: number;
  appointments: number;
  attended: number;
  sales: number;
  revenueCents: number;
  grossProfitCents: number;
  platformConversions: number;
}

interface PortfolioSummary {
  spendCents: number;
  revenueCents: number;
  grossProfitCents: number;
  leads: number;
  qualifiedLeads: number;
  appointments: number;
  attended: number;
  sales: number;
  roas: number | null;
  grossProfitRoas: number | null;
}

async function loadCampaignFacts(businessId: string, days = 30): Promise<CampaignFact[]> {
  const db = growthDb();
  const [{ data: campaigns, error: campaignError }, { data: metrics, error: metricError }] = await Promise.all([
    db
      .from('growth_ad_campaigns')
      .select('id, network, name, status, location_id')
      .eq('business_id', businessId),
    db
      .from('growth_ad_metrics')
      .select('campaign_id, spend_cents, impressions, clicks, conversions, leads, qualified_leads, appointments_booked, appointments_attended, sales, revenue_cents, gross_profit_cents, platform_reported_conversions')
      .eq('business_id', businessId)
      .gte('metric_date', dateDaysAgo(days)),
  ]);
  if (campaignError) throw new Error(`Could not load campaigns: ${campaignError.message}`);
  if (metricError) throw new Error(`Could not load campaign metrics: ${metricError.message}`);

  const byId = new Map<string, CampaignFact>();
  for (const campaign of (campaigns ?? []) as CampaignRow[]) {
    byId.set(campaign.id, {
      id: campaign.id,
      network: campaign.network,
      name: campaign.name,
      status: campaign.status,
      locationId: campaign.location_id,
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      qualifiedLeads: 0,
      appointments: 0,
      attended: 0,
      sales: 0,
      revenueCents: 0,
      grossProfitCents: 0,
      platformConversions: 0,
    });
  }

  for (const metric of (metrics ?? []) as MetricRow[]) {
    const fact = byId.get(metric.campaign_id);
    if (!fact) continue;
    fact.spendCents += Number(metric.spend_cents ?? 0);
    fact.impressions += Number(metric.impressions ?? 0);
    fact.clicks += Number(metric.clicks ?? 0);
    fact.leads += Number(metric.leads ?? 0);
    fact.qualifiedLeads += Number(metric.qualified_leads ?? 0);
    fact.appointments += Number(metric.appointments_booked ?? 0);
    fact.attended += Number(metric.appointments_attended ?? 0);
    fact.sales += Number(metric.sales ?? 0);
    fact.revenueCents += Number(metric.revenue_cents ?? 0);
    fact.grossProfitCents += Number(metric.gross_profit_cents ?? 0);
    fact.platformConversions += Number(metric.platform_reported_conversions ?? metric.conversions ?? 0);
  }

  return [...byId.values()].filter((row) => row.spendCents > 0 || row.leads > 0 || row.revenueCents > 0);
}

function summarize(facts: CampaignFact[]): PortfolioSummary {
  const totals = facts.reduce(
    (acc, fact) => {
      acc.spendCents += fact.spendCents;
      acc.revenueCents += fact.revenueCents;
      acc.grossProfitCents += fact.grossProfitCents;
      acc.leads += fact.leads;
      acc.qualifiedLeads += fact.qualifiedLeads;
      acc.appointments += fact.appointments;
      acc.attended += fact.attended;
      acc.sales += fact.sales;
      return acc;
    },
    { spendCents: 0, revenueCents: 0, grossProfitCents: 0, leads: 0, qualifiedLeads: 0, appointments: 0, attended: 0, sales: 0 },
  );
  return {
    ...totals,
    roas: totals.spendCents > 0 ? totals.revenueCents / totals.spendCents : null,
    grossProfitRoas: totals.spendCents > 0 && totals.grossProfitCents > 0 ? totals.grossProfitCents / totals.spendCents : null,
  };
}

function effectiveSample(fact: CampaignFact): number {
  return fact.sales * 8 + fact.attended * 4 + fact.appointments * 2 + fact.qualifiedLeads + fact.leads * 0.25;
}

function objectiveValue(fact: CampaignFact, useGrossProfit: boolean): number {
  return useGrossProfit ? fact.grossProfitCents : fact.revenueCents;
}

function shrunkEfficiency(fact: CampaignFact, portfolioEfficiency: number, useGrossProfit: boolean): number {
  if (fact.spendCents <= 0) return portfolioEfficiency;
  const raw = objectiveValue(fact, useGrossProfit) / fact.spendCents;
  const sample = effectiveSample(fact);
  const weight = Math.min(0.85, sample / (sample + 20));
  return raw * weight + portfolioEfficiency * (1 - weight);
}

async function loadGuardrail(businessId: string, locationId: string | null = null) {
  let query = growthDb()
    .from('growth_budget_guardrails')
    .select('*')
    .eq('business_id', businessId);
  query = locationId ? query.eq('location_id', locationId) : query.is('location_id', null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load budget guardrails: ${error.message}`);
  return data as null | {
    monthly_budget_cents: number | null;
    daily_max_adjustment_pct: number;
    target_cac_cents: number | null;
    target_roas: number | null;
    minimum_channel_spend: Record<string, number>;
    maximum_channel_spend: Record<string, number>;
    automation_level: number;
    required_confidence: number;
  };
}

function deriveBudgetRecommendation(facts: CampaignFact[], guardrail: Awaited<ReturnType<typeof loadGuardrail>>) {
  const eligible = facts.filter((fact) => fact.spendCents > 0 && effectiveSample(fact) >= 5);
  if (eligible.length < 2) return null;

  const portfolio = summarize(eligible);
  const useGrossProfit = portfolio.grossProfitCents > 0;
  const objectiveTotal = useGrossProfit ? portfolio.grossProfitCents : portfolio.revenueCents;
  if (portfolio.spendCents <= 0 || objectiveTotal <= 0) return null;

  const portfolioEfficiency = objectiveTotal / portfolio.spendCents;
  const scored = eligible
    .map((fact) => ({ fact, score: shrunkEfficiency(fact, portfolioEfficiency, useGrossProfit) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const worst = scored[scored.length - 1];
  if (!best || !worst || best.fact.id === worst.fact.id) return null;
  if (best.score < worst.score * 1.3) return null;

  const maxAdjustmentPct = Math.max(1, Math.min(25, Number(guardrail?.daily_max_adjustment_pct ?? 15)));
  const transferCents = Math.max(0, Math.round(worst.fact.spendCents * (maxAdjustmentPct / 100)));
  if (transferCents < 1000) return null;

  const sample = effectiveSample(best.fact) + effectiveSample(worst.fact);
  const confidence = Math.min(0.94, 0.55 + Math.min(0.35, sample / 200));
  const expectedDelta = Math.max(0, Math.round(transferCents * (best.score - worst.score)));
  const impactKey = useGrossProfit ? 'projectedIncrementalGrossProfitCents' : 'projectedIncrementalRevenueCents';

  return {
    category: 'budget',
    title: `Test a ${maxAdjustmentPct}% budget shift from ${worst.fact.name} to ${best.fact.name}`,
    actionType: 'reallocate_budget',
    rationale:
      `${best.fact.name} has stronger risk-adjusted ${useGrossProfit ? 'gross-profit' : 'revenue'} return than ${worst.fact.name} over the analyzed window. ` +
      'VowOS applies shrinkage toward the portfolio average so small samples cannot dominate the recommendation. This is observational evidence, not proof of causality.',
    expectedImpact: {
      [impactKey]: expectedDelta,
      proposedTransferCents: transferCents,
      fromCampaignId: worst.fact.id,
      toCampaignId: best.fact.id,
      objective: useGrossProfit ? 'gross_profit' : 'revenue',
    },
    confidence,
    riskLevel: confidence >= 0.8 ? 'low' : 'medium',
    evidence: [
      `${best.fact.name}: ${best.score.toFixed(2)}x shrunk ${useGrossProfit ? 'gross-profit' : 'revenue'} return; ${best.fact.sales} verified sales; ${best.fact.appointments} booked appointments.`,
      `${worst.fact.name}: ${worst.score.toFixed(2)}x shrunk ${useGrossProfit ? 'gross-profit' : 'revenue'} return; ${worst.fact.sales} verified sales; ${worst.fact.appointments} booked appointments.`,
      `Maximum proposed adjustment is capped at ${maxAdjustmentPct}% by the budget guardrail.`,
    ],
    financialExposureCents: transferCents,
  };
}

async function ensureEvidenceBackedRecommendation(businessId: string, days = 42) {
  const db = growthDb();
  const { data: current, error: currentError } = await db
    .from('growth_ai_recommendations')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .gte('created_at', isoDaysAgo(2))
    .order('created_at', { ascending: false })
    .limit(10);
  if (currentError) throw new Error(`Could not load recommendations: ${currentError.message}`);
  if ((current ?? []).length > 0) return current ?? [];

  const [facts, guardrail] = await Promise.all([loadCampaignFacts(businessId, days), loadGuardrail(businessId)]);
  const derived = deriveBudgetRecommendation(facts, guardrail);
  if (!derived) return [];

  const now = new Date();
  const { data: inserted, error } = await db
    .from('growth_ai_recommendations')
    .insert({
      business_id: businessId,
      location_id: null,
      category: derived.category,
      title: derived.title,
      action_type: derived.actionType,
      rationale: derived.rationale,
      expected_impact: derived.expectedImpact,
      confidence_score: derived.confidence,
      risk_level: derived.riskLevel,
      evidence: derived.evidence,
      data_window_start: isoDaysAgo(days),
      data_window_end: now.toISOString(),
      data_freshness_seconds: 0,
      financial_exposure_cents: derived.financialExposureCents,
      governance_level: 2,
      status: 'pending',
      expires_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*');
  if (error) throw new Error(`Could not persist recommendation: ${error.message}`);
  return inserted ?? [];
}

async function buildOptimizer(businessId: string, days = 42, requestedBudgetCents?: number) {
  const [facts, guardrail] = await Promise.all([loadCampaignFacts(businessId, days), loadGuardrail(businessId)]);
  const byNetwork = new Map<string, CampaignFact>();
  for (const fact of facts) {
    let row = byNetwork.get(fact.network);
    if (!row) {
      row = { ...fact, id: fact.network, name: fact.network };
      byNetwork.set(fact.network, row);
      continue;
    }
    row.spendCents += fact.spendCents;
    row.impressions += fact.impressions;
    row.clicks += fact.clicks;
    row.leads += fact.leads;
    row.qualifiedLeads += fact.qualifiedLeads;
    row.appointments += fact.appointments;
    row.attended += fact.attended;
    row.sales += fact.sales;
    row.revenueCents += fact.revenueCents;
    row.grossProfitCents += fact.grossProfitCents;
    row.platformConversions += fact.platformConversions;
  }

  const channels = [...byNetwork.values()].filter((row) => row.spendCents > 0);
  const portfolio = summarize(channels);
  const currentMonthlyEquivalent = Math.round((portfolio.spendCents / Math.max(1, days)) * 30.4375);
  const totalBudget = Math.max(
    0,
    Number(requestedBudgetCents ?? guardrail?.monthly_budget_cents ?? currentMonthlyEquivalent),
  );
  if (channels.length === 0 || portfolio.spendCents <= 0 || portfolio.revenueCents <= 0 || totalBudget <= 0) {
    return {
      status: 'insufficient_data',
      methodology: 'No allocation is generated until VowOS has real channel spend and downstream outcomes.',
      currentMonthlySpendCents: currentMonthlyEquivalent,
      totalBudgetCents: totalBudget,
      allocations: [],
    };
  }

  const useGrossProfit = portfolio.grossProfitCents > 0;
  const objectiveTotal = useGrossProfit ? portfolio.grossProfitCents : portfolio.revenueCents;
  const portfolioEfficiency = objectiveTotal / portfolio.spendCents;
  const maxChange = Math.max(0.01, Math.min(0.25, Number(guardrail?.daily_max_adjustment_pct ?? 15) / 100));

  const scored = channels.map((channel) => ({
    channel,
    score: Math.max(0.05, shrunkEfficiency(channel, portfolioEfficiency, useGrossProfit)),
  }));
  const scoreTotal = scored.reduce((sum, row) => sum + row.score, 0);
  const currentShares = new Map(scored.map((row) => [row.channel.network, row.channel.spendCents / portfolio.spendCents]));

  let proposed = scored.map((row) => {
    const rawShare = row.score / scoreTotal;
    const currentShare = currentShares.get(row.channel.network) ?? 0;
    const lower = Math.max(0, currentShare * (1 - maxChange));
    const upper = Math.min(1, currentShare * (1 + maxChange));
    const boundedShare = Math.max(lower, Math.min(upper, rawShare));
    return { channel: row.channel, score: row.score, share: boundedShare };
  });
  const boundedTotal = proposed.reduce((sum, row) => sum + row.share, 0) || 1;
  proposed = proposed.map((row) => ({ ...row, share: row.share / boundedTotal }));

  return {
    status: 'ready',
    objective: useGrossProfit ? 'gross_profit_after_ad_spend' : 'revenue_return',
    methodology:
      'Conservative empirical-Bayes-style shrinkage toward portfolio performance with bounded reallocation. This is a risk-managed observational optimizer, not a causal incrementality estimate.',
    dataWindowDays: days,
    totalBudgetCents: totalBudget,
    currentMonthlySpendCents: currentMonthlyEquivalent,
    guardrails: {
      maxRelativeChannelChangePct: Math.round(maxChange * 100),
      automationLevel: guardrail?.automation_level ?? 1,
      requiredConfidence: guardrail?.required_confidence ?? 0.8,
    },
    allocations: proposed
      .map((row) => ({
        provider: row.channel.network,
        currentSharePct: Math.round((currentShares.get(row.channel.network) ?? 0) * 10000) / 100,
        recommendedSharePct: Math.round(row.share * 10000) / 100,
        recommendedBudgetCents: Math.round(totalBudget * row.share),
        riskAdjustedReturn: Math.round(row.score * 1000) / 1000,
        evidence: {
          spendCents: row.channel.spendCents,
          leads: row.channel.leads,
          appointments: row.channel.appointments,
          sales: row.channel.sales,
          revenueCents: row.channel.revenueCents,
          grossProfitCents: row.channel.grossProfitCents,
        },
      }))
      .sort((a, b) => b.recommendedBudgetCents - a.recommendedBudgetCents),
  };
}

async function dataQuality(businessId: string) {
  const db = growthDb();
  const [{ data: connections, error: connectionError }, { count: leadCount, error: leadError }, { data: touches, error: touchError }] = await Promise.all([
    db
      .from('growth_provider_connections')
      .select('provider,status,last_sync_at,last_sync_status,last_error')
      .eq('business_id', businessId),
    db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', isoDaysAgo(30)),
    db
      .from('growth_attribution_touchpoints')
      .select('lead_id,customer_id,occurred_at')
      .eq('business_id', businessId)
      .gte('occurred_at', isoDaysAgo(30)),
  ]);
  if (connectionError) throw new Error(connectionError.message);
  if (leadError) throw new Error(leadError.message);
  if (touchError) throw new Error(touchError.message);

  const expected = ['google_ads', 'google_analytics', 'google_search_console', 'meta_ads'];
  const rows = (connections ?? []) as Array<{ provider: string; status: string; last_sync_at: string | null; last_sync_status: string | null; last_error: string | null }>;
  const connected = new Set(rows.filter((row) => row.status === 'connected').map((row) => row.provider));
  const connectionScore = Math.round((expected.filter((provider) => connected.has(provider)).length / expected.length) * 100);

  const freshRows = rows.filter((row) => row.status === 'connected' && row.last_sync_at);
  const freshnessScore = freshRows.length
    ? Math.round(
        freshRows.reduce((sum, row) => {
          const ageHours = (Date.now() - new Date(row.last_sync_at as string).getTime()) / 3_600_000;
          return sum + (ageHours <= 1 ? 100 : ageHours <= 6 ? 80 : ageHours <= 24 ? 55 : 20);
        }, 0) / freshRows.length,
      )
    : 0;

  const touchedLeads = new Set((touches ?? []).map((row) => (row as { lead_id: string | null }).lead_id).filter(Boolean));
  const attributionCoveragePct = leadCount && leadCount > 0 ? Math.min(100, (touchedLeads.size / leadCount) * 100) : null;
  const attributionScore = attributionCoveragePct ?? 0;
  const overall = Math.round(connectionScore * 0.4 + freshnessScore * 0.3 + attributionScore * 0.3);

  const issues: Array<{ severity: string; message: string }> = [];
  for (const provider of expected) {
    if (!connected.has(provider)) issues.push({ severity: 'high', message: `${provider.replace(/_/g, ' ')} is not connected.` });
  }
  for (const row of rows) {
    if (row.last_sync_status === 'failed' || row.status === 'error') {
      issues.push({ severity: 'high', message: row.last_error || `${row.provider} sync is failing.` });
    }
  }
  if (attributionCoveragePct !== null && attributionCoveragePct < 80) {
    issues.push({ severity: 'medium', message: `Only ${attributionCoveragePct.toFixed(1)}% of recent leads have a tracked marketing touchpoint.` });
  }

  return {
    overallConfidenceScore: overall,
    connectionScore,
    freshnessScore,
    attributionCompletenessPct: attributionCoveragePct,
    issuesDetected: issues,
    calculatedAt: new Date().toISOString(),
  };
}

// Executive brief: every number is derived from this tenant's stored facts.
marketingAIRouter.get('/brief', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const [facts, recommendations, quality] = await Promise.all([
      loadCampaignFacts(businessId, 30),
      ensureEvidenceBackedRecommendation(businessId, 42),
      dataQuality(businessId),
    ]);
    const totals = summarize(facts);
    const ranked = facts
      .filter((fact) => fact.spendCents > 0)
      .map((fact) => ({ fact, roas: fact.revenueCents / fact.spendCents }))
      .sort((a, b) => b.roas - a.roas);

    return res.json({
      briefDate: new Date().toISOString().slice(0, 10),
      businessId,
      dataWindowDays: 30,
      summary: totals,
      topCampaign: ranked[0]
        ? { id: ranked[0].fact.id, name: ranked[0].fact.name, network: ranked[0].fact.network, roas: ranked[0].roas }
        : null,
      recommendations,
      dataQuality: quality,
      insufficientData: facts.length === 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.get('/recommendations', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    await ensureEvidenceBackedRecommendation(businessId, 42);
    const { data, error } = await growthDb()
      .from('growth_ai_recommendations')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['pending', 'approved', 'snoozed'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return res.json({ recommendations: data ?? [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

async function setRecommendationState(req: Request, res: Response, status: 'approved' | 'dismissed' | 'snoozed') {
  const { businessId, userId } = growthContextOf(req);
  const id = String(req.params.id);
  const { data: recommendation, error: readError } = await growthDb()
    .from('growth_ai_recommendations')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', id)
    .maybeSingle();
  if (readError) return res.status(500).json({ error: readError.message });
  if (!recommendation) return res.status(404).json({ error: 'Recommendation not found.' });

  const { error: updateError } = await growthDb()
    .from('growth_ai_recommendations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('id', id);
  if (updateError) return res.status(500).json({ error: updateError.message });

  const actionId = randomUUID();
  const { error: auditError } = await growthDb().from('growth_ai_actions').insert({
    business_id: businessId,
    recommendation_id: id,
    executed_by: userId,
    action: status,
    before_state: { status: (recommendation as { status: string }).status },
    after_state: { status },
    status: 'completed',
    idempotency_key: `marketing-ai:${id}:${status}:${actionId}`,
  });
  if (auditError) return res.status(500).json({ error: auditError.message });

  return res.json({
    success: true,
    recommendationId: id,
    status,
    note: status === 'approved'
      ? 'Approved for review/execution. No external advertising budget is changed by this approval alone.'
      : undefined,
  });
}

marketingAIRouter.post('/recommendations/:id/approve', requireAIRole(['OWNER', 'ADMIN', 'MANAGER']), (req, res) => setRecommendationState(req, res, 'approved'));
marketingAIRouter.post('/recommendations/:id/dismiss', requireAIRole(['OWNER', 'ADMIN', 'MANAGER']), (req, res) => setRecommendationState(req, res, 'dismissed'));
marketingAIRouter.post('/recommendations/:id/snooze', requireAIRole(['OWNER', 'ADMIN', 'MANAGER']), (req, res) => setRecommendationState(req, res, 'snoozed'));

marketingAIRouter.get('/optimizer', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const requested = Number(req.query.monthlyBudgetCents ?? 0);
    const result = await buildOptimizer(businessId, 42, requested > 0 ? requested : undefined);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.post('/scenarios', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const facts = await loadCampaignFacts(businessId, 42);
    const totals = summarize(facts);
    const spendDeltaCents = Number(req.body?.spendDeltaCents ?? 0);
    if (totals.spendCents <= 0 || totals.revenueCents <= 0) {
      return res.json({
        querySummary: 'Insufficient real performance history to model this scenario.',
        predictedSpendCents: Math.max(0, spendDeltaCents),
        predictedLeads: 0,
        predictedAppointments: 0,
        predictedSalesCents: 0,
        predictedGrossProfitCents: 0,
        confidenceInterval95: { lowerCents: 0, upperCents: 0 },
        inventoryImpactNotes: 'Not modeled without linked operational history.',
        capacityImpactNotes: 'Not modeled without linked operational history.',
        riskAssessment: 'Insufficient data',
      });
    }

    const newSpend = Math.max(0, totals.spendCents + spendDeltaCents);
    const scale = newSpend / totals.spendCents;
    // Conservative saturation: additional spend is discounted rather than
    // assuming historic ROAS remains perfectly linear.
    const effectiveScale = scale <= 1 ? scale : 1 + (scale - 1) * 0.7;
    const predictedRevenue = Math.round(totals.revenueCents * effectiveScale);
    const predictedGrossProfit = totals.grossProfitCents > 0 ? Math.round(totals.grossProfitCents * effectiveScale - newSpend) : 0;
    const predictedLeads = Math.round(totals.leads * effectiveScale);
    const predictedAppointments = Math.round(totals.appointments * effectiveScale);
    const uncertainty = Math.max(0.2, Math.min(0.45, 0.45 - Math.min(0.25, totals.sales / 100)));

    return res.json({
      querySummary: `Scenario modeled from the last 42 days of tenant performance with a ${(uncertainty * 100).toFixed(0)}% uncertainty band and a diminishing-return haircut on added spend.`,
      predictedSpendCents: newSpend,
      predictedLeads,
      predictedAppointments,
      predictedSalesCents: predictedRevenue,
      predictedGrossProfitCents: predictedGrossProfit,
      confidenceInterval95: {
        lowerCents: Math.round(predictedRevenue * (1 - uncertainty)),
        upperCents: Math.round(predictedRevenue * (1 + uncertainty)),
      },
      inventoryImpactNotes: 'Inventory constraints are not included unless product-level attribution is available.',
      capacityImpactNotes: 'Appointment-capacity constraints are surfaced separately and should be reviewed before executing a material increase.',
      riskAssessment: totals.sales >= 20 ? 'Moderate' : 'High — limited verified-sale sample',
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.post('/copilot', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const question = String(req.body?.question ?? '').trim();
    const facts = await loadCampaignFacts(businessId, 30);
    const totals = summarize(facts);
    const ranked = facts
      .filter((fact) => fact.spendCents > 0)
      .map((fact) => ({ fact, roas: fact.revenueCents / fact.spendCents }))
      .sort((a, b) => b.roas - a.roas);

    let content: string;
    const q = question.toLowerCase();
    if (facts.length === 0) {
      content = 'I do not have enough connected campaign data to answer that from production facts yet. Connect and sync advertising plus conversion tracking; I will not invent an answer.';
    } else if (/where.*spend|budget|another \$|allocate/.test(q)) {
      const optimizer = await buildOptimizer(businessId, 42);
      if (optimizer.status !== 'ready') {
        content = 'There is not enough reliable downstream conversion history to recommend a budget reallocation yet.';
      } else {
        const top = optimizer.allocations[0];
        content = top
          ? `The current evidence-backed optimizer gives ${top.provider} the largest recommended share at ${top.recommendedSharePct}% (${Math.round(top.recommendedBudgetCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}). The model uses shrinkage and bounded changes rather than assuming the highest historic ROAS can absorb unlimited spend.`
          : 'The optimizer did not find a defensible reallocation.';
      }
    } else if (/best|winner|performing/.test(q) && ranked[0]) {
      content = `${ranked[0].fact.name} is the strongest observed campaign by revenue ROAS over the last 30 days at ${ranked[0].roas.toFixed(2)}x, from ${ranked[0].fact.sales} VowOS-verified sales and ${ranked[0].fact.appointments} booked appointments. This is observational performance, not causal proof.`;
    } else if (/worst|wast|pause|stop/.test(q) && ranked.length > 1) {
      const worst = ranked[ranked.length - 1];
      content = `${worst.fact.name} has the lowest observed revenue ROAS among campaigns with spend at ${worst.roas.toFixed(2)}x. I would not pause it solely from that number; sample size, marginal return and campaign purpose should be checked first.`;
    } else if (/cac|acquisition cost/.test(q)) {
      content = totals.sales > 0
        ? `Verified customer acquisition cost is ${Math.round(totals.spendCents / totals.sales / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} across ${totals.sales} VowOS-verified sales in the last 30 days.`
        : 'CAC cannot be calculated yet because no VowOS-verified sales are linked to the selected marketing window.';
    } else {
      content = `Over the last 30 days VowOS has tracked $${(totals.spendCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} in campaign spend, ${totals.leads} leads, ${totals.appointments} booked appointments, ${totals.sales} verified sales, and $${(totals.revenueCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} in attributed revenue. Ask me where to spend, what is winning, what is wasting money, or what CAC is.`;
    }

    return res.json({
      id: randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      citations: ['VowOS growth_ad_campaigns', 'VowOS growth_ad_metrics'],
      confidenceScore: facts.length > 0 ? Math.min(0.95, 0.55 + Math.min(0.35, totals.sales / 50)) : 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.get('/competitors', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const [{ data: competitors, error: competitorError }, { data: signals, error: signalError }] = await Promise.all([
      growthDb().from('growth_competitors').select('*').eq('business_id', businessId).eq('active', true),
      growthDb().from('growth_competitor_signals').select('*').eq('business_id', businessId).order('detected_at', { ascending: false }).limit(100),
    ]);
    if (competitorError) throw new Error(competitorError.message);
    if (signalError) throw new Error(signalError.message);
    const names = new Map((competitors ?? []).map((row) => [(row as { id: string }).id, (row as { name: string }).name]));
    return res.json({
      competitors: competitors ?? [],
      signals: (signals ?? []).map((signal) => ({
        ...signal,
        competitorName: names.get((signal as { competitor_id: string }).competitor_id) ?? 'Tracked competitor',
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.get('/trends', async (req, res) => {
  const { businessId } = growthContextOf(req);
  const { data, error } = await growthDb()
    .from('marketing_trend_signals')
    .select('*')
    .eq('brand', businessId)
    .order('detected_at', { ascending: false })
    .limit(100);
  // Legacy trend table is brand-scoped, so never pretend those rows are safe
  // tenant data. Return an explicit unavailable state until it is migrated.
  if (error || !data?.length) return res.json({ trends: [], status: 'unavailable', reason: 'Tenant-safe local trend ingestion is not configured yet.' });
  return res.json({ trends: [], status: 'unavailable', reason: 'Legacy trend rows are not used for tenant decisions.' });
});

marketingAIRouter.get('/data-quality', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    return res.json(await dataQuality(businessId));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.get('/governance', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const guardrail = await loadGuardrail(businessId);
    return res.json({
      mode: guardrail?.automation_level ?? 1,
      automationEnabled: (guardrail?.automation_level ?? 1) >= 3,
      guardrails: guardrail,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

marketingAIRouter.post('/governance', requireAIRole(['OWNER', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const automationLevel = Math.max(1, Math.min(3, Number(req.body?.mode ?? 1)));
    const dailyMaxAdjustmentPct = Math.max(1, Math.min(25, Number(req.body?.dailyMaxAdjustmentPct ?? 15)));
    const requiredConfidence = Math.max(0.5, Math.min(0.99, Number(req.body?.requiredConfidence ?? 0.8)));
    const { data: current, error: readError } = await growthDb()
      .from('growth_budget_guardrails')
      .select('id')
      .eq('business_id', businessId)
      .is('location_id', null)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const row = {
      business_id: businessId,
      location_id: null,
      automation_level: automationLevel,
      daily_max_adjustment_pct: dailyMaxAdjustmentPct,
      required_confidence: requiredConfidence,
      updated_at: new Date().toISOString(),
    };
    const result = current?.id
      ? await growthDb().from('growth_budget_guardrails').update(row).eq('id', current.id)
      : await growthDb().from('growth_budget_guardrails').insert(row);
    if (result.error) throw new Error(result.error.message);

    return res.json({ success: true, mode: automationLevel, dailyMaxAdjustmentPct, requiredConfidence });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
