# VowOS Disaster Recovery Plan

This document outlines the recovery procedures for critical infrastructure failures, ensuring VowOS can restore service safely.

## 1. Core Objectives

*   **Recovery Point Objective (RPO)**: The maximum acceptable data loss. Target: 24 hours (based on daily backups), aiming for 5 minutes if Point-in-Time Recovery (PITR) is enabled via Supabase Pro.
*   **Recovery Time Objective (RTO)**: The target time to restore service after an incident. Target: 4 hours.

## 2. Incident Scenarios & Runbooks

### 2.1 Database Corruption or Malicious Deletion
*   **Detection**: Automated monitoring alerts, customer reports, or failed integrity checks.
*   **Containment**:
    1.  Place application in Maintenance Mode via Railway environment variable (`VITE_MAINTENANCE_MODE=true`).
    2.  Revoke access or lock impacted tables to prevent further corruption.
*   **Recovery**:
    1.  Provision an isolated, secure staging Supabase project.
    2.  Restore the latest known-good automated backup to the staging environment.
    3.  Validate data integrity, schema consistency, and RLS policies in staging.
    4.  Extract the missing/corrupted records and patch production, *or* if corruption is total, update Railway environment variables to point to the restored database as the new production instance.
*   **Audit**: Document root cause, affected tenants, and data loss extent.

### 2.2 Bad Database Migration Deployed
*   **Detection**: CI deployment succeeds but application crashes on startup, or specific features fail immediately post-deploy.
*   **Containment**: Halt further traffic.
*   **Recovery**:
    1.  If the migration is forward-compatible (e.g., added a column but broke a view), deploy an immediate hotfix (`git revert` or emergency patch).
    2.  If the migration destroyed data (e.g., dropped a column unintentionally), follow the Database Corruption runbook (2.1) to restore from the pre-deployment backup.
    3.  **Crucially**: Never manually execute raw SQL on production to "fix it fast." Write a compensating migration file and deploy via standard CI to maintain schema synchronization.

### 2.3 Railway Application Outage or Bad Release
*   **Detection**: Railway health checks fail, 502 Bad Gateway errors, or synthetic browser checks fail.
*   **Recovery**:
    1.  Utilize the Railway dashboard to instantly **Rollback** to the previously successful deployment hash.
    2.  Verify the application is healthy.
    3.  Investigate the bad commit locally or in staging.

### 2.4 External Integration Failure (e.g., Shopify, Stripe)
*   **Detection**: Background worker logs show sustained timeouts or 4xx/5xx errors from the provider.
*   **Containment**:
    1.  Circuit breaker triggers automatically to prevent retry storms.
    2.  UI updates to indicate "Sync Degraded" to affected tenants.
*   **Recovery**:
    1.  Wait for provider status to resolve.
    2.  Background jobs in `durable_jobs` remain in `FAILED` or `PENDING_RETRY` state.
    3.  Once the provider is healthy, Platform Ops triggers a replay of failed jobs. Operations must be idempotent to prevent duplicate charges or orders.

### 2.5 Compromised Platform Admin Account
*   **Detection**: Suspicious audit logs (e.g., multiple organization suspensions, mass data exports, unauthorized discounts).
*   **Containment**:
    1.  `PLATFORM_OWNER` immediately revokes the compromised user's session via Supabase dashboard.
    2.  Change the user's role to `DISABLED`.
*   **Recovery**:
    1.  Review the `audit_logs` table for all actions performed by the compromised account.
    2.  Revert unauthorized billing changes or configuration modifications.
    3.  Reset credentials and enforce MFA before re-enabling the account.

## 3. Routine Tabletop Exercises
Quarterly simulations must be conducted to verify these procedures:
*   **Q1**: Simulate a bad migration and practice a fast rollback.
*   **Q2**: Perform a dry-run database restore to a staging environment and verify data integrity.
