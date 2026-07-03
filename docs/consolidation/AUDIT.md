# Consolidation Audit — 2026-07

Two source apps, different stacks:

| | Flask `Roberts-Enterprise` | VowOS `RobertsEnterprises` (this repo) |
|---|---|---|
| Backend | Flask, 15 blueprints | Express, 30 endpoints |
| Frontend | Jinja SSR, 25 templates (rich) | React 19 + TS + Vite (skeleton) |
| Schema | init_db CREATE-IF-NOT-EXISTS (fragile) | Knex versioned migrations (6) |
| Extra | payroll, alterations, transfers, AI voice, team chat | Stripe checkout+webhooks, leads/CRM, analytics |

**Decision:** VowOS is the foundation (modern stack, versioned schema, revenue plumbing).
Flask kept read-only under `legacy/flask-reference/` as the spec for ported modules.

**Junk removed:** 6543 committed `node_modules` files (incl. platform-specific native
binaries — Windows sqlite3 binary failed on Linux), committed dev sqlite. 6584 → 41 tracked files.
