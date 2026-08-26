## What was broken

"The tabs in the drill downs do not work throughout." It was not one tab — the
navigation registry, the feature catalog and the module registry had drifted
into three parallel key namespaces.

| # | Defect | Effect |
| --- | --- | --- |
| 1 | Drill-down paths named tab ids that do not exist (`?tab=followups`, `quotes`, `catalog`, `executive`, `campaigns`, `meta`, `email`) | six workspaces silently land on their default tab; **Growth renders an empty pane** |
| 2 | Command palette gated nav items on `featureSlug` (a *feature* key) via a resolver that only knows *module* keys | ~31 of ~40 drill-downs were filtered out of the palette |
| 3 | Feature search results passed a *path* to `getPathForView` | every feature result navigated to `/` |
| 4 | `<Route path="/team" element={<Navigate to="/team?tab=employees">}` | self-redirect loop; `TeamWorkspace` never mounted |
| 5 | `resolveFeatureAvailability('inventory.catalog' \| 'sales.invoicing')` | gown and invoice search results never appeared |
| 6 | Inventory > Catalogs / Cycle Counts mounted with **no props** | `products.map` threw, blank tab (latent until #1 was fixed) |
| 7 | `/settings?tab=appointments` is not a SettingsTab | blank settings body |
| 8 | `setSearchParams({ tab })` | wiped `mode`, `view`, record ids on every tab switch |

## What changed

- `navigationRegistry` — every child path repointed at a real tab; Growth and
  Reports children now mirror the tabs that exist; `moduleKey` added to every
  workspace and child; new `WORKSPACE_TAB_IDS`, `TAB_ALIASES`,
  `resolveWorkspaceTab()`, `resolveFeatureRoute()`.
- `useWorkspaceTab` (new) — resolves legacy ids, rewrites the URL when a tab does
  not exist, preserves other query params. Adopted by all 7 workspaces.
- `GrowthWorkspace` + `MarketingPage` — `?view=` deep links into the marketing
  sub-app (`?tab=social&view=campaigns`).
- `InventoryWorkspace` — `CatalogTab` / `CountsTab` load their own data the way
  `OnlineStorePage` does.
- `CommandPaletteModal`, `App.tsx`, `SettingsShell` — see the commit message.

## Guard

`src/tests/navigation-tab-integrity.test.ts` fails the build if a tab id drifts,
a deep link names a tab that does not exist, or a route redirects to itself.

## Verification

| Gate | Result |
| --- | --- |
| `npx vitest run` | 28 files / **181 tests passed** |
| `npm run typecheck` | 158 errors (ratchet 193), **0 fatal**, 2 fewer than baseline |
| `npx eslint .` | **0 errors** |
| `npm run build` | green |
| `npm run test:guard` | **17/17** |
| Runtime sweep of all 38 drill-down deep links | **35 pass** |

The 3 remaining sweep failures are not bugs: `team -> payroll`, `team ->
commissions` (module `team.payroll`) and `reports -> accounting` (module
`reports.accounting`) are `defaultEnabled: false`, so the tab is hidden until the
module is switched on in Settings > Modules, and the palette correctly hides
those entries.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
