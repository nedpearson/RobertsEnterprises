/**
 * VowOS Marketing/Product Hosts
 *
 * `vowos.bridgebox.ai` is the public/platform origin. Production organizations
 * use `{slug}.vowos.bridgebox.ai`; legacy `{slug}.bridgebox.ai` hosts may still
 * be resolved only so the server can migrate/redirect them safely.
 */
export const MARKETING_HOSTS = ['vowos.bridgebox.ai', 'vowos.localhost', 'localhost'] as const;
export const TENANT_DOMAIN_SUFFIX = '.vowos.bridgebox.ai';
export const LEGACY_TENANT_DOMAIN_SUFFIX = '.bridgebox.ai';

export type MarketingHost = (typeof MARKETING_HOSTS)[number];

export function isMarketingHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().split(':')[0];
  return (MARKETING_HOSTS as readonly string[]).includes(normalized);
}

/**
 * Resolves a tenant slug from the host without confusing the nested canonical
 * tenant suffix with the legacy bridgebox.ai suffix.
 *
 * Examples:
 * - robertsenterprises.vowos.bridgebox.ai -> robertsenterprises
 * - robertsenterprises.bridgebox.ai       -> robertsenterprises (legacy)
 * - tenant.localhost                      -> tenant
 * - vowos.bridgebox.ai                    -> null (platform/marketing host)
 */
export function resolveTenantSlugFromHost(hostname: string): string | null {
  const normalized = hostname.toLowerCase().split(':')[0];
  if (isMarketingHost(normalized)) return null;

  if (normalized.endsWith(TENANT_DOMAIN_SUFFIX)) {
    const slug = normalized.slice(0, -TENANT_DOMAIN_SUFFIX.length);
    return slug && !slug.includes('.') ? slug : null;
  }

  if (normalized.endsWith(LEGACY_TENANT_DOMAIN_SUFFIX)) {
    const slug = normalized.slice(0, -LEGACY_TENANT_DOMAIN_SUFFIX.length);
    return slug && !slug.includes('.') ? slug : null;
  }

  if (normalized.endsWith('.localhost')) {
    const slug = normalized.slice(0, -'.localhost'.length);
    return slug && !slug.includes('.') ? slug : null;
  }

  // Custom domains require server-side organization mapping; never invent a
  // slug from an arbitrary hostname in the browser.
  return null;
}

/**
 * VowOS Application Shell Routes
 * Routes that serve the React app (index.html) even on marketing domains.
 */
export const APP_ROUTES_ON_MARKETING_HOST = ['/app', '/demo', '/login', '/signup', '/onboarding', '/platform'] as const;
