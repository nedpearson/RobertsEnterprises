import { Router } from 'express';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const payrollManualRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;
const text = (value: unknown, max = 2000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const cents = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 9_000_000_000_000 ? parsed : null;
};

payrollManualRouter.post('/periods/:periodId/manual-provider-results', requirePermission('team.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const periodId = uuid(req.params.periodId);
  const providerReference = text(req.body?.provider_reference, 500);
  const evidenceNote = text(req.body?.evidence_note, 2000);
  const inputLines = Array.isArray(req.body?.lines) ? req.body.lines : null;
  if (!periodId || !providerReference || !inputLines) {
    return res.status(400).json({ error: 'Payroll period, external provider reference, and employee results are required.' });
  }

  const lines: Array<{ line_id: string; tax_cents: number; net_pay_cents: number }> = [];
  for (const item of inputLines) {
    const lineId = uuid(item?.line_id);
    const taxCents = cents(item?.tax_cents);
    const netPayCents = cents(item?.net_pay_cents);
    if (!lineId || taxCents === null || netPayCents === null) {
      return res.status(400).json({ error: 'Every provider result needs a valid payroll line id plus non-negative whole-cent tax and net-pay amounts.' });
    }
    lines.push({ line_id: lineId, tax_cents: taxCents, net_pay_cents: netPayCents });
  }

  const { data, error } = await db.rpc('apply_manual_payroll_provider_results_server', {
    p_business_id: businessId,
    p_period_id: periodId,
    p_actor_id: userId,
    p_provider_reference: providerReference,
    p_evidence_note: evidenceNote || null,
    p_lines: lines,
  });
  if (error) return res.status(409).json({ error: error.message });

  const { error: auditError } = await db.from('audit_logs').insert({
    entity_type: 'payroll_period',
    entity_id: periodId,
    action: 'PAYROLL_PROVIDER_RESULTS_MANUALLY_VERIFIED',
    user_id: userId,
    before_value: null,
    after_value: { provider_reference: providerReference, line_count: lines.length },
    reason: evidenceNote || 'Verified external payroll provider results entered manually.',
  });
  if (auditError) console.warn('[payroll/manual] audit failed:', auditError.message);

  return res.json({ period: data });
});
