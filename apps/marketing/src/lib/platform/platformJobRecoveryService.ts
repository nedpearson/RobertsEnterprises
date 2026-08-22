import { supabase } from '@/lib/supabase';
import { forceReconcile, triggerAutoRepair } from '@/lib/platform/platformDataSource';

const PROVIDER_BY_JOB_FRAGMENT: Array<[string, string]> = [
  ['SHOPIFY', 'SHOPIFY'],
  ['STRIPE', 'STRIPE'],
  ['META', 'META'],
  ['FACEBOOK', 'META'],
  ['INSTAGRAM', 'META'],
  ['GOOGLE', 'GOOGLE'],
  ['TIKTOK', 'TIKTOK'],
];

export interface RecoverFailedJobInput {
  jobId: string;
  businessId: string | null;
  jobType: string;
}

export interface RecoverFailedJobResult {
  success: boolean;
  message: string;
  provider?: string;
  connectionId?: string;
}

async function setJobStatus(
  jobId: string,
  status: 'FAILED' | 'RETRYING' | 'MANUAL_REVIEW' | 'PROCESSING' | 'RECOVERED' | 'CANCELLED',
  resolution?: string,
  incrementAttempt = false,
) {
  const { data, error } = await supabase.rpc('platform_set_failed_job_status', {
    p_job_id: jobId,
    p_status: status,
    p_resolution: resolution || null,
    p_increment_attempt: incrementAttempt,
  });
  if (error) throw new Error(`Failed to persist job status: ${error.message}`);
  return data;
}

function providerForJob(jobType: string): string | null {
  const normalized = jobType.toUpperCase();
  return PROVIDER_BY_JOB_FRAGMENT.find(([fragment]) => normalized.includes(fragment))?.[1] || null;
}

export function isIntegrationRecoverableJob(jobType: string): boolean {
  return providerForJob(jobType) !== null;
}

export async function recoverFailedJob(input: RecoverFailedJobInput): Promise<RecoverFailedJobResult> {
  const provider = providerForJob(input.jobType);
  if (!provider || !input.businessId) {
    await setJobStatus(
      input.jobId,
      'MANUAL_REVIEW',
      'No executable recovery adapter is registered for this job type/business. VowOS did not simulate a retry.',
    );
    return { success: false, message: 'No executable recovery adapter is registered. Job moved to Manual Review.' };
  }

  await setJobStatus(input.jobId, 'RETRYING', `Recovery routed through ${provider} integration engine.`, true);

  try {
    const providerCandidates = provider === 'META' ? ['META', 'FACEBOOK', 'INSTAGRAM'] : [provider];
    const { data: connections, error } = await supabase
      .from('provider_connections')
      .select('id,provider,health_status,provider_account_id')
      .eq('business_id', input.businessId)
      .in('provider', providerCandidates);
    if (error) throw error;

    const connectionRows = connections || [];
    if (connectionRows.length === 0) {
      await setJobStatus(
        input.jobId,
        'MANUAL_REVIEW',
        `${provider} job has no provider connection mapped to this organization. Reconnect or map the provider first.`,
      );
      return { success: false, provider, message: `No ${provider} provider connection is mapped to this organization.` };
    }

    // Prefer a connection already reporting degraded/action-required state; otherwise
    // use the first deterministic provider mapping. A platform job without a specific
    // connection id cannot safely broadcast a repair across every account.
    const connection = connectionRows.find((row: any) => ['FAILED', 'DEGRADED', 'ACTION_REQUIRED', 'RECOVERING'].includes(String(row.health_status).toUpperCase())) || connectionRows[0];

    const repair = await triggerAutoRepair(connection.id);
    if (!repair.success) {
      await setJobStatus(input.jobId, 'FAILED', `Automatic ${provider} repair failed: ${repair.message}`);
      return { success: false, provider, connectionId: connection.id, message: repair.message };
    }

    const reconciliation = await forceReconcile(connection.id);
    if (!reconciliation.success) {
      await setJobStatus(
        input.jobId,
        'MANUAL_REVIEW',
        `${provider} connection repair completed, but missed-data reconciliation failed: ${reconciliation.message}`,
      );
      return {
        success: false,
        provider,
        connectionId: connection.id,
        message: `Connection repaired but reconciliation requires review: ${reconciliation.message}`,
      };
    }

    const resolution = `${provider} recovery and reconciliation completed successfully. ${reconciliation.message}`;
    await setJobStatus(input.jobId, 'RECOVERED', resolution);
    return { success: true, provider, connectionId: connection.id, message: resolution };
  } catch (error: any) {
    const message = error?.message || 'Failed-job recovery failed unexpectedly.';
    await setJobStatus(input.jobId, 'FAILED', message).catch(() => undefined);
    return { success: false, provider, message };
  }
}
