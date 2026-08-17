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

/**
 * Returns a usable access token, refreshing it when it is expired or within the
 * 2-minute skew window. Throws with an actionable message when the connection
 * needs to be re-authorised.
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const { data, error } = await db()
    .from('growth_provider_secrets')
    .select('*')
    .eq('connection_id', connectionId)
    .maybeSingle();
  if (error) throw new Error(`getAccessToken failed: ${error.message}`);
  if (!data) throw new Error('No stored credentials for this connection — reconnect the provider.');

  const secret = data as { access_token: string | null; refresh_token: string | null; expires_at: string | null };
  const expiresAt = secret.expires_at ? new Date(secret.expires_at).getTime() : 0;
  const stillValid = secret.access_token && expiresAt - Date.now() > 120_000;
  if (stillValid) return secret.access_token as string;

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
