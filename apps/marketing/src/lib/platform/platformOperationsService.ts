import { supabase } from '@/lib/supabase';

export interface PlatformCommandCenterMetrics {
  total_organizations: number;
  new_organizations_7d: number;
  new_organizations_30d: number;
  active_trials: number;
  mrr_cents: number;
  active_users_30d: number;
  at_risk: number;
  open_tickets: number;
  failed_jobs: number;
  open_incidents: number;
  integration_failures: number;
  generated_at: string;
}

export interface CreatePlatformLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone?: string;
  leadType: 'DEMO' | 'PLAN_REQUEST';
  source: string;
  estimatedMrrCents: number;
  notes?: string;
}

export interface PlatformLeadRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  phone: string | null;
  lead_type: string;
  status: string;
  source: string;
  estimated_mrr_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCommandCenterMetrics(): Promise<PlatformCommandCenterMetrics> {
  const { data, error } = await supabase.rpc('platform_get_command_center_metrics');
  if (error) throw new Error(`Failed to load command center metrics: ${error.message}`);
  if (!data) throw new Error('Command center metrics returned no data.');
  return data as PlatformCommandCenterMetrics;
}

export async function createPlatformLead(input: CreatePlatformLeadInput): Promise<PlatformLeadRecord> {
  const { data, error } = await supabase.rpc('platform_create_lead', {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_company_name: input.companyName,
    p_phone: input.phone || null,
    p_lead_type: input.leadType,
    p_source: input.source || 'PLATFORM_ADMIN',
    p_estimated_mrr_cents: Math.max(0, Math.round(input.estimatedMrrCents || 0)),
    p_notes: input.notes || null,
  });
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  if (!data) throw new Error('Lead creation returned no persisted record.');
  return data as PlatformLeadRecord;
}

export async function createPlatformIncident(input: {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedScope?: string;
}) {
  const { data, error } = await supabase.rpc('platform_create_incident', {
    p_title: input.title,
    p_severity: input.severity,
    p_affected_scope: input.affectedScope || null,
  });
  if (error) throw new Error(`Failed to create incident: ${error.message}`);
  if (!data) throw new Error('Incident creation returned no persisted record.');
  return data;
}

export async function updatePlatformIncidentStatus(
  incidentId: string,
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED',
) {
  const { data, error } = await supabase.rpc('platform_update_incident_status', {
    p_incident_id: incidentId,
    p_status: status,
  });
  if (error) throw new Error(`Failed to update incident: ${error.message}`);
  if (!data) throw new Error('Incident update returned no persisted record.');
  return data;
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: 'OPEN' | 'NEW' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED',
) {
  const { data, error } = await supabase.rpc('platform_update_support_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });
  if (error) throw new Error(`Failed to update support ticket: ${error.message}`);
  if (!data) throw new Error('Support ticket update returned no persisted record.');
  return data;
}
