import { jsonBody, vowosApi } from '@/lib/api/vowosApi';
import type { PayrollPeriod } from '@/lib/api/payrollApi';

export interface ManualPayrollProviderLine {
  line_id: string;
  tax_cents: number;
  net_pay_cents: number;
}

export const payrollManualApi = {
  applyVerifiedResults: (
    periodId: string,
    input: {
      provider_reference: string;
      evidence_note?: string;
      lines: ManualPayrollProviderLine[];
    },
  ) => vowosApi<{ period: PayrollPeriod }>(`/api/organization/team/payroll/periods/${periodId}/manual-provider-results`, {
    method: 'POST',
    body: jsonBody(input),
  }),
};
