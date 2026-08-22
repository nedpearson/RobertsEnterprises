/**
 * Service-role persistence for the Growth providers.
 *
 * This is the ONLY place growth_provider_secrets is touched. That table has RLS
 * enabled with no policies, so it is unreadable by anon/authenticated clients —
 * the service-role key here is the sole path to a refresh token.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { growthDb } from './client';
import { readOAuthConfig, refreshAccessToken, type TokenSet } from './googleAuth';
import { readMetaConfig, exchangeForLongLived } from './metaAuth';

export type Db = SupabaseClient;

// Module-local client: importing src/index.ts here created a require cycle.
export const db = (): Db => growthDb();

export interface ConnectionRow {
  id: string;
  business_id: string;
  provider: string;
  status: string;
  external_account_id: string | null;
  display_name: string | null;
  scopes: string[];
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
}

export async function upsertConnection(
  businessId: string,
  provider: string,
  patch: Partial<ConnectionRow>,
): Promise<ConnectionRow> {
  const existing = await db()
    .from('growth_provider_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('provider', provider)
    .maybeSingle();

  if (existing.data) {
    const { data, error } = await db()
      .from('growth_provider_connections')
      .update(patch)
      .eq('id', (existing.data as ConnectionRow).id)
      .select('*')
      .single();
    if (error) throw new Error(`upsertConnection(update) failed: ${error.message}`);
    return data as ConnectionRow;
  }

  const { data, error } = await db()
    .from('growth_provider_connections')
    .insert({ business_id: businessId, provider, ...patch })
    .select('*')
    .single();
  if (error) throw new Error(`upsertConnection(insert) failed: ${error.message}`);
  return data as ConnectionRow;
}

export async function saveTokens(connectionId: string, tokens: TokenSet): Promise<void> {
  const payload: Record<string, unknown> = {
    connection_id: connectionId,
    access_token: tokens.accessToken,
    token_type: tokens.tokenType,
    expires_at: tokens.expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Google only returns a refresh_token on first consent. Never overwrite a
  // stored one with null, or background sync dies at the next expiry.
  if (tokens.refreshToken) payload.refresh_token = tokens.refreshToken;

  const { error } = await db()
    .from('growth_provider_secrets')
    .upsert(payload, { onConflict: 'connection_id' });
  if (error) throw new Error(`saveTokens failed: ${error.message}`);
}

/** Proactive refresh window for Meta 60-day long-lived tokens (7 days). */
const META_PROACTIVE_REFRESH_WINDOW_MS = 7 * 24 * 3600 * 1000;

/**
 * Returns a usable access token, refreshing it when it is expired or within the
 * skew window. For Meta, proactively renews ~60-day long-lived tokens via
 * fb_exchange_token when nearing expiry.
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const { data: secretData, error: secretError } = await db()
    .from('growth_provider_secrets')
    .select('*')
    .eq('connection_id', connectionId)
    .maybeSingle();
  if (secretError) throw new Error(`getAccessToken failed: ${secretError.message}`);
  if (!secretData) throw new Error('No stored credentials for this connection — reconnect the provider.');

  const secret = secretData as { access_token: string | null; refresh_token: string | null; expires_at: string | null };
  if (!secret.access_token) throw new Error('No access token stored for this connection — reconnect the provider.');

  const expiresAt = secret.expires_at ? new Date(secret.expires_at).getTime() : 0;
  const now = Date.now();
  const timeRemainingMs = expiresAt - now;

  // Resolve connection row to determine provider type
  const { data: connData } = await db()
    .from('growth_provider_connections')
    .select('id, provider')
    .eq('id', connectionId)
    .maybeSingle();
  const provider = (connData as { provider?: string } | null)?.provider ?? '';
  const isMeta = provider.startsWith('meta') || (!secret.refresh_token && !provider.startsWith('google'));

  // -------------------------------------------------------------------------
  // Meta Long-Lived Token Refresh Lifecycle
  // -------------------------------------------------------------------------
  if (isMeta) {
    // If token has plenty of lifetime remaining (> 7 days), use directly
    if (timeRemainingMs > META_PROACTIVE_REFRESH_WINDOW_MS) {
      return secret.access_token;
    }

    // Token is nearing expiration (< 7 days) or already expired: proactively exchange
    const metaConfig = readMetaConfig();
    if (!metaConfig) {
      if (timeRemainingMs > 120_000) return secret.access_token;
      throw new Error('META_APP_ID / META_APP_SECRET are not configured on the worker.');
    }

    try {
      const refreshed = await exchangeForLongLived(metaConfig, secret.access_token);
      await saveTokens(connectionId, {
        accessToken: refreshed.accessToken,
        refreshToken: null,
        tokenType: refreshed.tokenType,
        expiresAt: refreshed.expiresAt,
        scope: null,
      });
      return refreshed.accessToken;
    } catch (refreshErr) {
      // If proactive refresh failed but token is still immediately valid (> 2 mins), continue
      if (timeRemainingMs > 120_000) {
        console.warn('[growth-store] Meta proactive refresh failed; using valid token until expiry:', refreshErr);
        return secret.access_token;
      }
      const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
      await db()
        .from('growth_provider_connections')
        .update({ status: 'error', last_error: `Token refresh failed: ${msg}` })
        .eq('id', connectionId);
      throw new Error(`Meta access token expired and could not be refreshed (${msg}) — reconnect the provider.`);
    }
  }

  // -------------------------------------------------------------------------
  // Google OAuth Refresh Lifecycle
  // -------------------------------------------------------------------------
  const stillValid = timeRemainingMs > 120_000;
  if (stillValid) return secret.access_token;

  if (!secret.refresh_token) {
    throw new Error('Access token expired and no refresh token is stored — reconnect the provider.');
  }
  const config = readOAuthConfig();
  if (!config) throw new Error('GOOGLE_OAUTH_* environment variables are not configured on the worker.');

  const refreshed = await refreshAccessToken(config, secret.refresh_token);
  await saveTokens(connectionId, { ...refreshed, refreshToken: refreshed.refreshToken ?? secret.refresh_token });
  return refreshed.accessToken;
}

export interface SyncRunHandle {
  id: string;
  finish: (status: 'success' | 'partial' | 'failed', recordsWritten: number, error?: string) => Promise<void>;
}

export async function startSyncRun(
  businessId: string,
  connectionId: string | null,
  provider: string,
  job: string,
): Promise<SyncRunHandle> {
  const { data, error } = await db()
    .from('growth_sync_runs')
    .insert({ business_id: businessId, connection_id: connectionId, provider, job, status: 'running' })
    .select('id')
    .single();
  if (error) throw new Error(`startSyncRun failed: ${error.message}`);

  const id = (data as { id: string }).id;
  return {
    id,
    finish: async (status, recordsWritten, errMessage) => {
      await db()
        .from('growth_sync_runs')
        .update({
          status,
          records_written: recordsWritten,
          error: errMessage ?? null,
          finished_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (connectionId) {
        await db()
          .from('growth_provider_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: status,
            last_error: errMessage ?? null,
          })
          .eq('id', connectionId);
      }
    },
  };
}

/** Chunked upsert — Supabase rejects very large single payloads. */
export async function upsertRows(
  table: string,
  rows: readonly object[],
  onConflict: string,
  chunkSize = 500,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize) as Record<string, unknown>[];
    const { error } = await db().from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`upsert into ${table} failed: ${error.message}`);
    written += chunk.length;
  }
  return written;
}
