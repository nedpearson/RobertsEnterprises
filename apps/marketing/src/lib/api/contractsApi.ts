import { jsonBody, vowosApi } from '@/lib/api/vowosApi';
import type { NewContractInput, ContractRecord } from '@/lib/contractsAlterations';
import { mapContract } from '@/lib/contractsAlterations';

interface ContractListResponse {
  contracts: unknown[];
}

interface ContractMutationResponse {
  contract: unknown;
}

export async function fetchContracts(): Promise<ContractRecord[]> {
  const response = await vowosApi<ContractListResponse>('/api/organization/sales/contracts');
  return (response.contracts || []).map(mapContract);
}

export async function createContract(
  input: NewContractInput,
  _existing: ContractRecord[] = [],
): Promise<{ record: ContractRecord | null; error: string | null }> {
  if (!input.customerId) {
    return { record: null, error: 'A real customer record is required before creating a contract.' };
  }

  try {
    const response = await vowosApi<ContractMutationResponse>('/api/organization/sales/contracts', {
      method: 'POST',
      body: jsonBody({
        customer_id: input.customerId,
        location: input.location,
        gown: input.gown,
        amount_cents: input.amountCents,
        deposit_cents: input.depositCents,
        special_terms: input.specialTerms,
      }),
    });
    return { record: mapContract(response.contract), error: null };
  } catch (error) {
    return { record: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function markContractSent(id: string): Promise<void> {
  await vowosApi(`/api/organization/sales/contracts/${encodeURIComponent(id)}/sent`, {
    method: 'PATCH',
    body: '{}',
  });
}
