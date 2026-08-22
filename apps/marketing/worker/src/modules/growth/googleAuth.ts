/**
 * Google OAuth for the Growth providers.
 *
 * Deliberately dependency-free: Node's global fetch covers the OAuth exchange
 * and the provider modules call Google REST APIs directly. Tokens never leave
 * the worker and are stored in growth_provider_secrets (service-role only).
 */

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const PROVIDER_SCOPES: Record<string, string[]> = {
  google_search_console: ['https://www.googleapis.com/auth/webmasters.readonly'],
  google_business_profile: ['https://www.googleapis.com/auth/business.manage'],
  google_analytics: ['https://www.googleapis.com/auth/analytics.readonly'],
  google_ads: ['https://www.googleapis.com/auth/adwords'],
};
PROVIDER_SCOPES['google'] = Array.from(new Set([
  ...PROVIDER_SCOPES.google_search_console,
  ...PROVIDER_SCOPES.google_business_profile,
  ...PROVIDER_SCOPES.google_analytics,
  ...PROVIDER_SCOPES.google_ads,
]));

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function readOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: Date;
  scope: string | null;
}

/**
 * `state` carries business_id + provider through the redirect. It is signed with
 * the service-role key so a third party cannot forge a callback that attaches
 * their Google account to someone else's tenant.
 */
export async function signState(payload: Record<string, string>): Promise<string> {
  const { createHmac } = await import('node:crypto');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'insecure-dev-secret';
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export async function verifyState(state: string): Promise<Record<string, string> | null> {
  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'insecure-dev-secret';
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function buildConsentUrl(
  config: GoogleOAuthConfig,
  scopes: string[],
  state: string,
  loginHint?: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  if (loginHint) params.set('login_hint', loginHint);
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

async function postToken(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Google token endpoint returned ${res.status}: ${String(json.error_description ?? json.error ?? 'unknown error')}`,
    );
  }
  const expiresIn = Number(json.expires_in ?? 3600);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    tokenType: String(json.token_type ?? 'Bearer'),
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: json.scope ? String(json.scope) : null,
  };
}

export function exchangeCode(config: GoogleOAuthConfig, code: string): Promise<TokenSet> {
  return postToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  );
}

export function refreshAccessToken(config: GoogleOAuthConfig, refreshToken: string): Promise<TokenSet> {
  return postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  );
}
