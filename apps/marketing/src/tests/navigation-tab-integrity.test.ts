import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKSPACE_TAB_IDS, WORKSPACES, resolveFeatureRoute, resolveWorkspaceTab } from '@/lib/navigation/navigationRegistry';

/**
 * DRILL-DOWN GUARDRAIL.
 *
 * Workspace tabs are addressed by `?tab=<id>`. Every drill-down entry, legacy
 * redirect and module route is a deep link into one of those tabs. When a link
 * names a tab id the workspace does not have, the workspace silently falls back
 * to its first tab (or renders an empty pane) — the user clicks "Follow-Ups" and
 * lands on "Customers", which is indistinguishable from a dead link.
 *
 * These tests fail the build if any such link drifts again.
 */

const SRC = join(__dirname, '..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf-8');

/** Tab ids each workspace page actually renders, parsed from its source. */
const WORKSPACE_SOURCES: Record<string, string> = {
  appointments: 'pages/workspaces/AppointmentsWorkspace.tsx',
  customers: 'pages/workspaces/CustomersWorkspace.tsx',
  sales: 'pages/workspaces/SalesWorkspace.tsx',
  inventory: 'pages/workspaces/InventoryWorkspace.tsx',
  team: 'pages/workspaces/TeamWorkspace.tsx',
  reports: 'pages/workspaces/ReportsWorkspace.tsx',
  growth: 'pages/workspaces/GrowthWorkspace.tsx',
  settings: 'components/vowos/settings/SettingsNavigation.tsx'
};

function tabIdsInSource(source: string): string[] {
  const fromTabsArray = [...source.matchAll(/\{\s*id:\s*'([^']+)',\s*label:/g)].map((m) => m[1]);
  if (fromTabsArray.length > 0) return fromTabsArray;
  return [...source.matchAll(/<TabsTrigger[^>]*\svalue="([^"]+)"/g)].map((m) => m[1]);
}

/** Every `?tab=` deep link in the codebase, as [file, workspace, tab]. */
function deepLinks(file: string): Array<[string, string, string]> {
  const source = read(file);
  return [...source.matchAll(/\/(\w[\w-]*)\?tab=([\w-]+)/g)].map(
    (m) => [file, m[1], m[2]] as [string, string, string]
  );
}

describe('workspace tab registry', () => {
  it('matches the tabs each workspace page actually renders', () => {
    for (const [workspace, file] of Object.entries(WORKSPACE_SOURCES)) {
      const rendered = tabIdsInSource(read(file)).sort();
      const declared = [...(WORKSPACE_TAB_IDS[workspace] ?? [])].sort();
      expect(declared, `WORKSPACE_TAB_IDS.${workspace} is out of sync with ${file}`).toEqual(rendered);
    }
  });
});

describe('drill-down deep links', () => {
  const FILES = [
    'lib/navigation/navigationRegistry.ts',
    'lib/modules/moduleRegistry.ts',
    'lib/services/billingAdapter.ts',
    'pages/workspaces/AppointmentsWorkspace.tsx',
    'App.tsx'
  ];

  it('only point at tabs that exist', () => {
    const bad: string[] = [];
    for (const file of FILES) {
      for (const [, workspace, tab] of deepLinks(file)) {
        const known = WORKSPACE_TAB_IDS[workspace];
        if (!known || known.length === 0) continue; // workspace has no tab bar (settings)
        if (!known.includes(tab)) bad.push(`${file}: /${workspace}?tab=${tab}`);
      }
    }
    expect(bad, `dead tab targets:\n${bad.join('\n')}`).toEqual([]);
  });

  it('never redirects a path to itself', () => {
    const app = read('App.tsx');
    const selfRedirects = [...app.matchAll(/path="([^"]+)"\s+element=\{<Navigate to="([^"?]+)/g)]
      .filter(([, from, to]) => from === to)
      .map(([, from]) => from);
    expect(selfRedirects, 'these routes redirect to themselves and loop forever').toEqual([]);
  });

  it('gives every workspace child a resolvable target', () => {
    for (const workspace of WORKSPACES) {
      for (const child of workspace.children) {
        const [base, query = ''] = child.path.split('?');
        const tab = new URLSearchParams(query).get('tab');
        if (!tab) continue;
        const id = base.replace(/^\//, '');
        expect(
          WORKSPACE_TAB_IDS[id]?.includes(tab),
          `${workspace.id} -> ${child.id} points at ${child.path}`
        ).toBe(true);
      }
    }
  });
});

describe('legacy tab aliases', () => {
  it('resolve old links instead of dropping the user on the default tab', () => {
    expect(resolveWorkspaceTab('customers', 'followups')).toBe('follow-ups');
    expect(resolveWorkspaceTab('sales', 'quotes')).toBe('contracts');
    expect(resolveWorkspaceTab('inventory', 'catalog')).toBe('catalogs');
    expect(resolveWorkspaceTab('reports', 'executive')).toBe('analytics');
    expect(resolveWorkspaceTab('reports', 'team')).toBe('staff');
    expect(resolveWorkspaceTab('growth', 'campaigns')).toBe('social');
    expect(resolveWorkspaceTab('growth', 'meta')).toBe('social');
    expect(resolveWorkspaceTab('growth', 'email')).toBe('social');
    expect(resolveWorkspaceTab('growth', 'website')).toBe('website');
    expect(resolveWorkspaceTab('growth', 'nonsense')).toBeUndefined();
  });
});

describe('feature registry routes', () => {
  it('resolve to a real in-app path instead of the site root', () => {
    expect(resolveFeatureRoute('/demo/inventory/catalogs')).toBe('/inventory?tab=catalogs');
    expect(resolveFeatureRoute('/demo/sales/contracts')).toBe('/sales?tab=contracts');
    expect(resolveFeatureRoute('/demo/team/schedules')).toBe('/team?tab=scheduling');
    expect(resolveFeatureRoute('/demo/customers')).toBe('/customers');
    expect(resolveFeatureRoute('/demo/growth/automations')).toBe('/growth?tab=social&view=automations');
  });

  it('covers every route in the feature registry', () => {
    const routes = [...read('data/featureRegistry.ts').matchAll(/route: '([^']+)'/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const resolved = resolveFeatureRoute(route);
      expect(resolved, `${route} resolved to the site root`).not.toBe('/');
      const [base, query = ''] = resolved.split('?');
      const workspace = base.replace(/^\//, '');
      const tab = new URLSearchParams(query).get('tab');
      if (tab) {
        expect(WORKSPACE_TAB_IDS[workspace]?.includes(tab), `${route} -> ${resolved}`).toBe(true);
      }
    }
  });
});
