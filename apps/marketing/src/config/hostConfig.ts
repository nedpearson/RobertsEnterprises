/**
 * VowOS Marketing/Product Hosts
 * 
 * These domains serve the VowOS marketing website (vowos.bridgebox.ai).
 * All other *.bridgebox.ai subdomains are TENANT application environments.
 * 
 * This is the SINGLE SOURCE OF TRUTH for this routing decision.
 * Both server.js and App.tsx read from this (or mirror it).
 */
export const MARKETING_HOSTS = ['vowos.bridgebox.ai', 'vowos.localhost'] as const;

export type MarketingHost = typeof MARKETING_HOSTS[number];

export function isMarketingHost(hostname: string): boolean {
  return (MARKETING_HOSTS as readonly string[]).includes(hostname);
}

/**
 * VowOS Application Shell Routes
 * Routes that serve the React app (index.html) even on marketing domains.
 */
export const APP_ROUTES_ON_MARKETING_HOST = ['/app', '/demo', '/login', '/signup', '/onboarding'] as const;
