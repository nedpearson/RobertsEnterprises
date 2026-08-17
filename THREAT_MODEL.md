# VowOS Threat Model

This document outlines the primary threat model for the VowOS platform, identifying key assets, potential attackers, attack vectors, and required mitigations.

## 1. High-Level Assets

*   **Platform Data**: Cross-tenant revenue, billing configurations, platform lead intake, support audit logs.
*   **Tenant Operational Data**: Appointments, inventory, orders, staff rosters.
*   **Tenant Customer Data (PII)**: Bride/Client names, emails, measurements, communications.
*   **Tenant Financial Data**: Transaction histories, discount approvals (tokenized via Stripe).
*   **Tenant Integrations**: Connected Shopify tokens, Google Ads tokens.

## 2. Identified Threats & Mitigations

### 2.1 Insecure Direct Object Reference (IDOR) & Tenant Cross-Access
*   **Attacker**: Tenant A User (or malicious actor compromising Tenant A).
*   **Attack**: Modifying API requests to fetch or modify data belonging to Tenant B (e.g., `GET /customers?organization_id=TENANT_B`).
*   **Impact**: Critical PII leak, operational sabotage.
*   **Mitigation**: **Strict Row-Level Security (RLS)** on all tables. Queries must automatically restrict via `auth.uid()` mapped to an `organization_id`. Backend endpoints must re-verify tenant context against the JWT token.

### 2.2 Platform Role Escalation
*   **Attacker**: Tenant Admin or malicious external user.
*   **Attack**: Attempting to self-assign the `PLATFORM_OWNER` or `PLATFORM_ADMIN` role via API patching or exploiting loose RLS on the `staff_profiles` / user metadata table.
*   **Impact**: Complete platform compromise.
*   **Mitigation**: Platform roles can only be granted by existing `PLATFORM_OWNER`s. RLS policies explicitly reject updates to `role` fields unless the invoking user has elevated platform claims.

### 2.3 Webhook Replay / Spoofing
*   **Attacker**: External malicious actor.
*   **Attack**: Sending fake webhook payloads to VowOS (e.g., "Subscription Paid") or capturing and replaying a valid webhook.
*   **Impact**: Free service, invalid billing states, inventory corruption.
*   **Mitigation**: Mandatory webhook signature verification (e.g., `Stripe-Signature`). Idempotency keys enforced on processing to prevent replay handling.

### 2.4 Browser-Manipulated Billing / Discounts
*   **Attacker**: Tenant Owner.
*   **Attack**: Modifying the browser DOM or intercepting the checkout API request to alter a plan price from $349 to $1, or applying a 100% discount.
*   **Impact**: Revenue loss.
*   **Mitigation**: Pricing logic and discount validation must execute exclusively on the backend (Stripe/Worker). The frontend only requests a plan ID; the server calculates the final price and generates the checkout session.

### 2.5 Private File Exposure
*   **Attacker**: Unauthenticated user or unauthorized tenant.
*   **Attack**: Guessing the URL of a sensitive document (e.g., signed contract, customer measurements photo).
*   **Impact**: PII leak.
*   **Mitigation**: Sensitive buckets (`tenant-documents`) are private. Access requires short-lived signed URLs generated specifically for authorized users.

### 2.6 Malicious File Uploads (XSS / Execution)
*   **Attacker**: Tenant user or public portal user.
*   **Attack**: Uploading an `.html` file with embedded JavaScript or an executable script masked as an image.
*   **Impact**: Stored XSS against staff, potential worker execution.
*   **Mitigation**: Strict MIME type and extension validation. Files served with `Content-Type` headers that force download or prevent execution (e.g., `Content-Security-Policy: default-src 'none'`).

### 2.7 Service Role Key Leakage
*   **Attacker**: External actor.
*   **Attack**: Discovering the `SUPABASE_SERVICE_ROLE_KEY` in frontend bundles, public repositories, or client-side variables.
*   **Impact**: Complete database compromise (bypasses all RLS).
*   **Mitigation**: Automated secret scanning. Service role keys are restricted strictly to secure backend environments (Workers, Edge Functions) and never exposed to Vite.

## 3. Support Mode Protocol

When Platform Support must assist a tenant, they must not use a "god mode" account indiscriminately.
1. Support initiates a request to enter the tenant context.
2. An audit log is generated: `[Timestamp] PLATFORM_ADMIN (nedpearson) entered SUPPORT MODE for TENANT (uuid). Reason: Ticket #123.`
3. UI presents a persistent banner indicating Support Mode is active.
4. All actions performed during this session are tagged in audit logs as performed by the Platform Admin acting on behalf of the tenant.
