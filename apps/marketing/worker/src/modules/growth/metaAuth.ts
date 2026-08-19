/**
 * Meta (Facebook / Instagram) OAuth.
 *
 * Separate from googleAuth because the flows genuinely differ: Meta issues a
 * short-lived token that must be exchanged for a ~60-day long-lived one, and
 * there is no refresh_token — you re-exchange before expiry or the user
 * reconnects. Modelling that as "Google with different URLs" would have quietly
 * broken sync two months in.
 *
 * ACCESS MODEL (verified against Meta's permissions reference, 2026-08):
 *   ads_read, instagram_basic, instagram_manage_insights, pages_read_engagement,
 *   pages_show_list and business_management all require App Review AND Business
 *   Verification to touch data your app does not own.
 *   BUT under Standard Access (development mode) they work for ad accounts and
 *   pages belonging to users who hold a role on the app (admin/developer/
 *   tester). So this works for Roberts Enterprises immediately; App Review is
 *   only needed to onboard other tenants.
 */

/**
 * Graph API versions are retired roughly two years after release, so this is
 * deliberately env-overridable — a hardcoded version turns into an outage on
 * Meta's schedule rather than yours. v25.0 shipped 2026-02.
 */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const META_SCOPES: Record<string, string[]> = {
  meta_ads: ['ads_read', 'business_management'],
  meta_social: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
};
META_SCOPES['meta'] = Array.from(new Set([
  ...META_SCOPES.meta_ads,
  ...META_SCOPES.meta_social,
]));

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export function readMetaConfig(): MetaOAuthConfig | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return null;
  return { appId, appSecret, redirectUri };
}

export function buildMetaConsentUrl(config: MetaOAuthConfig, scopes: string[], state: string): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopes.join(','),
    state,
  });
  return `${DIALOG_BASE}?${params.toString()}`;
}

export interface MetaTokenSet {
  accessToken: string;
  expiresAt: Date;
  tokenType: string;
}

async function readJson(res: Response, context: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${context}: non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = json.error as { message?: string; code?: number; error_user_msg?: string } | undefined;
    throw new Error(`${context} failed (${res.status}): ${err?.error_user_msg ?? err?.message ?? text.slice(0, 200)}`);
  }
  return json;
}

/** Short-lived token from the auth code. Always follow with exchangeForLongLived. */
export async function exchangeMetaCode(config: MetaOAuthConfig, code: string): Promise<MetaTokenSet> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });
  const json = await readJson(await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`), 'Meta code exchange');
  return {
    accessToken: String(json.access_token),
    tokenType: String(json.token_type ?? 'bearer'),
    expiresAt: new Date(Date.now() + Number(json.expires_in ?? 3600) * 1000),
  };
}

/**
 * Upgrade to a ~60-day token. Re-running this on a still-valid long-lived token
 * extends it, which is how a connection stays alive without user interaction.
 */
export async function exchangeForLongLived(config: MetaOAuthConfig, shortToken: string): Promise<MetaTokenSet> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortToken,
  });
  const json = await readJson(await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`), 'Meta long-lived exchange');
  return {
    accessToken: String(json.access_token),
    tokenType: String(json.token_type ?? 'bearer'),
    // Meta returns ~5,184,000s (60 days). Default conservatively if absent.
    expiresAt: new Date(Date.now() + Number(json.expires_in ?? 60 * 24 * 3600) * 1000),
  };
}
