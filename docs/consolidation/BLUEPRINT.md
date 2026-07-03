# Consolidation Blueprint

## Target (npm workspaces monorepo)
```
apps/api/    Express + Knex (from backend/)
apps/web/    React/Vite (from frontend/)
packages/shared/   shared TS types (future)
legacy/flask-reference/   Flask app, read-only spec
```

## Phases
- P0 cleanup — untrack node_modules + sqlite, .gitignore ✅
- P1 harden — JWT_SECRET/keys → env, .env.example ✅
- P2 monorepo — apps/* via git mv, workspace root ✅
- P3 deploy — render.yaml (api + static web + pg), CI ✅
- P4–P8 port from Flask — payroll, alterations, transfers, team-chat, AI-voice (NEXT)
- P9 UI pass — design system, unified nav

## Rollback
One commit per phase on `chore/consolidation-2026-07`; revert any phase independently.
