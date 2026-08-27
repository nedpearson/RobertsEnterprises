import { SupabaseClient } from '@supabase/supabase-js';
import { ShopifyAdapter } from '../providers/shopify';
import { MetaAdsAdapter } from '../providers/meta';
import { runProspectingCycle, generateOutreachDraft } from '../engine/prospecting';
import { haltAllCampaigns } from '../engine/budgets';
import { sendDigest } from '../modules/growth/digest';
import { syncBusiness } from '../modules/growth/scheduler';
import { ReconciliationEngine } from '../modules/recovery/reconciliationEngine';
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

/**
 * Handle sync_shopify_catalog queue action
 */
async function handleSyncShopifyCatalog(job: DurableJob, _db: SupabaseClient) {
  const brand = job.payload?.brand || 'I Do Bridal Couture';
  const adapter = new ShopifyAdapter();
  const result = await adapter.syncCatalog(brand);
  return result;
}

/**
 * Handle publish_meta_campaign queue action
 */
async function handlePublishMetaCampaign(job: DurableJob, db: SupabaseClient) {
  const brand = job.payload?.brand || 'Proper & Co';
  const campaignPayload = job.payload?.campaignPayload || job.payload || {};
  const adapter = new MetaAdsAdapter();
  const result = await adapter.publishCampaign(brand, campaignPayload);

  if (job.payload?.campaign_id && db) {
    try {
      await db
        .from('growth_ad_campaigns')
        .update({
          status: 'active',
          external_id: result.external_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.payload.campaign_id);
    } catch {
      // Best-effort table update
    }
  }

  return result;
}

/**
 * Handle run_prospecting queue action
 */
async function handleRunProspecting(job: DurableJob, _db: SupabaseClient) {
  const brand = job.payload?.brand || 'Proper & Company';
  const result = await runProspectingCycle(brand);
  return result ?? { success: true, brand };
}

/**
 * Handle generate_outreach queue action
 */
async function handleGenerateOutreach(job: DurableJob, db: SupabaseClient) {
  const leadId = job.payload?.leadId || job.payload?.lead_id || `lead_${Date.now()}`;
  const content = job.payload?.content || '';
  const brand = job.payload?.brand || 'Proper & Company';
  const draft = await generateOutreachDraft(leadId, content, brand);

  if (job.payload?.persist && db && job.business_id) {
    try {
      await db.from('messages').insert({
        business_id: job.business_id,
        sender: brand,
        content: draft,
        body: draft,
        channel: 'outreach',
        direction: 'outbound',
        status: 'draft',
        sent_at: new Date().toISOString(),
      });
    } catch {
      // Best-effort persistence
    }
  }

  return { success: true, draft, leadId };
}

/**
 * Handle emergency_pause_all queue action
 */
async function handleEmergencyPauseAll(job: DurableJob, db: SupabaseClient) {
  const brand = job.payload?.brand || 'ALL';
  const platform = job.payload?.platform;
  await haltAllCampaigns(brand, platform);

  if (job.business_id && db) {
    try {
      await db
        .from('growth_ad_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('business_id', job.business_id);
    } catch {
      // Best-effort update
    }
  }

  return { success: true, brand, platform, action: 'haltAllCampaigns' };
}

/**
 * Handle pause_campaign queue action
 */
async function handlePauseCampaign(job: DurableJob, db: SupabaseClient) {
  const campaignId = job.payload?.campaign_id || job.payload?.id;
  if (!campaignId) {
    throw new Error('campaign_id is required in job payload');
  }

  if (db) {
    try {
      await db
        .from('marketing_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    } catch {
      // Fallback
    }

    try {
      await db
        .from('growth_ad_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    } catch {
      // Fallback
    }
  }

  return { success: true, campaign_id: campaignId, status: 'paused' };
}

/**
 * Handle send_email_digest / daily_digest queue actions
 */
async function handleSendEmailDigest(job: DurableJob, _db: SupabaseClient) {
  const businessId = job.business_id || job.payload?.business_id || '00000000-0000-0000-0000-000000000001';
  const recipients = job.payload?.recipients || (job.payload?.to ? [job.payload.to] : ['owner@example.com']);
  const periodDays = job.payload?.periodDays || 7;

  const result = await sendDigest(businessId, recipients, periodDays);
  return result;
}

/**
 * Handle sync_growth / sync_growth_provider queue actions
 */
async function handleSyncGrowth(job: DurableJob, _db: SupabaseClient) {
  const businessId = job.business_id || job.payload?.business_id || '00000000-0000-0000-0000-000000000001';
  const siteUrl = job.payload?.siteUrl || null;

  const outcomes = await syncBusiness(businessId, siteUrl);
  return { success: true, businessId, outcomes };
}

/**
 * Handle replay_dlq / reconciliation_run queue actions
 */
async function handleReplayDlq(job: DurableJob, db: SupabaseClient) {
  const dlqId = job.payload?.dlq_id || job.payload?.id;
  const connectionId = job.payload?.connection_id;

  if (dlqId) {
    const replayResult = await ReconciliationEngine.replayDlqEvent(dlqId, { db });
    return replayResult;
  }

  if (connectionId) {
    const report = await ReconciliationEngine.reconcileConnection(connectionId, {
      resourceType: job.payload?.resourceType || 'orders',
      db,
    });
    return report;
  }

  const allPending = await ReconciliationEngine.replayAllPendingDlq(undefined, { db });
  return { success: true, replayed: allPending.length, results: allPending };
}

/**
 * Handle send_sms_reminder queue action
 */
async function handleSendSmsReminder(job: DurableJob, db: SupabaseClient) {
  const businessId = job.business_id || job.payload?.business_id || '00000000-0000-0000-0000-000000000001';
  const customerId = job.payload?.customer_id;
  const message = job.payload?.message || job.payload?.content || 'Appointment reminder';
  let phone = job.payload?.phone;
  let customerName = job.payload?.customer_name || 'Customer';
  let locationId = job.payload?.location_id || null;

  if (customerId && db && !phone) {
    try {
      const { data: customer } = await db
        .from('customers')
        .select('id, name, phone, location_id, sms_opt_in')
        .eq('id', customerId)
        .maybeSingle();

      if (customer) {
        phone = customer.phone;
        customerName = customer.name || customerName;
        locationId = customer.location_id || locationId;
      }
    } catch {
      // Fallback
    }
  }

  let externalId: string | null = null;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (phone && twilioSid && twilioAuth && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioAuth);
      const twilioRes = await client.messages.create({
        body: message,
        from: twilioFrom,
        to: phone,
      });
      externalId = twilioRes.sid;
    } catch (err: any) {
      console.warn('[send_sms_reminder] Twilio send warning:', err.message);
    }
  }

  if (db && businessId) {
    try {
      await db.from('messages').insert({
        business_id: businessId,
        location_id: locationId,
        customer_id: customerId || null,
        customer: customerName,
        sender: 'System Reminder',
        content: message,
        body: message,
        channel: 'sms',
        direction: 'outbound',
        status: 'sent',
        external_id: externalId,
        to_address: phone || null,
        sent_at: new Date().toISOString(),
      });
    } catch {
      // Best-effort message record
    }
  }

  return { success: true, customerId, phone, externalId };
}

/**
 * Registry mapping queue action names to typed handlers
 */
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
};

/**
 * Dispatch a durable job to its registered handler
 */
export async function dispatchJob(job: DurableJob, db: SupabaseClient): Promise<any> {
  const handler = JOB_REGISTRY[job.queue_name];
  if (!handler) {
    throw new Error(`Unknown job queue: ${job.queue_name}`);
  }
  return await handler(job, db);
}
