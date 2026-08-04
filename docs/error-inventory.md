# Error Inventory — Phase 1

This document inventory lists all errors, warnings, and potential fail points discovered in the application.

## Known Compilation & Lint Errors

### 1. ESLint Failures (125 Issues)
- **Error**: `Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`
- **Location**: Multiple components in `apps/web/src` (`App.tsx`, `CalendarModule.tsx`, `SettingsModule.tsx`, etc.).
- **Impact**: Strict lint rules prevent build pipelines or pre-commit hooks from succeeding in clean environments.

### 2. Vite CSS Warning
- **Warning**: `@import rules must precede all rules aside from @charset and @layer statements`
- **Location**: `apps/web/src/index.css`
- **Impact**: Non-standard CSS ordering warning. Needs rearranging.

## Runtime & Integration Risks

### 1. Vitest Fetch Connection Refused
- **Warning**: `TypeError: fetch failed (cause: ECONNREFUSED)`
- **Location**: `apps/web/src/test/App.test.tsx`
- **Impact**: Frontend unit tests try to fetch from a live local API during execution. Needs proper mock handlers (like MSW or Jest fetch mocks).

### 2. Missing Relational Constraints
- **Risk**: Deleting a customer or user with dependent invoices or bookings could result in foreign key failures or orphan records.
