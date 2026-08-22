import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from './auth';
import { reconcileMarketingOutcomes } from './reconciliation';
import { db } from './store';

export const reconciliationRouter = Router();
reconciliationRouter.use(requireGrowthAccess);

reconciliationRouter.post('/reconcile', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const windowDays = Math.max(7, Math.min(365, Number(req.body?.windowDays ?? 90)));
    const result = await reconcileMarketingOutcomes(businessId, { windowDays });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

reconciliationRouter.get('/verified-conversions', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const days = Math.max(1, Math.min(365, Number(req.query.days ?? 30)));
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    const { data, error } = await db()
      .from('growth_verified_conversions')
      .select('id,location_id,lead_id,customer_id,touchpoint_id,campaign_id,conversion_type,occurred_at,value_cents,gross_profit_cents,attribution_model,attribution_confidence,attribution_reason,source_entity_type,source_entity_id')
      .eq('business_id', businessId)
      .gte('occurred_at', start.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return res.json({ conversions: data ?? [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
