import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WORKSPACE_TAB_IDS, resolveWorkspaceTab } from './navigationRegistry';

/**
 * Single source of truth for `?tab=` handling inside a workspace.
 *
 * - resolves legacy/aliased tab ids (`?tab=quotes` -> `contracts`) instead of
 *   silently dropping the user on the workspace default;
 * - rewrites the URL (replace) when the requested tab is not a real tab, so the
 *   address bar and the rendered tab never disagree;
 * - preserves every other query param when the user switches tabs (`mode`,
 *   `view`, record ids), which `setSearchParams({ tab })` used to wipe.
 */
export function useWorkspaceTab(workspaceId: string, defaultTab: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const canonical = WORKSPACE_TAB_IDS[workspaceId] ?? [];
  const resolved = resolveWorkspaceTab(workspaceId, raw) ?? defaultTab;

  useEffect(() => {
    if (!raw || canonical.length === 0 || canonical.includes(raw)) return;
    if (raw === resolved) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', resolved);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, resolved]);

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  return { requestedTab: resolved, setTab, searchParams, setSearchParams };
}
