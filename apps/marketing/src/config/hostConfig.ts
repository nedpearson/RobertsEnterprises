/**
 * VowOS Marketing/Product Hosts
 *
 * `vowos.bridgebox.ai` is the public/platform origin. Production organizations
 * use `{slug}.vowos.bridgebox.ai`; legacy `{slug}.bridgebox.ai` hosts may still
 * be resolved only so the server can migrate/redirect them safely.
 *
 * Public demo surfaces are routes on the public VowOS origin:
 * - /demo    = guided/sales demo launcher
 * - /demoapp = full anonymous live sandbox with synthetic data
 */
export const MARKETING_HOSTS = ['vowos.bridgebox.ai', 'vowos.localhost', 'localhost', '127.0.0.1'] as const;
export const TENANT_DOMAIN_SUFFIX = '.vowos.bridgebox.ai';
export const LEGACY_TENANT_DOMAIN_SUFFIX = '.bridgebox.ai';
export const RESERVED_TENANT_SLUGS = new Set(['demo', 'demoapp', 'platform', 'www', 'api']);

export type MarketingHost = (typeof MARKETING_HOSTS)[number];

export function isMarketingHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().split(':')[0];
  return (MARKETING_HOSTS as readonly string[]).includes(normalized);
}

function validTenantSlug(slug: string): string | null {
  if (!slug || slug.includes('.') || RESERVED_TENANT_SLUGS.has(slug)) return null;
  return slug;
}

/**
 * Resolves a tenant slug from the host without confusing the nested canonical
 * tenant suffix with the legacy bridgebox.ai suffix.
 *
 * Examples:
 * - robertsenterprises.vowos.bridgebox.ai -> robertsenterprises
 * - robertsenterprises.vowos.bridgebox.ai       -> robertsenterprises (legacy)
 * - tenant.localhost                      -> tenant
 * - vowos.bridgebox.ai                    -> null (platform/marketing host)
 * - demo.vowos.bridgebox.ai               -> null (reserved; demo is /demo)
 * - demoapp.vowos.bridgebox.ai            -> null (reserved; live demo is /demoapp)
 */
export function resolveTenantSlugFromHost(hostname: string): string | null {
  const normalized = hostname.toLowerCase().split(':')[0];
  if (isMarketingHost(normalized)) return null;

  if (normalized.endsWith(TENANT_DOMAIN_SUFFIX)) {
    return validTenantSlug(normalized.slice(0, -TENANT_DOMAIN_SUFFIX.length));
  }

  if (normalized.endsWith(LEGACY_TENANT_DOMAIN_SUFFIX)) {
    return validTenantSlug(normalized.slice(0, -LEGACY_TENANT_DOMAIN_SUFFIX.length));
  }

  if (normalized.endsWith('.localhost')) {
    return validTenantSlug(normalized.slice(0, -'.localhost'.length));
  }

  // Custom domains require server-side organization mapping; never invent a
  // slug from an arbitrary hostname in the browser.
  return null;
}

/**
 * VowOS Application Shell Routes
 * Routes that serve the React app (index.html) even on marketing domains.
 */
export const APP_ROUTES_ON_MARKETING_HOST = ['/app', '/demo', '/demoapp', '/login', '/signup', '/onboarding', '/platform'] as const;

/**
 * PART G — SINGLE-HOST TENANT ROUTING
 *
 * There is NO wildcard DNS for `*.vowos.bridgebox.ai`. Verified 2026-08-20:
 * every `{slug}.vowos.bridgebox.ai` resolves NXDOMAIN, so any URL built from a
 * tenant slug sends the user to a host that cannot exist. Tenants are served on
 * the CURRENT ORIGIN; the organization is resolved from `business_memberships`
 * (see AuthContext), never from the hostname.
 *
 * `/app` is a public alias that server.js 302s to `/demoapp` on the marketing
 * host, so real tenants must NOT use it. `/workspace` is the real-tenant path.
 *
 * Do NOT reintroduce `{slug}.` URLs without first creating, in this order:
 * wildcard DNS, a wildcard TLS cert (Cloudflare Universal SSL does NOT cover
 * the third-level `*.vowos.bridgebox.ai`), and the Railway custom domain.
 */
export const TENANT_WORKSPACE_PATH = '/workspace';

/** Persisted choice for users who belong to more than one organization. */
const ACTIVE_BUSINESS_KEY = 'vowos_active_business_id';

/**
 * Roberts Enterprises was consolidated from two temporary top-level business
 * rows into one real organization on 2026-09-02. Some browsers still have one
 * of those retired ids in localStorage from pre-consolidation debugging. If we
 * honor that stale choice, scheduling queries correctly return zero because the
 * 3,692 appointment requests now live on the parent organization.
 *
 * Brand/store selection is handled separately by brand/location context, so
 * these retired business ids must always resolve to the Roberts organization.
 */
const RETIRED_BUSINESS_CANONICAL_IDS: Record<string, string> = {
  '65ad28de-3f86-428d-a5b6-9d89af3542fc': '82a5b426-78a2-47ba-896b-3146b1a99c53',
  '81c291ed-e9a0-430c-ab8c-7ed2216a9c62': '82a5b426-78a2-47ba-896b-3146b1a99c53',
};

export function canonicalizeBusinessId(businessId: string | null): string | null {
  if (!businessId) return null;
  return RETIRED_BUSINESS_CANONICAL_IDS[businessId] || businessId;
}

export function setActiveBusinessId(businessId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const canonicalBusinessId = canonicalizeBusinessId(businessId);
    if (canonicalBusinessId) window.localStorage.setItem(ACTIVE_BUSINESS_KEY, canonicalBusinessId);
    else window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  } catch {
    /* private mode / storage disabled — fall back to first membership */
  }
}

export function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedBusinessId = window.localStorage.getItem(ACTIVE_BUSINESS_KEY);
    const canonicalBusinessId = canonicalizeBusinessId(storedBusinessId);
    if (canonicalBusinessId && canonicalBusinessId !== storedBusinessId) {
      window.localStorage.setItem(ACTIVE_BUSINESS_KEY, canonicalBusinessId);
    }
    return canonicalBusinessId;
  } catch {
    return null;
  }
}
