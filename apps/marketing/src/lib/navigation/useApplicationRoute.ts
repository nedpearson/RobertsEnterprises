import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { WORKSPACES, getLegacyNavigationItems, ViewKey } from './navigationRegistry';

export const DEMO_APP_PREFIX = '/demoapp';
export const TENANT_WORKSPACE_PREFIX = '/workspace';

export function isDemoAppPath(pathname: string): boolean {
  return pathname === DEMO_APP_PREFIX || pathname === `${DEMO_APP_PREFIX}/` || pathname.startsWith(`${DEMO_APP_PREFIX}/`);
}

export function stripDemoAppPrefix(pathname: string): string {
  if (!isDemoAppPath(pathname)) return pathname;
  const stripped = pathname.slice(DEMO_APP_PREFIX.length);
  return stripped === '' || stripped === '/' ? '/' : stripped;
}

/**
 * `/workspace` is the canonical post-login entry for real tenants. It is a
 * namespace, not a view, so resolve it through the same registry as root
 * application routes. This keeps newly provisioned organizations from landing
 * on the shell-level 404 immediately after sign-in.
 */
export function stripTenantWorkspacePrefix(pathname: string): string {
  if (pathname === TENANT_WORKSPACE_PREFIX || pathname === `${TENANT_WORKSPACE_PREFIX}/`) return '/';
  if (!pathname.startsWith(`${TENANT_WORKSPACE_PREFIX}/`)) return pathname;

  const stripped = pathname.slice(TENANT_WORKSPACE_PREFIX.length);
  return stripped === '' || stripped === '/' ? '/' : stripped;
}

export function withDemoAppPrefix(path: string, demoApp: boolean): string {
  if (!demoApp) return path;
  if (path === '/') return DEMO_APP_PREFIX;
  return `${DEMO_APP_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Normalizes invalid root-level ?mode= query parameters by redirecting to the canonical appointments route.
 * Demo-app navigation remains inside /demoapp so refresh/back never drops the isolated demo data plane.
 */
export function useRouteNormalization() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const mode = searchParams.get('mode');
    const normalizedPath = stripDemoAppPrefix(location.pathname);
    if (mode && !normalizedPath.startsWith('/appointments') && !normalizedPath.startsWith('/schedule')) {
      const schedulePath = withDemoAppPrefix('/appointments', isDemoAppPath(location.pathname));
      navigate(`${schedulePath}?mode=${encodeURIComponent(mode)}`, { replace: true });
    }
  }, [location.pathname, searchParams, navigate]);
}

/**
 * Derives the active ViewKey from the current browser URL. /demoapp is a URL
 * namespace, not a second application, so its prefix is removed before matching
 * the canonical navigation registry.
 */
export function getViewFromLocation(pathname: string): ViewKey | 'not-found' {
  const normalizedPath = stripTenantWorkspacePrefix(stripDemoAppPrefix(pathname));
  if (normalizedPath === '/' || normalizedPath === '/today' || normalizedPath === '/today/' || normalizedPath === '/app' || normalizedPath === '/app/') return 'today';
  
  const allItems = getLegacyNavigationItems();

  const candidates = allItems.filter((nav) => {
    if (!nav.path || nav.path === '/') return false;
    // For tabs, path will be like /growth?tab=leads. We need the base path
    const pathWithoutQuery = nav.path.split('?')[0];
    const base = pathWithoutQuery.endsWith('/') ? pathWithoutQuery.slice(0, -1) : pathWithoutQuery;
    return normalizedPath === base || normalizedPath.startsWith(`${base}/`);
  });

  const item = candidates.sort((a, b) => b.path.length - a.path.length)[0];
  if (item) {
    if (item.id === 'booking') return 'today';
    return (item.section || item.id) as ViewKey;
  }

  return 'not-found';
}

export function getPathForView(view: ViewKey): string {
  if (view === 'today') return '/today';
  const item = getLegacyNavigationItems().find((nav) => nav.id === view);
  return item?.path || '/';
}

export function useApplicationRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useRouteNormalization();

  const currentView = useMemo(() => getViewFromLocation(location.pathname), [location.pathname]);
  const demoApp = isDemoAppPath(location.pathname);

  const navigateToView = (view: ViewKey, queryParams?: URLSearchParams | Record<string, string>) => {
    const path = withDemoAppPrefix(getPathForView(view), demoApp);
    const qs = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
    navigate(`${path}${qs}`);
  };

  /**
   * Navigate to an arbitrary in-app path such as an Action Center deep link
   * ('/invoices?id=…', '/schedule?mode=requests'). Legacy first segments are
   * translated through the registry (invoices -> /sales?tab=invoices) with the
   * deep link's own query params merged on top, then the demoapp prefix is
   * applied. Previously callers reached for a `navigateToPath` that did not
   * exist and fell back to navigateToView(path), which resolved every link to '/'.
   */
  const navigateToPath = (path: string) => {
    if (!path) return;
    if (/^https?:\/\//i.test(path)) { window.location.assign(path); return; }
    const [rawPath, rawQuery = ''] = path.split('?');
    const clean = stripDemoAppPrefix(rawPath);
    const first = clean.split('/').filter(Boolean)[0];
    const params = new URLSearchParams(rawQuery);
    let base = clean;
    if (first && !WORKSPACES.some((w) => w.id === first)) {
      const legacy = getLegacyNavigationItems().find((nav) => nav.id === first);
      if (legacy?.path) {
        const [legacyBase, legacyQuery = ''] = legacy.path.split('?');
        base = legacyBase;
        const legacyParams = new URLSearchParams(legacyQuery);
        legacyParams.forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
      }
    }
    const qs = params.toString();
    navigate(`${withDemoAppPrefix(base, demoApp)}${qs ? `?${qs}` : ''}`);
  };

  const navigateToScheduleMode = (mode: string) => {
    navigate(`${withDemoAppPrefix('/appointments', demoApp)}?mode=${encodeURIComponent(mode)}`);
  };

  return {
    currentView,
    navigateToView,
    navigateToPath,
    navigateToScheduleMode,
    searchParams
  };
}
