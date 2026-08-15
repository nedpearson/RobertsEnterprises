import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { NAVIGATION_ITEMS, ViewKey } from './navigationRegistry';

export const DEMO_APP_PREFIX = '/demoapp';

export function isDemoAppPath(pathname: string): boolean {
  return pathname === DEMO_APP_PREFIX || pathname === `${DEMO_APP_PREFIX}/` || pathname.startsWith(`${DEMO_APP_PREFIX}/`);
}

export function stripDemoAppPrefix(pathname: string): string {
  if (!isDemoAppPath(pathname)) return pathname;
  const stripped = pathname.slice(DEMO_APP_PREFIX.length);
  return stripped === '' || stripped === '/' ? '/' : stripped;
}

export function withDemoAppPrefix(path: string, demoApp: boolean): string {
  if (!demoApp) return path;
  if (path === '/') return DEMO_APP_PREFIX;
  return `${DEMO_APP_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Normalizes invalid root-level ?mode= query parameters by redirecting to the canonical schedule route.
 * Demo-app navigation remains inside /demoapp so refresh/back never drops the isolated demo data plane.
 */
export function useRouteNormalization() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const mode = searchParams.get('mode');
    const normalizedPath = stripDemoAppPrefix(location.pathname);
    if (mode && !normalizedPath.startsWith('/schedule')) {
      const schedulePath = withDemoAppPrefix('/schedule', isDemoAppPath(location.pathname));
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
  const normalizedPath = stripDemoAppPrefix(pathname);
  if (normalizedPath === '/' || normalizedPath === '/dashboard' || normalizedPath === '/dashboard/') return 'dashboard';
  
  const item = NAVIGATION_ITEMS.find((nav) => normalizedPath.startsWith(nav.path));
  if (item) {
    if (item.id === 'booking') return 'dashboard';
    return item.id as ViewKey;
  }
  
  return 'not-found';
}

export function getPathForView(view: ViewKey): string {
  if (view === 'dashboard') return '/today';
  const item = NAVIGATION_ITEMS.find((nav) => nav.id === view);
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

  const navigateToScheduleMode = (mode: string) => {
    navigate(`${withDemoAppPrefix('/schedule', demoApp)}?mode=${encodeURIComponent(mode)}`);
  };

  return {
    currentView,
    navigateToView,
    navigateToScheduleMode,
    searchParams
  };
}
