/**
 * Google OAuth for the Growth providers.
 *
 * Deliberately dependency-free: googleapis is a very large package and we need
 * exactly three calls (consent URL, code exchange, refresh). Node's global
 * fetch covers it.
 *
 * Tokens never leave the worker. They are written to growth_provider_secrets,
 * which has RLS enabled and no policies, so only the service-role client can
 * read them back.
 */

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const PROVIDER_SCOPES: Record<string, string[]> = {
  google_search_console: ['https://www.googleapis.com/auth/webmasters.readonly'],
  google_business_profile: ['https://www.googleapis.com/auth/business.manage'],
  google_analytics: ['https://www.googleapis.com/auth/analytics.readonly'],
};
PROVIDER_SCOPES.google = Array.from(new Set([
  ...PROVIDER_SCOPES.google_search_console,
  ...PROVIDER_SCOPES.google_business_profile,
  ...PROVIDER_SCOPES.google_analytics,
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

function stateSigningSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('OAuth state signing is unavailable because OAUTH_STATE_SECRET/SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return secret;
}

/**
 * `state` carries tenant/provider context and a short-lived nonce through the
 * OAuth redirect. It is signed with a server-only secret; there is no fallback
 * development key that could accidentally ship to production.
 */
export async function signState(payload: Record<string, string>): Promise<string> {
  const { createHmac, randomBytes } = await import('node:crypto');
  const enriched = {
    ...payload,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + 15 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(enriched)).toString('base64url');
  const sig = createHmac('sha256', stateSigningSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export async function verifyState(state: string): Promise<Record<string, any> | null> {
  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = createHmac('sha256', stateSigningSecret()).update(body).digest('base64url');
  } catch {
    return null;
  }

  const supplied = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > Number(decoded.exp)) return null;
    return decoded;
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
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `Google token endpoint returned ${response.status}: ${String(json.error_description ?? json.error ?? 'unknown error')}`,
    );
  }

  const accessToken = typeof json.access_token === 'string' ? json.access_token : '';
  if (!accessToken) throw new Error('Google token endpoint returned no access token.');

  const expiresIn = Number(json.expires_in ?? 3600);
  return {
    accessToken,
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
