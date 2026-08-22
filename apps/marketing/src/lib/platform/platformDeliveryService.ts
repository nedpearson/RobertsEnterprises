import { supabase } from '@/lib/supabase';

export interface DeliveryIncident {
  id: string;
  failure_fingerprint: string;
  repository: string;
  branch: string;
  commit_sha: string;
  commit_author: string | null;
  workflow: string;
  failed_job: string | null;
  failed_step: string | null;
  error_summary: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  repair_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface RepairAttempt {
  id: string;
  incident_id: string;
  attempt_number: number;
  branch_name: string;
  antigravity_version: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  files_changed: string[] | null;
  validation_results: string | null;
}

export interface PlatformDeployment {
  id: string;
  railway_deployment_id: string;
  service: string;
  environment: string;
  commit_sha: string;
  status: string;
  deployment_started: string | null;
  deployment_completed: string | null;
  can_rollback: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationAudit {
  id: string;
  action: string;
  actor: string;
  target: string | null;
  result: string | null;
  reason: string | null;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function getDeliveryIncidents(limit = 100): Promise<DeliveryIncident[]> {
  const { data, error } = await supabase.from('platform_delivery_incidents').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to load delivery incidents: ${error.message}`);
  return (data || []) as DeliveryIncident[];
}

export async function getRepairAttempts(limit = 100): Promise<RepairAttempt[]> {
  const { data, error } = await supabase.from('platform_repair_attempts').select('*').order('started_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to load repair attempts: ${error.message}`);
  return (data || []) as RepairAttempt[];
}

export async function getPlatformDeployments(limit = 100): Promise<PlatformDeployment[]> {
  const { data, error } = await supabase.from('platform_deployments').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to load deployment history: ${error.message}`);
  return (data || []) as PlatformDeployment[];
}

export async function getAutomationAudit(limit = 100): Promise<AutomationAudit[]> {
  const { data, error } = await supabase.from('platform_automation_audit').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to load automation history: ${error.message}`);
  return (data || []) as AutomationAudit[];
}

export async function getDeliverySnapshot() {
  const [incidents, repairs, deployments, audit] = await Promise.all([
    getDeliveryIncidents(50),
    getRepairAttempts(50),
    getPlatformDeployments(50),
    getAutomationAudit(50),
  ]);
  const current = deployments.find((deployment) => deployment.environment.toLowerCase() === 'production') || deployments[0] || null;
  const lastHealthy = deployments.find((deployment) => deployment.status === 'HEALTHY') || null;
  const openIncidents = incidents.filter((incident) => !['RECOVERED', 'ROLLED_BACK'].includes(incident.status));
  const activeRepairs = repairs.filter((repair) => ['PENDING', 'RUNNING', 'VALIDATING'].includes(repair.status));
  return { incidents, repairs, deployments, audit, current, lastHealthy, openIncidents, activeRepairs };
}
