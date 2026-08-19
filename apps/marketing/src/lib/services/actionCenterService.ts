import { supabase } from '@/lib/supabase';
type Database = any;
import { toast } from '@vowos/design-system';

export type ActionStatus = 'Open' | 'In Progress' | 'Waiting' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Snoozed' | 'Completed' | 'Dismissed' | 'Superseded' | 'Failed';
export type ActionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ActionCenterRecord {
  id: string;
  data_plane: string;
  business_id: string;
  location_id: string | null;
  action_type: string;
  source_module: string;
  source_record_type: string;
  source_record_id: string;
  title: string;
  description: string | null;
  status: ActionStatus;
  priority: ActionPriority;
  severity: string | null;
  assigned_user_id: string | null;
  assigned_role: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  financial_impact_cents: number | null;
  operational_impact: string | null;
  customer_impact: string | null;
  ai_generated: boolean;
  ai_confidence: number | null;
  requires_approval: boolean;
  approval_type: string | null;
  deep_link: string;
  metadata_json: Record<string, any>;
  version: number;
}

export async function fetchActions(businessId: string, locationId?: string | 'all', filters?: any): Promise<ActionCenterRecord[]> {
  try {
    let query = supabase
      .from('action_center_records')
      .select('*')
      .eq('business_id', businessId)
      .neq('status', 'Completed')
      .neq('status', 'Dismissed')
      .neq('status', 'Superseded')
      .neq('status', 'Failed')
      .order('priority', { ascending: true }) // Assuming string sorting or custom sorting later
      .order('due_at', { ascending: true, nullsFirst: false });

    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    if (filters?.assignedToMe && filters.userId) {
      query = query.eq('assigned_user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Manual sorting to ensure priority order: Critical -> High -> Medium -> Low
    const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    return (data || []).sort((a, b) => {
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
      if (pA !== pB) return pA - pB;
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      return 0;
    }) as ActionCenterRecord[];
  } catch (error) {
    console.error('Error fetching actions:', error);
    toast({
      title: 'Attention Engine Error',
      description: 'Failed to load action items. The operational summary could not be retrieved.',
      variant: 'destructive'
    });
    throw error;
  }
}

export async function updateActionStatus(actionId: string, status: ActionStatus, metadata?: any) {
  try {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'Completed') updateData.completed_at = new Date().toISOString();
    if (status === 'Dismissed') updateData.dismissed_at = new Date().toISOString();
    if (metadata) {
      updateData.metadata_json = metadata;
    }

    const { error } = await supabase
      .from('action_center_records')
      .update(updateData)
      .eq('id', actionId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating action:', error);
    toast({
      title: 'Failed to update action',
      variant: 'destructive'
    });
    return false;
  }
}

export async function assignAction(actionId: string, userId: string | null) {
  try {
    const { error } = await supabase
      .from('action_center_records')
      .update({ assigned_user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', actionId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error assigning action:', error);
    toast({
      title: 'Failed to assign action',
      variant: 'destructive'
    });
    return false;
  }
}

