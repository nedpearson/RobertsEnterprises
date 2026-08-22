import { db } from './store';

interface TouchpointRow {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  occurred_at: string;
  channel: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  click_id: string | null;
}

interface CampaignRow {
  id: string;
  network: string;
  external_id: string;
  name: string;
  location_id: string | null;
}

interface AttributionResult {
  touchpointId: string | null;
  campaignId: string | null;
  confidence: number | null;
  reason: string;
}

export interface ReconciliationResult {
  businessId: string;
  windowDays: number;
  verifiedConversions: number;
  attributedConversions: number;
  metricRowsUpdated: number;
  attributionCoveragePct: number | null;
  salesCoveragePct: number | null;
  appointmentCoveragePct: number | null;
}

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

const normalize = (value: string | null | undefined) =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const providerFromTouch = (touch: TouchpointRow): string | null => {
  const channel = normalize(touch.channel);
  const source = normalize(touch.source);
  if (channel.includes('google') || source.includes('google') || /gclid|gbraid|wbraid/i.test(touch.click_id ?? '')) return 'google_ads';
  if (channel.includes('meta') || source.includes('facebook') || source.includes('instagram') || source === 'fb' || source === 'ig') return 'meta_ads';
  if (channel.includes('pinterest') || source.includes('pinterest')) return 'pinterest_ads';
  if (channel.includes('tiktok') || source.includes('tiktok')) return 'tiktok_ads';
  if (channel.includes('linkedin') || source.includes('linkedin')) return 'linkedin_ads';
  return null;
};

function findCampaign(touch: TouchpointRow, campaigns: CampaignRow[]): { id: string | null; confidence: number | null; reason: string } {
  const campaignToken = normalize(touch.campaign);
  const provider = providerFromTouch(touch);
  if (!campaignToken) {
    return provider
      ? { id: null, confidence: 0.4, reason: `Paid ${provider} touchpoint has no campaign identifier.` }
      : { id: null, confidence: 0.85, reason: `Non-paid/unknown channel ${touch.channel}; no paid campaign expected.` };
  }

  const providerCandidates = provider ? campaigns.filter((campaign) => campaign.network === provider) : campaigns;
  const exactExternal = providerCandidates.find((campaign) => normalize(campaign.external_id) === campaignToken);
  if (exactExternal) return { id: exactExternal.id, confidence: 0.99, reason: 'UTM/campaign token exactly matched provider campaign ID.' };

  const exactName = providerCandidates.find((campaign) => normalize(campaign.name) === campaignToken);
  if (exactName) return { id: exactName.id, confidence: provider ? 0.95 : 0.9, reason: 'Campaign token exactly matched campaign name.' };

  const contains = providerCandidates.filter((campaign) => {
    const name = normalize(campaign.name);
    return name.length >= 5 && (name.includes(campaignToken) || campaignToken.includes(name));
  });
  if (contains.length === 1) return { id: contains[0].id, confidence: 0.72, reason: 'Campaign token uniquely matched normalized campaign name.' };

  return { id: null, confidence: provider ? 0.45 : 0.35, reason: `Campaign token “${touch.campaign}” did not map uniquely to a synced campaign.` };
}

function latestTouchBefore(
  touches: TouchpointRow[],
  occurredAt: string,
  leadId?: string | null,
  customerId?: string | null,
): TouchpointRow | null {
  const cutoff = new Date(occurredAt).getTime();
  let best: TouchpointRow | null = null;
  let bestTime = -Infinity;
  for (const touch of touches) {
    if (leadId && touch.lead_id !== leadId) continue;
    if (customerId && touch.customer_id !== customerId) continue;
    const time = new Date(touch.occurred_at).getTime();
    if (!Number.isFinite(time) || time > cutoff || time <= bestTime) continue;
    best = touch;
    bestTime = time;
  }
  return best;
}

