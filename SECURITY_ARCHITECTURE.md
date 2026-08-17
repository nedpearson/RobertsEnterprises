# VowOS Security Architecture

This document defines the canonical security boundaries, role definitions, and access control models for VowOS.

## 1. Canonical Boundaries

VowOS operates with strict tenant isolation. The architecture is divided into three primary scopes:

*   **Platform Scope**: The highest level of access. Contains operational data, billing configurations, and cross-tenant analytics.
*   **Tenant Scope**: Organization-specific data. Isolated horizontally via Row-Level Security (RLS). A tenant user cannot read or write data belonging to another tenant.
*   **Public Scope**: Unauthenticated access, strictly limited to marketing content, public booking pages, and the interactive demo (`demo.vowos.bridgebox.ai`).

## 2. Role Definitions

### 2.1 Platform Roles
These roles are assigned to VowOS staff and administrators.

*   `PLATFORM_OWNER`: Supreme access. Can manage billing, suspend organizations, and manage other platform roles.
*   `PLATFORM_ADMIN`: High-level access for day-to-day operations.
*   `PLATFORM_SUPPORT`: Access to tenant data *only* when explicitly entering **Support Mode** (which mandates an audit trail).

### 2.2 Tenant Roles
These roles are scoped *strictly* to a single `organization_id`.

*   `TENANT_OWNER`: Has full control over their organization's data, billing, and staff.
*   `TENANT_ADMIN`: Can manage staff and settings, but cannot delete the organization.
*   `TENANT_STAFF`: Standard employee access, restricted by specific permissions (e.g., cannot view financial reports if not authorized).

## 3. Data Classification

*   **PUBLIC**: Marketing assets, public landing pages, demo data.
*   **BUSINESS OPERATIONAL**: Inventory levels, appointment schedules (without PII).
*   **PERSONAL DATA**: Bride/Customer names, emails, phone numbers, measurements. Subject to strict RLS and privacy controls.
*   **FINANCIAL**: Invoices, payment intents. (Raw credit card PANs/CVVs are *never* stored on VowOS servers; they are tokenized via Stripe).
*   **PLATFORM CONFIDENTIAL**: VowOS internal revenue, support tickets, internal audit logs.

## 4. Key Security Controls

*   **Authentication**: Managed via Supabase Auth (JWT).
*   **Authorization**: Enforced via Supabase RLS at the database layer. UI hiding is *not* considered a security boundary.
*   **Audit Logging**: Critical actions (role changes, plan overrides, deletions) are logged to an immutable `audit_logs` table.
*   **Secret Management**: All external provider credentials (Shopify, Stripe, Resend) are managed via secure environment variables. `SUPABASE_SERVICE_ROLE_KEY` is exclusively used in trusted backend workers.
