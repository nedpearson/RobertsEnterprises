# VowOS Data Inventory & Processing Map

## 1. System Overview
VowOS operates as a B2B2C SaaS platform serving bridal boutiques (Tenants) and their customers (Brides).
As a platform provider, VowOS acts as a **Data Processor** for tenant-owned data and a **Data Controller** for platform usage analytics and tenant billing.

## 2. Data Categories & Classifications

### 2.1 PII (Personally Identifiable Information)
- **Tenant Staff:** Names, Emails, Roles, Phone Numbers (for MFA/SMS), Payroll identification.
- **Customers (Brides):** Names, Phone Numbers, Email Addresses, Physical Addresses, Event Dates.

### 2.2 PCI/Financial Data (Handled via Stripe)
- **Tenant Billing:** Credit cards stored directly in Stripe. VowOS retains only stripe_customer_id and tokenized references.
- **Customer Payments:** Payments processed via Stripe Terminal/Connect. VowOS retains transaction IDs, amounts, and metadata but no raw PANs.

### 2.3 Sensitive Personal Data
- **Physical Measurements:** Bust, Waist, Hips, Hollow-to-Hem. (Classified as highly sensitive, requires strict RLS).
- **Event Details:** Partner names, event locations, budget constraints.

## 3. Third-Party Sub-Processors
| Sub-Processor | Purpose | Data Shared | Location |
|---|---|---|---|
| Supabase | Primary Database & Auth | All PII, Encrypted Secrets | AWS (US) |
| Stripe | Payment Processing | Emails, Tokenized Cards | US |
| Twilio/Plivo | SMS Communications | Phone Numbers, Message Content | US |
| Shopify | Ecommerce Sync | Product Data, Customer PII (if synced) | US/Global |
| OpenAI/Anthropic | AI Analytics (Beta) | Anonymized Sales Data | US |

## 4. Retention & Deletion Policies
- **Active Tenants:** Data retained indefinitely while subscription is active.
- **Canceled Tenants:** Soft deletion for 30 days, followed by hard purge of PII (retaining anonymized financial records for tax compliance).
- **Customer Deletion Requests:** Handled via Tenant-facing UI. Platform executes hard purge across all databases.

## 5. Security & Access Control
- All tables enforced via Row Level Security (RLS) bound to uth.jwt() -> app_metadata -> tenant_id.
- Support Mode bypasses RLS but is heavily audited and restricted from accessing raw payment or integration secrets.
- Secrets encrypted at rest using Supabase Vault/pgsodium.
