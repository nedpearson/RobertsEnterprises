import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { NAVIGATION_ITEMS, ViewKey } from './navigationRegistry';

/**
 * Normalizes invalid root-level ?mode= query parameters by redirecting to the canonical /schedule route.
 * Also handles /actions?mode=capacity -> /schedule?mode=capacity
 */
export function useRouteNormalization() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode && !location.pathname.startsWith('/schedule')) {
      // If we have a ?mode= parameter but we are NOT on /schedule, redirect to /schedule?mode=...
      navigate(`/schedule?mode=${mode}`, { replace: true });
    }
  }, [location.pathname, searchParams, navigate]);
}

/**
 * Derives the active ViewKey from the current browser URL.
 */
export function getViewFromLocation(pathname: string): ViewKey | 'not-found' {
  if (pathname === '/') return 'dashboard';
  
  // Find a navigation item whose path matches the start of the current pathname
  const item = NAVIGATION_ITEMS.find((nav) => pathname.startsWith(nav.path));
  if (item) {
    if (item.id === 'booking') return 'dashboard'; // booking is external, fallback to dashboard
    return item.id as ViewKey;
  }
  
  return 'not-found';
}

export function getPathForView(view: ViewKey): string {
  if (view === 'dashboard') return '/today'; // Or '/'
  const item = NAVIGATION_ITEMS.find((nav) => nav.id === view);
  return item?.path || '/';
}

export function useApplicationRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useRouteNormalization();

  const currentView = useMemo(() => getViewFromLocation(location.pathname), [location.pathname]);

  const navigateToView = (view: ViewKey, queryParams?: URLSearchParams | Record<string, string>) => {
    const path = getPathForView(view);
    const qs = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
    navigate(`${path}${qs}`);
  };

  const navigateToScheduleMode = (mode: string) => {
    navigate(`/schedule?mode=${mode}`);
  };

  return {
    currentView,
    navigateToView,
    navigateToScheduleMode,
    searchParams
  };
}
