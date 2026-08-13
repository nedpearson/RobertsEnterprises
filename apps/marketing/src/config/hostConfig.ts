/**
 * VowOS Marketing/Product Hosts
 * 
 * These domains serve the VowOS marketing website (vowos.bridgebox.ai).
 * All other *.bridgebox.ai subdomains are TENANT application environments.
 * 
 * This is the SINGLE SOURCE OF TRUTH for this routing decision.
 * Both server.js and App.tsx read from this (or mirror it).
 */
export const MARKETING_HOSTS = ['vowos.bridgebox.ai', 'vowos.localhost', 'localhost'] as const;

export type MarketingHost = typeof MARKETING_HOSTS[number];

export function isMarketingHost(hostname: string): boolean {
  return (MARKETING_HOSTS as readonly string[]).includes(hostname);
}

/**
 * Resolves the tenant slug from the hostname.
 * Examples:
 * - properandcompany.bridgebox.ai -> properandcompany
 * - tenant.localhost -> tenant
 * - vowos.bridgebox.ai -> null (marketing host)
 */
export function resolveTenantSlugFromHost(hostname: string): string | null {
  if (isMarketingHost(hostname)) return null;

  // Handle .bridgebox.ai subdomains
  if (hostname.endsWith('.bridgebox.ai')) {
    return hostname.replace('.bridgebox.ai', '');
  }

  // Handle .localhost subdomains
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }

  // Fallback to the hostname itself if it's a custom domain mapped to a tenant
  // (In a full implementation, you'd look this up in the DB, but for now we return the host)
  return hostname;
}

/**
 * VowOS Application Shell Routes
 * Routes that serve the React app (index.html) even on marketing domains.
 */
export const APP_ROUTES_ON_MARKETING_HOST = ['/app', '/demo', '/login', '/signup', '/onboarding', '/platform'] as const;
