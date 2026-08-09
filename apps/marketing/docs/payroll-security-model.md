# Payroll Security Model

This document specifies the authorization, confidentiality, and data protection guidelines governing employee compensation, bank details, tax records, and payroll operations.

## 1. Role-Based Access Control (RBAC) & Scopes

Administrative actions and field views are gated by explicit permission keys.

*   **Financial Scopes**: Only `Owner`, `System Administrator`, and `Payroll Administrator` roles can view compensation tables, bank routing data, or audit lines matching tax withholding files.
*   **Location Isolation**: Store Managers and assistant supervisors can only query personnel assigned to their active location keys. Cross-location timecard approvals or staff modifications are blocked.

## 2. Separation of Duties

The following restrictions are deterministically enforced server-side:

*   **Self-Approval Lockouts**: Employees are barred from approving their own timecards, submitting correction adjustments for their own shifts, or authorizing their own leave requests.
*   **Separation of Prep and Approval**: The manager preparing a pay run draft cannot act as the sole authorizer to release payment.
*   **Compensation Audits**: Any modifications to hourly rates, commission tiers, or draw limits require an accompanying Reason for Change text and write a permanent record to the audit logs.

## 3. Data Masking & Tokenization

*   **SSN & EIN**: Encrypted at-rest and masked inside all frontend views (e.g., `***-**-6789`).
*   **Bank Account Routing**: Account and routing numbers are tokenized via third-party provider APIs. Local databases store only masked suffixes (e.g., `Ending in 4321`) and secure provider tokens.
*   **Session Revocation**: Modification of staff permissions, roles, or location overrides immediately invalidates all active web/mobile sessions for the affected team member.
