import { getActiveBusinessId } from '@/config/hostConfig';

const TENANT_SCOPED_API_PREFIXES = ['/api/growth', '/api/shopify'] as const;

/**
 * Only same-origin VowOS service-role endpoints receive tenant context.
 * Provider URLs (Shopify/Meta/Google) and every other cross-origin request are
 * deliberately excluded so organization IDs never leak to third parties.
 */
export function shouldAttachBusinessHeader(rawUrl: string, origin: string): boolean {
  try {
    const url = new URL(rawUrl, origin);
    if (url.origin !== origin) return false;
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
 * This fixes OAuth/bootstrap GET requests such as `/api/shopify/connect`, which
 * cannot carry businessId in a request body. The active workspace is selected
 * during login and stored by hostConfig. The worker still verifies membership,
 * so this header is context selection, never authorization by itself.
 */
export function installTenantScopedApiFetch(): void {
  if (typeof window === 'undefined' || window.__vowosTenantScopedFetchInstalled) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!shouldAttachBusinessHeader(rawUrl, window.location.origin)) {
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
