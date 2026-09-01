import { SupabaseClient } from '@supabase/supabase-js';
import { ShopifyAdapter } from '../providers/shopify';
import { MetaAdsAdapter } from '../providers/meta';
import { runProspectingCycle, generateOutreachDraft } from '../engine/prospecting';
import { haltAllCampaigns } from '../engine/budgets';
import { sendDigest } from '../modules/growth/digest';
import { syncBusiness } from '../modules/growth/scheduler';
import { ReconciliationEngine } from '../modules/recovery/reconciliationEngine';
import { handleAppointmentAutomationDelivery } from '../modules/communications/automationDeliveryJob';
import twilio from 'twilio';

export interface DurableJob {
  id: string;
  business_id?: string | null;
  queue_name: string;
  payload: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead-letter' | string;
  attempts: number;
  max_attempts: number;
  locked_at?: string | null;
  locked_by?: string | null;
  next_retry_at?: string | null;
  error_message?: string | null;
  error_code?: string | null;
  error_details?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export type JobHandler = (job: DurableJob, db: SupabaseClient) => Promise<any>;

function requireJobBusinessId(job: DurableJob): string {
  const businessId = typeof job.business_id === 'string' && job.business_id.trim()
    ? job.business_id.trim()
    : typeof job.payload?.business_id === 'string' && job.payload.business_id.trim()
      ? job.payload.business_id.trim()
      : '';
  if (!businessId) throw new Error(`Durable job ${job.id} (${job.queue_name}) is missing business_id.`);
  return businessId;
}

/** Handle sync_shopify_catalog queue action. */
async function handleSyncShopifyCatalog(job: DurableJob, _db: SupabaseClient) {
  const brand = job.payload?.brand || 'I Do Bridal Couture';
  const adapter = new ShopifyAdapter();
  return adapter.syncCatalog(brand);
}

/** Handle publish_meta_campaign queue action. */
async function handlePublishMetaCampaign(job: DurableJob, db: SupabaseClient) {
  const brand = job.payload?.brand || 'Proper & Co';
  const campaignPayload = job.payload?.campaignPayload || job.payload || {};
  const adapter = new MetaAdsAdapter();
  const result = await adapter.publishCampaign(brand, campaignPayload);

  if (job.payload?.campaign_id && db) {
    try {
      await db
        .from('growth_ad_campaigns')
        .update({ status: 'active', external_id: result.external_id, updated_at: new Date().toISOString() })
        .eq('id', job.payload.campaign_id);
    } catch {
      // Provider publish already succeeded; reconciliation can repair the local projection.
    }
  }
  return result;
}

/** Handle run_prospecting queue action. */
async function handleRunProspecting(job: DurableJob, _db: SupabaseClient) {
  const brand = job.payload?.brand || 'Proper & Company';
  const result = await runProspectingCycle(brand);
  return result ?? { success: true, brand };
}

/** Handle generate_outreach queue action. */
async function handleGenerateOutreach(job: DurableJob, db: SupabaseClient) {
  const leadId = job.payload?.leadId || job.payload?.lead_id || `lead_${Date.now()}`;
  const content = job.payload?.content || '';
  const brand = job.payload?.brand || 'Proper & Company';
  const draft = await generateOutreachDraft(leadId, content, brand);

  if (job.payload?.persist) {
    const businessId = requireJobBusinessId(job);
    const { error } = await db.from('messages').insert({
      business_id: businessId,
      sender: brand,
      content: draft,
      body: draft,
      channel: 'outreach',
      direction: 'outbound',
      status: 'draft',
      sent_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Outreach draft persistence failed: ${error.message}`);
  }
  return { success: true, draft, leadId };
}

/** Handle emergency_pause_all queue action. */
async function handleEmergencyPauseAll(job: DurableJob, db: SupabaseClient) {
  const brand = job.payload?.brand || 'ALL';
  const platform = job.payload?.platform;
  await haltAllCampaigns(brand, platform);

  if (job.business_id) {
    try {
      await db
        .from('growth_ad_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('business_id', job.business_id);
    } catch {
      // External pause is authoritative; local state is repairable.
    }
  }
  return { success: true, brand, platform, action: 'haltAllCampaigns' };
}

/** Handle pause_campaign queue action. */
async function handlePauseCampaign(job: DurableJob, db: SupabaseClient) {
  const campaignId = job.payload?.campaign_id || job.payload?.id;
  if (!campaignId) throw new Error('campaign_id is required in job payload');

  try {
    await db.from('marketing_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', campaignId);
  } catch {
    // Compatibility table may not exist for every deployment.
  }
  try {
    await db.from('growth_ad_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', campaignId);
  } catch {
    // Compatibility projection may not exist for every deployment.
  }
  return { success: true, campaign_id: campaignId, status: 'paused' };
}

/** Handle send_email_digest / daily_digest queue actions. */
async function handleSendEmailDigest(job: DurableJob, _db: SupabaseClient) {
  const businessId = requireJobBusinessId(job);
  const recipients = Array.isArray(job.payload?.recipients)
    ? job.payload.recipients
    : job.payload?.to
      ? [job.payload.to]
      : [];
  if (!recipients.length) throw new Error('Digest job has no recipients.');
  const periodDays = job.payload?.periodDays || 7;
  return sendDigest(businessId, recipients, periodDays);
}

/** Handle sync_growth / sync_growth_provider queue actions. */
async function handleSyncGrowth(job: DurableJob, _db: SupabaseClient) {
  const businessId = requireJobBusinessId(job);
  const siteUrl = job.payload?.siteUrl || null;
  const outcomes = await syncBusiness(businessId, siteUrl);
  return { success: true, businessId, outcomes };
}

/** Handle replay_dlq / reconciliation_run queue actions. */
async function handleReplayDlq(job: DurableJob, db: SupabaseClient) {
  const dlqId = job.payload?.dlq_id || job.payload?.id;
  const connectionId = job.payload?.connection_id;
  if (dlqId) return ReconciliationEngine.replayDlqEvent(dlqId, { db });
  if (connectionId) {
    return ReconciliationEngine.reconcileConnection(connectionId, {
      resourceType: job.payload?.resourceType || 'orders',
      db,
    });
  }
  const allPending = await ReconciliationEngine.replayAllPendingDlq(undefined, { db });
  return { success: true, replayed: allPending.length, results: allPending };
}

/**
 * Legacy explicit SMS-reminder job. New configurable reminder/follow-up rules use
 * send_appointment_automation, but existing queued jobs still need a safe path.
 */
async function handleSendSmsReminder(job: DurableJob, db: SupabaseClient) {
  const businessId = requireJobBusinessId(job);
  const customerId = typeof job.payload?.customer_id === 'string' ? job.payload.customer_id : null;
  const message = String(job.payload?.message || job.payload?.content || '').trim();
  if (!message) throw new Error('SMS reminder job has an empty message.');

  let phone = typeof job.payload?.phone === 'string' ? job.payload.phone : '';
  let customerName = String(job.payload?.customer_name || 'Customer');
  let locationId = job.payload?.location_id || null;

  if (customerId) {
    const { data: customer, error } = await db
      .from('customers')
      .select('id,name,phone,location_id,sms_opt_in,sms_consent')
      .eq('business_id', businessId)
      .eq('id', customerId)
      .maybeSingle();
    if (error) throw new Error(`SMS reminder customer lookup failed: ${error.message}`);
    if (!customer) throw new Error('SMS reminder customer no longer exists.');
    if (!customer.sms_opt_in && !customer.sms_consent) return { success: true, skipped: true, reason: 'SMS_NOT_CONSENTED' };
    phone = customer.phone || phone;
    customerName = customer.name || customerName;
    locationId = customer.location_id || locationId;
  }

  if (!phone) throw new Error('SMS reminder has no recipient phone number.');
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (!twilioSid || !twilioAuth || !twilioFrom) throw new Error('Twilio is not configured for SMS reminders.');

  const twilioRes = await twilio(twilioSid, twilioAuth).messages.create({ body: message, from: twilioFrom, to: phone });
  const { error: messageError } = await db.from('messages').insert({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    customer: customerName,
    sender: 'System Reminder',
    content: message,
    body: message,
    kind: 'reminder',
    channel: 'sms',
    direction: 'outbound',
    status: 'sent',
    external_id: twilioRes.sid,
    to_address: phone,
    sent_at: new Date().toISOString(),
  });
  if (messageError) throw new Error(`SMS sent but history persistence failed: ${messageError.message}`);
  return { success: true, customerId, phone, externalId: twilioRes.sid };
}

/** Registry mapping queue action names to typed handlers. */
export const JOB_REGISTRY: Record<string, JobHandler> = {
  sync_shopify_catalog: handleSyncShopifyCatalog,
  publish_meta_campaign: handlePublishMetaCampaign,
  run_prospecting: handleRunProspecting,
  generate_outreach: handleGenerateOutreach,
  emergency_pause_all: handleEmergencyPauseAll,
  pause_campaign: handlePauseCampaign,
  send_email_digest: handleSendEmailDigest,
  daily_digest: handleSendEmailDigest,
  sync_growth: handleSyncGrowth,
  sync_growth_provider: handleSyncGrowth,
  replay_dlq: handleReplayDlq,
  reconciliation_run: handleReplayDlq,
  send_sms_reminder: handleSendSmsReminder,
  send_appointment_automation: handleAppointmentAutomationDelivery,
};

/** Dispatch a durable job to its registered handler. */
export async function dispatchJob(job: DurableJob, db: SupabaseClient): Promise<any> {
  const handler = JOB_REGISTRY[job.queue_name];
  if (!handler) throw new Error(`Unknown job queue: ${job.queue_name}`);
  return handler(job, db);
}
