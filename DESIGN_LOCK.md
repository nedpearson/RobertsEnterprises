# DESIGN LOCK — VowOS

The VowOS dashboard that is live on Railway is **final**. Five different dashboard
designs shipped in a single week because changes went straight to `main` with
nothing asserting that the UI still rendered. This file plus
`apps/marketing/e2e/guard/design-guard.spec.ts` is the contract that stops that.

## Which repo, which app

- **Canonical repo: `nedpearson/RobertsEnterprises`** (this one). Deployed on Railway,
  project *Roberts Enterprise* → service *web*.
- `nedpearson/RobertsEnterprises-FamousAI` is **retired** — commit
  `6fc5a90 chore: VowOS master migration and consolidation, FamousAI exit`
  moved everything back here. Do not push there, do not port designs from there.
- **The live VowOS app is `apps/marketing`** (package name `vite_react_shadcn_ts`).
  `apps/web` (`frontend`) is a different app and is not the live dashboard.
- Runtime is `node start-selector.js`: API worker on :8082 + `apps/marketing/server.js`
  on :8080, with `/api/*` proxied to the worker.

If you ever doubt which repo is canonical: read the ACTIVE deployment's commit title
in the Railway console, then `git log --oneline` each candidate repo and see which one
contains it. This has flipped twice.

## Locked landmarks

Every `data-tour-id` below must render at `/demoapp/`. The guard asserts each one.
Renaming or removing any of them is a breaking change: update this table and the spec
in the **same PR**, or don't do it.

| `data-tour-id`          | What it is                           |
| ----------------------- | ------------------------------------ |
| `hero-banner`           | Hero image + greeting + CTA          |
| `stat-revenue`          | KPI: Revenue Collected (drilldown)   |
| `stat-outstanding`      | KPI: Outstanding Balance (drilldown) |
| `stat-brides`           | KPI: Active Brides (drilldown)       |
| `stat-gowns`            | KPI: Gowns In Stock (drilldown)      |
| `chart-revenue`         | Revenue-by-month chart               |
| `grid-delivery-watch`   | Delivery / PO watchlist grid         |
| `list-upcoming-appts`   | Upcoming appointments list           |
| `header-location-select`| Location switcher                    |
| `header-search-brides`  | Global search / command palette       |
| `header-notifications`  | Live alerts bell                     |

Source: `apps/marketing/src/components/vowos/DashboardView.tsx` and `AppLayout.tsx`.

Sidebar items carry `data-tour-id="nav-<viewKey>"`
(`apps/marketing/src/lib/navigation/navigationRegistry.ts`). The guard requires at
least **15** of them, click-walks every visible one, and fails if any view throws or
renders an empty `<main>`.

## How this fits the CI you already have

| Gate | Question it answers | When |
| --- | --- | --- |
| `ci.yml` (CI Fast Gate) | lint / typecheck / vitest / npm audit | PR |
| `certify.yml` | does it lint, typecheck, unit-test and build? | push + PR to `main` |
| **design guard** (in `certify.yml`) | **does the dashboard still render?** | **push + PR to `main`** |
| `post-deploy-smoke.yml` | did the public routes 200 and redirect right? | after deploy |

The guard is the only gate that opens the app and looks at it. It runs against the
**real production runtime**, not a dev server, using the `/demoapp/` anonymous
synthetic-data sandbox — no credentials, no live Supabase.

## Rules

1. **No direct pushes to `main`.** Every change goes through a PR.
2. **Make the checks required.** Railway deploys from `main` on push regardless of CI
   status, so branch protection is what turns these workflows from a dashboard into a
   gate. Repo Settings → Rules → require PR into `main` + require the `full-certify`
   and `fast-gate` checks.
3. **Design changes and this file move together**, in the same PR.
4. **Ship same-day.** Long-lived design branches are how five designs happened.

## Running the guard locally

```bash
npm install --include=dev
npm run build                      # web + worker
npx playwright install chromium
npm run test:guard                 # boots start-selector.js on :8080 automatically
```

Env overrides:

- `GUARD_BASE_URL` — point at an already-running server (e.g. the live Railway URL)
  instead of booting the local runtime.
- `GUARD_PORT` — change the local port (default `8080`).
- `GUARD_CHROMIUM_PATH` — use a preinstalled Chromium instead of downloading one.

## Note on `apps/marketing/server.js`

The `/demoapp` → `demo.vowos.bridgebox.ai` canonicalisation redirect used to fire for
**every** host, which made the demo app unreachable on `localhost` — so neither local
dev nor CI could ever open it. It is now skipped for local hosts only
(`localhost`, `127.0.0.1`, `*.localhost`). Behaviour on every public host is
unchanged, and `post-deploy-smoke.yml` still asserts the production redirect.
