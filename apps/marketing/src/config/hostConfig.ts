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
