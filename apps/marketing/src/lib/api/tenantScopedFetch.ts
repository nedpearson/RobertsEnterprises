import { getActiveBusinessId } from '@/config/hostConfig';

const TENANT_SCOPED_API_PREFIXES = ['/api/growth', '/api/shopify'] as const;

function normalizedOrigin(rawUrl: string | undefined, fallbackOrigin: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl, fallbackOrigin).origin;
  } catch {
    return null;
  }
}

/**
 * Only the VowOS browser origin and the explicitly configured VowOS API origin
 * receive tenant context. Provider URLs (Shopify/Meta/Google) and every other
 * cross-origin request are deliberately excluded so organization IDs never leak
 * to third parties.
 */
export function shouldAttachBusinessHeader(
  rawUrl: string,
  origin: string,
  apiBaseUrl?: string,
): boolean {
  try {
    const pageOrigin = new URL(origin).origin;
    const url = new URL(rawUrl, pageOrigin);
    const allowedOrigins = new Set<string>([pageOrigin]);
    const apiOrigin = normalizedOrigin(apiBaseUrl, pageOrigin);
    if (apiOrigin) allowedOrigins.add(apiOrigin);

    if (!allowedOrigins.has(url.origin)) return false;
    return TENANT_SCOPED_API_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
  } catch {
    return false;
  }
}

export function mergeBusinessHeader(
  requestHeaders: HeadersInit | undefined,
  initHeaders: HeadersInit | undefined,
  businessId: string,
): Headers {
  const headers = new Headers(requestHeaders);
  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => headers.set(key, value));
  }
  if (!headers.has('X-Business-Id')) {
    headers.set('X-Business-Id', businessId);
  }
  return headers;
}

/**
 * Installs one narrow fetch interceptor for authenticated tenant-scoped APIs.
 *
 * Production serves the browser and worker on separate trusted origins
 * (robertsenterprises.bridgebox.ai and api.robertsenterprises.bridgebox.ai), so
 * tenant context must follow requests to the exact configured VITE_API_URL as
 * well as same-origin API routes. The worker still verifies membership; this
 * header selects context and never grants authorization by itself.
 */
export function installTenantScopedApiFetch(): void {
  if (typeof window === 'undefined' || window.__vowosTenantScopedFetchInstalled) return;

  const originalFetch = window.fetch.bind(window);
  const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!shouldAttachBusinessHeader(rawUrl, window.location.origin, apiBaseUrl)) {
      return originalFetch(input, init);
    }

    const businessId = getActiveBusinessId();
    if (!businessId) {
      return originalFetch(input, init);
    }

    if (input instanceof Request) {
      const headers = mergeBusinessHeader(input.headers, init?.headers, businessId);
      return originalFetch(new Request(input, { ...init, headers }));
    }

    const headers = mergeBusinessHeader(undefined, init?.headers, businessId);
    return originalFetch(input, { ...init, headers });
  };

  window.__vowosTenantScopedFetchInstalled = true;
}

declare global {
  interface Window {
    __vowosTenantScopedFetchInstalled?: boolean;
  }
}