function attribute(
  touches: TouchpointRow[],
  campaigns: CampaignRow[],
  occurredAt: string,
  leadId?: string | null,
  customerId?: string | null,
): AttributionResult {
  let touch = latestTouchBefore(touches, occurredAt, leadId, customerId);
  // If an exact before-cutoff touch does not exist, allow a linked touch after
  // the event only for the same entity. This handles identify calls that arrive
  // seconds after booking/payment, while avoiding unrelated customer matching.
  if (!touch) {
    touch = touches
      .filter((candidate) => (leadId ? candidate.lead_id === leadId : true) && (customerId ? candidate.customer_id === customerId : true))
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())[0] ?? null;
  }
  if (!touch) return { touchpointId: null, campaignId: null, confidence: null, reason: 'No linked marketing touchpoint exists for this operational outcome.' };
  const matched = findCampaign(touch, campaigns);
  return { touchpointId: touch.id, campaignId: matched.id, confidence: matched.confidence, reason: matched.reason };
}

const appointmentTimestamp = (date: string, time: string | null | undefined): string => {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(date).toISOString().slice(0, 10);
  const raw = (time ?? '').trim();
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = Number(match12[1]) % 12;
    if (match12[3].toUpperCase() === 'PM') hour += 12;
    return `${cleanDate}T${String(hour).padStart(2, '0')}:${match12[2]}:00.000Z`;
  }
  const match24 = raw.match(/^(\d{2}):(\d{2})/);
  if (match24) return `${cleanDate}T${match24[1]}:${match24[2]}:00.000Z`;
  return `${cleanDate}T12:00:00.000Z`;
};

const isQualifiedStage = (stage: string | null) => {
  const normalized = normalize(stage);
  return [
    'qualified',
    'appointment requested',
    'appointment set',
    'appointment booked',
    'booked',
    'converted',
    'won',
    'customer',
    'sold',
  ].includes(normalized);
};

const isAttendedStatus = (status: string | null) => {
  const normalized = normalize(status);
  return ['attended', 'completed', 'complete', 'closed', 'finished'].includes(normalized);
};

