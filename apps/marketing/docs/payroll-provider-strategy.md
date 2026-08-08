# Payroll Provider Strategy

This document describes the adapter architecture used to link the VowOS payroll ledger with third-party payroll processors (e.g. Gusto, ADP, Paychex).

```
   ┌─────────────────────────────────────────────────────────┐
   │                       VowOS Core                        │
   │  (Wages, Hours, Commissions, Bonuses, Reimbursements)   │
   └────────────────────────────┬────────────────────────────┘
                                │
                                ▼
         ┌─────────────────────────────────────────────┐
         │          IPayrollProviderAdapter            │
         └──────┬───────────────────────────────┬──────┘
                │                               │
                ▼                               ▼
       ┌─────────────────┐             ┌─────────────────┐
       │  Gusto Adapter  │             │   ADP Adapter   │
       │  (JSON API)     │             │  (CSV Export)   │
       └─────────────────┘             └─────────────────┘
```

## 1. Provider Adapter Interface

All integrations implement a common server-side interface:

```typescript
interface IPayrollProviderAdapter {
  verifyConnection(): Promise<boolean>;
  validateEmployeeProfiles(employeeIds: string[]): Promise<ValidationResult>;
  calculateTaxes(previewPayload: PayrollRunPayload): Promise<TaxCalculationResult>;
  submitPayrollRun(runData: PostPayrollPayload): Promise<SubmissionResult>;
}
```

## 2. Integration Modes

*   **API Mode (e.g. Gusto, Rippling)**:
    *   Synchronous wage previewing and automated tax calculations using REST API webhooks.
    *   One-click submission directly from the Payroll Command Center.
*   **File-Export Mode (e.g. ADP Run, Paychex)**:
    *   Generates schema-conforming CSV or Excel journals matching the specific provider’s layout.
    *   Audit registers are preserved locally before exporting.

## 3. Security & Fallbacks

*   **Offline Mode Indicator**: If no provider is connected, the UI displays: `Tax calculations pending provider sync`. Users can review gross wages, but statutory deductions are locked.
*   **Profile Audit Check**: Before submitting, VowOS verifies that all active personnel have a valid address, tax jurisdiction, and bank routing record. Profile validation failures will block processing.
