# Agent instructions — VowOS (RobertsEnterprises)

Read this before changing anything. It exists because several expensive
regressions in this repo were caused by changes that looked correct in isolation.
Every rule below is here because breaking it already cost a production outage,
a security hole, or silently wrong customer-facing numbers.

If you are an agent (Antigravity, Claude Code, Cursor, Copilot): follow these
rules, and when you finish a task, run the verification block at the bottom.

---

## 1. Repo and deploy facts

- **Canonical repo:** `nedpearson/RobertsEnterprises`. `RobertsEnterprises-FamousAI`
  is retired — never push there, never port code from it.
- **The live app is `apps/marketing`** (package name `vite_react_shadcn_ts`).
  `apps/web` (`frontend`) is a DIFFERENT app and is not what customers use.
- **Runtime:** `node start-selector.js` → API worker on :8082 + `apps/marketing/server.js`
  on :8080, with `/api/*` proxied to the worker. Railway deploys from `main` on push.
- **There is no branch protection.** A push to `main` deploys. Be careful.

---

## 2. Hard rules — do not break these

### 2.1 Never redirect to a host without a DNS record
Only `vowos.bridgebox.ai` and `robertsenterprises.bridgebox.ai` resolve.
**Everything under `*.vowos.bridgebox.ai` is NXDOMAIN.** In August 2026
`server.js` redirected the tenant domain and every demo CTA to those dead hosts
and took the site down while Railway reported "Deployment successful".

`/demoapp` is served **in place**. `/app` is a **same-origin** redirect. Tenant
domains are served in place. If you ever want per-tenant subdomains, create the
wildcard DNS and Railway custom domains FIRST.

### 2.2 The famous.ai landing page at `/` is locked
`apps/marketing/public/marketing.html` + `public/marketing-assets/` is a prebuilt
famous.ai export. It has been deleted or unwired **three times**. `server.js`
serves it at `/` on the marketing host; every other path is a React route.

The inline script in that file is not decoration: the famous.ai bundle hardcodes
`https://robertsenterprises.bridgebox.ai` as its live-app origin (it reads
`import.meta.env[key]` with a *dynamic* key, which Vite cannot replace, so the
fallback always wins). Its "Sign in" / "Live app" controls are `<button>`s that
navigate via JS, so anchor rewriting does not reach them. Do not delete that
interceptor without re-exporting the bundle.

See `DESIGN_LOCK.md` for the locked `data-tour-id` landmarks.

### 2.3 Growth API security model
Every `/api/growth` route runs against the **service-role** Supabase client,
which **bypasses RLS**. Therefore:

- `business_id` is **derived from the caller's verified JWT membership**
  (`requireGrowthAccess`), never read from the request body or query.
- A request naming a different tenant is **rejected**, not silently re-scoped.
- `growth_provider_secrets` has RLS enabled and **deliberately zero policies** —
  OAuth refresh tokens are reachable only by the service role.
  **Never add a policy to that table.**
- The only intentionally public routes are `POST /api/growth/track` and
  `/track/identify` (anonymous visitor attribution). They are append-only,
  validate the business exists, whitelist and length-cap every field, rate-limit
  per IP, and return 204 with no body so they cannot be used as a read oracle.
  Keep them that way.

### 2.4 One code path for demo and live
The shared `supabase` client is Proxy-swapped to an in-memory demo database in
the `/demoapp` sandbox. That is why growth features query `supabase.from(...)`
directly and **there is no `if (isDemo)` branching in components**. Do not add
any. If you add a growth table, add matching demo seed rows in
`src/lib/demo/growthDemoSeed.ts` (deterministic — no `Math.random`).

### 2.5 Channel names must match across capture and sync
`deriveChannel()` in `worker/src/modules/growth/tracking.ts` must produce the
same channel strings the ad syncs write into `growth_channel_spend`
(e.g. `"Meta"`, `"Google Search"`). If they drift, spend lands on one row and
conversions on a lookalike, and **every ROAS figure becomes quietly wrong while
still looking plausible**. Tests pin this.

### 2.6 Attribution is last-touch, on purpose
It is the only model honest with the data VowOS owns. If you add a weighted or
multi-touch model, add a selector **inside `rollUpChannels()`**, not at call
sites, so Growth Overview and Attribution can never disagree.