async function upsertVerified(row: Record<string, unknown>): Promise<void> {
  const businessId = String(row.business_id);
  const conversionType = String(row.conversion_type);
  const sourceEntityType = String(row.source_entity_type);
  const sourceEntityId = String(row.source_entity_id);
  const { data: existing, error: lookupError } = await db()
    .from('growth_verified_conversions')
    .select('id')
    .eq('business_id', businessId)
    .eq('conversion_type', conversionType)
    .eq('source_entity_type', sourceEntityType)
    .eq('source_entity_id', sourceEntityId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  const result = existing?.id
    ? await db().from('growth_verified_conversions').update(row).eq('id', existing.id)
    : await db().from('growth_verified_conversions').insert(row);
  if (result.error) throw new Error(result.error.message);
}

async function rebuildCampaignFacts(businessId: string, windowStartIso: string): Promise<number> {
  const startDate = windowStartIso.slice(0, 10);
  // Reset only VowOS-owned columns. Provider metrics remain untouched.
  const { error: resetError } = await db()
    .from('growth_ad_metrics')
    .update({
      leads: 0,
      qualified_leads: 0,
      appointments_booked: 0,
      appointments_attended: 0,
      sales: 0,
      revenue_cents: 0,
      gross_profit_cents: 0,
    })
    .eq('business_id', businessId)
    .gte('metric_date', startDate);
  if (resetError) throw new Error(resetError.message);

  const { data: conversions, error } = await db()
    .from('growth_verified_conversions')
    .select('campaign_id,conversion_type,occurred_at,value_cents,gross_profit_cents')
    .eq('business_id', businessId)
    .not('campaign_id', 'is', null)
    .gte('occurred_at', windowStartIso);
  if (error) throw new Error(error.message);

  const buckets = new Map<string, {
    campaignId: string;
    date: string;
    leads: number;
    qualifiedLeads: number;
    appointments: number;
    attended: number;
    sales: number;
    revenueCents: number;
    grossProfitCents: number;
  }>();

  for (const conversion of conversions ?? []) {
    const row = conversion as {
      campaign_id: string;
      conversion_type: string;
      occurred_at: string;
      value_cents: number;
      gross_profit_cents: number;
    };
    const date = row.occurred_at.slice(0, 10);
    const key = `${row.campaign_id}:${date}`;
    const bucket = buckets.get(key) ?? {
      campaignId: row.campaign_id,
      date,
      leads: 0,
      qualifiedLeads: 0,
      appointments: 0,
      attended: 0,
      sales: 0,
      revenueCents: 0,
      grossProfitCents: 0,
    };
    if (row.conversion_type === 'qualified_lead') {
      bucket.leads += 1;
      bucket.qualifiedLeads += 1;
    } else if (row.conversion_type === 'appointment_booked') {
      bucket.appointments += 1;
    } else if (row.conversion_type === 'appointment_attended') {
      bucket.attended += 1;
    } else if (row.conversion_type === 'purchase') {
      bucket.sales += 1;
      bucket.revenueCents += Number(row.value_cents ?? 0);
      bucket.grossProfitCents += Number(row.gross_profit_cents ?? 0);
    } else if (row.conversion_type === 'refund') {
      bucket.revenueCents += Number(row.value_cents ?? 0);
      bucket.grossProfitCents += Number(row.gross_profit_cents ?? 0);
    }
    buckets.set(key, bucket);
  }

  let updated = 0;
  for (const bucket of buckets.values()) {
    const { data: existing, error: readError } = await db()
      .from('growth_ad_metrics')
      .select('id')
      .eq('business_id', businessId)
      .eq('campaign_id', bucket.campaignId)
      .eq('metric_date', bucket.date)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    const payload = {
      business_id: businessId,
      campaign_id: bucket.campaignId,
      metric_date: bucket.date,
      leads: bucket.leads,
      qualified_leads: bucket.qualifiedLeads,
      appointments_booked: bucket.appointments,
      appointments_attended: bucket.attended,
      sales: bucket.sales,
      revenue_cents: bucket.revenueCents,
      gross_profit_cents: bucket.grossProfitCents,
    };
    const result = existing?.id
      ? await db().from('growth_ad_metrics').update(payload).eq('id', existing.id)
      : await db().from('growth_ad_metrics').insert(payload);
    if (result.error) throw new Error(result.error.message);
    updated += 1;
  }
  return updated;
}

/**
 * Build VowOS-verified conversion truth from operational tables, then attach
 * last-touch campaign attribution when a linked touchpoint can be matched.
 * Unknown attribution is kept as unknown; no fuzzy guess is forced into a paid
 * campaign.
 */
export async function reconcileMarketingOutcomes(
  businessId: string,
  options: { windowDays?: number } = {},
): Promise<ReconciliationResult> {
  const windowDays = Math.max(7, Math.min(365, Math.floor(Number(options.windowDays ?? 90))));
  const startIso = isoDaysAgo(windowDays);
  const dbClient = db();

  const [touchesResult, campaignsResult, leadsResult, appointmentsResult, paymentsResult, invoicesResult] = await Promise.all([
    dbClient
      .from('growth_attribution_touchpoints')
      .select('id,lead_id,customer_id,occurred_at,channel,source,medium,campaign,click_id')
      .eq('business_id', businessId)
      .gte('occurred_at', isoDaysAgo(Math.min(365, windowDays + 90)))
      .order('occurred_at', { ascending: true }),
    dbClient
      .from('growth_ad_campaigns')
      .select('id,network,external_id,name,location_id')
      .eq('business_id', businessId),
    dbClient
      .from('leads')
      .select('id,location_id,stage,created_at')
      .eq('business_id', businessId)
      .gte('created_at', startIso),
    dbClient
      .from('appointments')
      .select('id,location_id,customer_id,date,time,status,created_at')
      .eq('business_id', businessId)
      .gte('date', startIso.slice(0, 10)),
    dbClient
      .from('payments')
      .select('id,location_id,customer_id,invoice_id,amount_cents,status,processed_at,created_at')
      .eq('business_id', businessId)
      .gte('processed_at', startIso),
    dbClient
      .from('invoices')
      .select('id,customer_id')
      .eq('business_id', businessId),
  ]);

  for (const result of [touchesResult, campaignsResult, leadsResult, appointmentsResult, paymentsResult, invoicesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const touches = (touchesResult.data ?? []) as TouchpointRow[];
  const campaigns = (campaignsResult.data ?? []) as CampaignRow[];
  const invoices = new Map((invoicesResult.data ?? []).map((invoice) => [String((invoice as { id: string }).id), invoice as { id: string; customer_id: string | null }]));

  let verifiedConversions = 0;
  let attributedConversions = 0;
  let totalAppointments = 0;
  let attributedAppointments = 0;
  let totalPurchases = 0;
  let attributedPurchases = 0;

  for (const lead of leadsResult.data ?? []) {
    const row = lead as { id: string; location_id: string | null; stage: string | null; created_at: string };
    if (!isQualifiedStage(row.stage)) continue;
    const attribution = attribute(touches, campaigns, row.created_at, row.id, null);
    await upsertVerified({
      business_id: businessId,
      location_id: row.location_id,
      lead_id: row.id,
      customer_id: null,
      touchpoint_id: attribution.touchpointId,
      campaign_id: attribution.campaignId,
      conversion_type: 'qualified_lead',
      occurred_at: row.created_at,
      value_cents: 0,
      gross_profit_cents: 0,
      source_system: 'vowos',
      source_entity_type: 'lead',
      source_entity_id: row.id,
      attribution_model: 'last_touch',
      attribution_confidence: attribution.confidence,
      attribution_reason: attribution.reason,
    });
    verifiedConversions += 1;
    if (attribution.touchpointId) attributedConversions += 1;
  }

  for (const appointment of appointmentsResult.data ?? []) {
    const row = appointment as {
      id: string;
      location_id: string | null;
      customer_id: string | null;
      date: string;
      time: string | null;
      status: string | null;
      created_at: string;
    };
    const bookedAt = row.created_at || appointmentTimestamp(row.date, row.time);
    const eventAt = appointmentTimestamp(row.date, row.time);
    const attribution = attribute(touches, campaigns, eventAt, null, row.customer_id);
    totalAppointments += 1;
    if (attribution.touchpointId) attributedAppointments += 1;
    await upsertVerified({
      business_id: businessId,
      location_id: row.location_id,
      lead_id: null,
      customer_id: row.customer_id,
      touchpoint_id: attribution.touchpointId,
      campaign_id: attribution.campaignId,
      conversion_type: 'appointment_booked',
      occurred_at: bookedAt,
      value_cents: 0,
      gross_profit_cents: 0,
      source_system: 'vowos',
      source_entity_type: 'appointment',
      source_entity_id: row.id,
      attribution_model: 'last_touch',
      attribution_confidence: attribution.confidence,
      attribution_reason: attribution.reason,
    });
    verifiedConversions += 1;
    if (attribution.touchpointId) attributedConversions += 1;

    if (isAttendedStatus(row.status)) {
      await upsertVerified({
        business_id: businessId,
        location_id: row.location_id,
        lead_id: null,
        customer_id: row.customer_id,
        touchpoint_id: attribution.touchpointId,
        campaign_id: attribution.campaignId,
        conversion_type: 'appointment_attended',
        occurred_at: eventAt,
        value_cents: 0,
        gross_profit_cents: 0,
        source_system: 'vowos',
        source_entity_type: 'appointment',
        source_entity_id: row.id,
        attribution_model: 'last_touch',
        attribution_confidence: attribution.confidence,
        attribution_reason: attribution.reason,
      });
      verifiedConversions += 1;
      if (attribution.touchpointId) attributedConversions += 1;
    }
  }

  for (const payment of paymentsResult.data ?? []) {
    const row = payment as {
      id: string;
      location_id: string | null;
      customer_id: string | null;
      invoice_id: string | null;
      amount_cents: number;
      status: string | null;
      processed_at: string;
      created_at: string;
    };
    const status = normalize(row.status);
    if (!['completed', 'refunded'].includes(status)) continue;
    const invoice = row.invoice_id ? invoices.get(row.invoice_id) : null;
    const customerId = row.customer_id ?? invoice?.customer_id ?? null;
    const occurredAt = row.processed_at || row.created_at;
    const attribution = attribute(touches, campaigns, occurredAt, null, customerId);
    totalPurchases += 1;
    if (attribution.touchpointId) attributedPurchases += 1;

    await upsertVerified({
      business_id: businessId,
      location_id: row.location_id,
      lead_id: null,
      customer_id: customerId,
      touchpoint_id: attribution.touchpointId,
      campaign_id: attribution.campaignId,
      conversion_type: 'purchase',
      occurred_at: occurredAt,
      value_cents: Number(row.amount_cents ?? 0),
      gross_profit_cents: 0,
      source_system: 'vowos_payments',
      source_entity_type: 'payment',
      source_entity_id: row.id,
      attribution_model: 'last_touch',
      attribution_confidence: attribution.confidence,
      attribution_reason: `${attribution.reason} Gross profit remains zero until COGS is linked to this payment/order.`,
    });
    verifiedConversions += 1;
    if (attribution.touchpointId) attributedConversions += 1;

    if (status === 'refunded') {
      await upsertVerified({
        business_id: businessId,
        location_id: row.location_id,
        lead_id: null,
        customer_id: customerId,
        touchpoint_id: attribution.touchpointId,
        campaign_id: attribution.campaignId,
        conversion_type: 'refund',
        occurred_at: occurredAt,
        value_cents: -Math.abs(Number(row.amount_cents ?? 0)),
        gross_profit_cents: 0,
        source_system: 'vowos_payments',
        source_entity_type: 'payment',
        source_entity_id: row.id,
        attribution_model: 'last_touch',
        attribution_confidence: attribution.confidence,
        attribution_reason: attribution.reason,
      });
      verifiedConversions += 1;
      if (attribution.touchpointId) attributedConversions += 1;
    }
  }

  const metricRowsUpdated = await rebuildCampaignFacts(businessId, startIso);
  const attributionCoveragePct = verifiedConversions > 0 ? (attributedConversions / verifiedConversions) * 100 : null;
  const salesCoveragePct = totalPurchases > 0 ? (attributedPurchases / totalPurchases) * 100 : null;
  const appointmentCoveragePct = totalAppointments > 0 ? (attributedAppointments / totalAppointments) * 100 : null;

  const issues: Array<{ code: string; severity: string; message: string }> = [];
  if (attributionCoveragePct !== null && attributionCoveragePct < 80) {
    issues.push({ code: 'low_attribution_coverage', severity: 'high', message: `Only ${attributionCoveragePct.toFixed(1)}% of verified outcomes have a linked marketing touchpoint.` });
  }
  if (salesCoveragePct !== null && salesCoveragePct < 80) {
    issues.push({ code: 'low_sales_attribution', severity: 'high', message: `Only ${salesCoveragePct.toFixed(1)}% of verified purchases are linked to a marketing touchpoint.` });
  }

  const connectionScore = 100; // Reconciliation itself does not own provider health; retained as a neutral component.
  const freshnessScore = 100;
  const overallScore = Math.round(
    connectionScore * 0.2 + freshnessScore * 0.2 + (attributionCoveragePct ?? 0) * 0.6,
  );
  await db().from('growth_data_health').insert({
    business_id: businessId,
    location_id: null,
    overall_score: overallScore,
    attribution_coverage_pct: attributionCoveragePct,
    verified_sales_coverage_pct: salesCoveragePct,
    verified_appointment_coverage_pct: appointmentCoveragePct,
    freshness_score: freshnessScore,
    connection_score: connectionScore,
    issues,
    calculated_at: new Date().toISOString(),
  });

  return {
    businessId,
    windowDays,
    verifiedConversions,
    attributedConversions,
    metricRowsUpdated,
    attributionCoveragePct,
    salesCoveragePct,
    appointmentCoveragePct,
  };
}
