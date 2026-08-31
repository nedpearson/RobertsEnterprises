/**
 * Provider repair capability boundary.
 *
 * Recovery may classify failures and coordinate real provider adapters, but it
 * must never fabricate remote webhook IDs, OAuth tokens, Drive watch channels,
 * or other provider state. Until a provider-side repair adapter is wired to the
 * corresponding official API, these operations fail closed and instruct the
 * caller to reconnect through the real integration flow.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoogleDriveWatchRow, ProviderConnectionRow } from './types';

export interface RepairResultPayload {
  success: boolean;
  actionTaken: string;
  details?: Record<string, unknown>;
  error?: string;
}

function unavailable(
  actionTaken: string,
  provider: string,
  connectionId?: string,
  detail?: string,
): RepairResultPayload {
  const error = detail || `No verified ${provider} provider-side repair adapter is configured.`;
  return {
    success: false,
    actionTaken,
    error,
    details: {
      provider,
      connectionId: connectionId || null,
      providerMutationPerformed: false,
      manualInterventionRequired: true,
      reason: error,
    },
  };
}

export class RepairActions {
  /**
   * Shopify webhook creation must be performed against the Shopify Admin API
   * with the OAuth-bound store token. Local metadata is not evidence that a
   * webhook exists remotely, so this method deliberately does not mutate DB
   * health or invent a webhook secret/id.
   */
  static async repairShopifyWebhook(
    connection: Partial<ProviderConnectionRow> & { id: string },
    _options?: { db?: SupabaseClient; customWebhookUrl?: string },
  ): Promise<RepairResultPayload> {
    return unavailable(
      'WEBHOOK_RECREATED',
      'shopify',
      connection.id,
      'Shopify webhook repair requires a verified Admin API adapter using the OAuth-bound store credential. No remote mutation was attempted.',
    );
  }

  /** Meta subscriptions are provider-side resources and cannot be repaired by
   * writing local metadata alone. */
  static async repairMetaWebhook(
    connection: Partial<ProviderConnectionRow> & { id: string },
    _options?: { db?: SupabaseClient },
  ): Promise<RepairResultPayload> {
    return unavailable(
      'WEBHOOK_RECREATED',
      String(connection.provider || 'meta'),
      connection.id,
      'Meta webhook repair requires the real Graph API subscription flow. No remote mutation was attempted.',
    );
  }

  /**
   * Token refresh is owned by the provider OAuth modules/secrets store. Recovery
   * never manufactures an access token or stores a caller-provided stand-in.
   */
  static async refreshGoogleToken(
    connection: Partial<ProviderConnectionRow> & { id: string },
    _options?: { db?: SupabaseClient },
  ): Promise<RepairResultPayload> {
    const hasRefreshCredential = Boolean(connection.metadata?.refresh_token || connection.auth_token);
    return unavailable(
      'TOKEN_REFRESHED',
      String(connection.provider || 'google'),
      connection.id,
      hasRefreshCredential
        ? 'Google token refresh must run through the configured Google OAuth credential store. Recovery did not mint or persist a replacement token.'
        : 'No Google refresh credential is available. Reconnect the Google integration.',
    );
  }

  static async refreshMetaLongLivedToken(
    connection: Partial<ProviderConnectionRow> & { id: string },
    _options?: { db?: SupabaseClient },
  ): Promise<RepairResultPayload> {
    return unavailable(
      'TOKEN_REFRESHED',
      String(connection.provider || 'meta'),
      connection.id,
      'Meta token renewal must run through the configured Meta OAuth flow. Recovery did not mint or persist a replacement token.',
    );
  }

  /** Drive watch channels must be created by the Google Drive API. */
  static async renewGoogleDriveWatch(
    watch: Partial<GoogleDriveWatchRow> & {
      channel_id?: string;
      resource_id?: string;
      provider_connection_id?: string;
    },
    connection?: Partial<ProviderConnectionRow>,
    _options?: { db?: SupabaseClient },
  ): Promise<RepairResultPayload> {
    return unavailable(
      'WATCH_RENEWED',
      'google_drive',
      watch.provider_connection_id || connection?.id,
      'Google Drive watch renewal requires a successful Drive API channels/watch operation. No local channel was fabricated.',
    );
  }

  /**
   * Counts expiring watches that require a real provider renewal. Returning them
   * as failed keeps monitoring honest instead of reporting synthetic renewals.
   */
  static async batchRenewDriveWatches(
    options?: { db?: SupabaseClient; businessId?: string },
  ): Promise<{ renewed: number; failed: number }> {
    const db = options?.db;
    if (!db) return { renewed: 0, failed: 0 };

    const thresholdIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    let query = db
      .from('google_drive_watches')
      .select('id')
      .or(`expiration_timestamp.lt.${thresholdIso},status.eq.EXPIRING_SOON,status.eq.EXPIRED`);

    if (options?.businessId) query = query.eq('business_id', options.businessId);

    const { data, error } = await query;
    if (error) throw new Error(`Could not inspect Google Drive watches: ${error.message}`);

    return { renewed: 0, failed: data?.length || 0 };
  }
}