### 2.7 Sync logic lives in `syncJobs.ts`
The manual "Sync now" button and the background scheduler must run
byte-identical code. Do not re-inline sync logic into a route handler.

---

## 3. Traps that have already bitten

| Trap | What happens |
| --- | --- |
| **Escaped patches** | Generated patches have twice shipped with escaped backticks and dollar-braces, and a fix-up pass then over-corrected **regex literals** — a doubled backslash before `s` inside `/.../` means backslash-then-s, not whitespace. That silently made `canonical_url` always null and `schema_types` always empty, so every page was penalised for problems it did not have. **After any bulk escape edit, run the worker tests.** |
| **Route prefix matching** | `getViewFromLocation` must take the **longest** match on a **path-segment boundary**. A naive `startsWith` made every nested Growth route render its parent, so six tabs looked broken while being unreachable. A registry-wide round-trip test guards this. |
| **`git commit -am`** | Sweeps up `package-lock.json` churn from `npm install`. Stage explicit paths. |
| **Meta tokens** | Meta has **no refresh token**. The callback must immediately exchange the short-lived token for the ~60-day one, or sync works once and dies an hour later. |
| **Meta / GBP access** | Google Business Profile needs a manually approved access request (quota reads 0 QPM until then). Meta permissions work under **Standard Access** only for assets owned by users with a role on the app. A 403 here is usually approval, not a bug. |
| **Require cycles** | The growth module owns its own Supabase client (`client.ts`). Importing `productionSupabase` from `src/index.ts` creates a cycle that only breaks on non-default entry points, with a baffling `Router.use() requires a middleware function` error. |
| **Committed test artifacts** | `test-results/` and `playwright-report/` were tracked; every test run dirtied the tree. |

---

## 4. Verification — run before you claim done

```bash
# from repo root
npm install --include=dev
npm run build                     # web + worker

cd apps/marketing
npm run typecheck                 # must be 0 errors
npm run lint                      # 0 errors (warnings are pre-existing)
npm run test:unit                 # vitest
cd worker && npm test             # node --test, includes growth suites

# design guard — boots the REAL runtime and drives /demoapp
cd ../../..
npx playwright install chromium
npm run test:guard                # all tests must pass
```

The design guard is the one gate that opens the app and looks at it. If you
change a locked landmark, update `DESIGN_LOCK.md` and the spec **in the same
change** — do not weaken an assertion to make a failure go away. When a test
fails, first ask whether the test is describing correct behaviour; fix the code
if it is, and fix the test only if the behaviour it asserts is genuinely wrong.

---

## 5. Environment variables

Required (worker): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`.

Growth/Google: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REDIRECT_URI` (**must end in `/api/growth/callback`** — it is
validated by `/api/growth/setup/status`), `PAGESPEED_API_KEY`.

Growth/Meta (optional): `META_APP_ID`, `META_APP_SECRET`,
`META_OAUTH_REDIRECT_URI` (must end in `/api/growth/callback-meta`),
`META_GRAPH_VERSION` (default `v25.0` — Meta retires versions on a ~2-year clock).

Scheduler (optional): `GROWTH_SYNC_ENABLED=true`,
`GROWTH_SYNC_INTERVAL_MINUTES` (default 360).

Self-checks: `GET /api/growth/setup/status` (env + redirect URI validation),
`GET /api/growth/setup/schema` (did the migrations land),
`GET /api/growth/health` (are connections fresh — needs auth).

---

## 6. Database conventions

Migrations live in `apps/marketing/supabase/migrations/`, named
`YYYYMMDDHHMMSS_name.sql`, and must be **idempotent** (they get re-run).

Every tenant table has `business_id uuid` and RLS via
`public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])`.

The legacy `marketing_*` tables (from `20260727053027`) are scoped by a VARCHAR
`brand` column with no `business_id` and no RLS. **They are deprecated — do not
build on them.** The `growth_*` tables are the multi-tenant replacement.

---

## 7. Product principle

Every competitor sees marketing data. **Only VowOS also owns the operational
data** — appointments, stylists, gowns by designer, alterations, invoices. The
features worth building are the ones that exploit that join and end in an action,
not a chart. Prefer "here is the one thing to do, here is the button that does
it" over another dashboard panel.
