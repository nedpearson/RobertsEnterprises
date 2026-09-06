/**
 * Shopify Admin REST client.
 *
 * Shopify offline access tokens do not expire, so the generic growth
 * getAccessToken() refresh lifecycle does not apply here — and routing Shopify
 * through it works only by accident (a null refresh_token makes it take the
 * Meta branch). This module reads the stored credential directly so the
 * behaviour is explicit rather than incidental.
 *
 * Every call is bounded by a timeout, retries only on 429/5xx, and honours
 * Shopify's Retry-After. Nothing here ever returns a fabricated success.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SHOPIFY_API_VERSION } from './oauth';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 500;

export class ShopifyAdminError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly shopDomain: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'ShopifyAdminError';
  }

  /** 401/403 mean the merchant revoked or downgraded the grant — reconnect required. */
  get requiresReauth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface ShopifyAdminClient {
  shopDomain: string;
  get<T = any>(path: string, query?: Record<string, string | number | undefined>): Promise<T>;
  post<T = any>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  /** Follows Shopify's Link: rel="next" cursor pagination to exhaustion. */
  paginate<T = any>(
    path: string,
    collectionKey: string,
    query?: Record<string, string | number | undefined>,
    pageLimit?: number,
  ): Promise<T[]>;
}

function adminTimeoutMs(): number {
  const configured = Number(process.env.SHOPIFY_HTTP_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 25 && configured <= 60_000
    ? Math.floor(configured)
    : DEFAULT_TIMEOUT_MS;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelayMs(response: { headers: { get(name: string): string | null } } | null, attempt: number): number {
  const retryAfter = response?.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 10_000);
  }
  return Math.min(BASE_BACKOFF_MS * 2 ** attempt, 8_000);
}

/**
 * Reads the stored offline token for a Shopify connection.
 *
 * growth_provider_secrets has RLS enabled with no policies, so this is only
 * reachable with the service-role client.
 */
export async function getShopifyAccessToken(
  db: SupabaseClient | any,
  connectionId: string,
): Promise<string> {
  const { data, error } = await db
    .from('growth_provider_secrets')
    .select('access_token')
    .eq('connection_id', connectionId)
    .maybeSingle();

  if (error) throw new Error(`Could not read Shopify credentials: ${error.message}`);
  const token = typeof data?.access_token === 'string' ? data.access_token.trim() : '';
  if (!token) {
    throw new Error('No Shopify access token is stored for this connection — reconnect the store.');
  }
  return token;
}

/** Parses the next-page cursor out of Shopify's Link header. */
export function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    if (!/rel="next"/.test(part)) continue;
    const match = part.match(/<([^>]+)>/);
    if (!match) continue;
    try {
      return new URL(match[1]).searchParams.get('page_info');
    } catch {
      return null;
    }
  }
  return null;
}

export function createShopifyAdminClient(shopDomain: string, accessToken: string): ShopifyAdminClient {
  const base = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}`;

  async function request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<{ json: any; headers: Headers }> {
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method,
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(adminTimeoutMs()),
        });
      } catch (error) {
        const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
        lastError = new Error(
          isTimeout
            ? `Shopify Admin ${method} ${path} timed out after ${adminTimeoutMs()}ms.`
            : `Shopify Admin ${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (attempt === MAX_ATTEMPTS - 1) break;
        await sleep(retryDelayMs(null, attempt));
        continue;
      }

      // 429 and 5xx are transient. Everything else is a definitive answer.
      if (response.status === 429 || response.status >= 500) {
        lastError = new ShopifyAdminError(
          `Shopify Admin ${method} ${path} returned ${response.status}.`,
          response.status,
          shopDomain,
          path,
        );
        if (attempt === MAX_ATTEMPTS - 1) break;
        await sleep(retryDelayMs(response, attempt));
        continue;
      }

      if (response.status === 204) return { json: {}, headers: response.headers };

      const text = await response.text();
      let json: any = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          throw new ShopifyAdminError(
            `Shopify Admin ${method} ${path} returned a non-JSON response (${response.status}).`,
            response.status,
            shopDomain,
            path,
          );
        }
      }

      if (!response.ok) {
        const detail = json?.errors ?? json?.error ?? `HTTP ${response.status}`;
        throw new ShopifyAdminError(
          `Shopify Admin ${method} ${path} failed (${response.status}): ${
            typeof detail === 'string' ? detail : JSON.stringify(detail)
          }`,
          response.status,
          shopDomain,
          path,
        );
      }

      return { json, headers: response.headers };
    }

    throw lastError ?? new Error(`Shopify Admin ${method} ${path} failed after ${MAX_ATTEMPTS} attempts.`);
  }

  return {
    shopDomain,

    async get<T = any>(path, query) {
      const { json } = await request('GET', path, { query });
      return json as T;
    },

    async post<T = any>(path, body) {
      const { json } = await request('POST', path, { body });
      return json as T;
    },

    async del(path) {
      await request('DELETE', path);
    },

    async paginate<T = any>(path, collectionKey, query, pageLimit = 50) {
      const collected: T[] = [];
      let pageInfo: string | null = null;

      for (let page = 0; page < pageLimit; page += 1) {
        // Shopify rejects filter params alongside page_info; only limit survives.
        const pageQuery = pageInfo
          ? { limit: query?.limit ?? 250, page_info: pageInfo }
          : { limit: 250, ...query };

        const { json, headers } = await request('GET', path, { query: pageQuery as Record<string, string | number> });
        const rows = Array.isArray(json?.[collectionKey]) ? json[collectionKey] : [];
        collected.push(...rows);

        pageInfo = parseNextPageInfo(headers.get('Link') ?? headers.get('link'));
        if (!pageInfo || rows.length === 0) break;
      }

      return collected;
    },
  };
}

/**
 * Builds an Admin client for a stored connection. Throws rather than returning
 * a degraded client, so no caller can mistake "no credentials" for "no data".
 */
export async function adminClientForConnection(
  db: SupabaseClient | any,
  connection: { id: string; shopDomain: string },
): Promise<ShopifyAdminClient> {
  const token = await getShopifyAccessToken(db, connection.id);
  return createShopifyAdminClient(connection.shopDomain, token);
}
