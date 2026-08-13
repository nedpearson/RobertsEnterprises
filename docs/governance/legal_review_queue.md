# VowOS Legal & Compliance Review Queue

## Pending Business Decisions

### 1. SMS Compliance (10DLC / TCPA)
- **Status:** PENDING
- **Action Required:** Finalize exact opt-in language for SMS communications. Ensure booking forms and bridal registration portals include explicit checkboxes: "I agree to receive SMS communications regarding my appointment and orders. Msg & Data rates may apply."
- **Assignee:** Legal / Product Manager

### 2. GDPR / CCPA Self-Service Data Export
- **Status:** IMPLEMENTED (Phase 14)
- **Action Required:** Validate the output of the data export JSON format with legal counsel to ensure it meets structural requirements for portability.

### 3. Payment Processing Terms
- **Status:** PENDING
- **Action Required:** Verify that tenant processing agreements correctly outline the liability boundary between VowOS (the software) and the Boutique (the merchant of record) regarding chargebacks and fraud.

### 4. Machine Learning & AI Consent
- **Status:** PENDING
- **Action Required:** Since VowOS includes AI Analytics modules (beta), we must update the global Privacy Policy to declare that anonymized aggregate data may be used to train platform-wide models, with an explicit opt-out provided in the tenant settings.

### 5. Account Deletion Workflow
- **Status:** IMPLEMENTED (Phase 14)
- **Action Required:** Verify the soft-delete grace period (30 days) complies with local requirements and ensure that database purges actually trigger cascading deletes to all PII tables.
