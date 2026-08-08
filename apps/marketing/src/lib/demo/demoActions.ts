import { supabase } from '@/lib/supabase';
import { DEMO_STORES, DEMO_PERSONAS } from './demoData';
import { ActionStatus, ActionPriority } from '@/lib/services/actionCenterService';

export async function resetDemoActions(businessId: string) {
  // Clear existing demo actions for this business
  await supabase
    .from('action_center_records')
    .delete()
    .eq('business_id', businessId)
    .eq('data_plane', 'demo');

  const now = new Date();
  
  const demoActions = [
    {
      id: crypto.randomUUID(),
      data_plane: 'demo',
      business_id: businessId,
      location_id: DEMO_STORES[0].id, // Downtown
      action_type: 'unassigned_request',
      source_module: 'scheduling',
      source_record_type: 'appointment_request',
      source_record_id: 'req_123',
      title: 'Unassigned Booking Request',
      description: 'Sophia Taylor requested a Bridal Consultation but no stylist is assigned yet.',
      status: 'Open' as ActionStatus,
      priority: 'High' as ActionPriority,
      deep_link: '/schedule?mode=requests&request=req_123',
      due_at: new Date(now.getTime() + 2 * 3600000).toISOString(), // 2 hours from now
      ai_generated: false
    },
    {
      id: crypto.randomUUID(),
      data_plane: 'demo',
      business_id: businessId,
      location_id: DEMO_STORES[0].id,
      action_type: 'employee_callout',
      source_module: 'scheduling',
      source_record_type: 'shift',
      source_record_id: 'shift_456',
      title: 'Employee Called Out',
      description: 'Dana Robichaux called out sick today. 3 appointments need reassignment.',
      status: 'Open' as ActionStatus,
      priority: 'Critical' as ActionPriority,
      deep_link: '/schedule?mode=workforce&employee=persona-stylist',
      due_at: new Date(now.getTime() - 1 * 3600000).toISOString(), // 1 hour ago
      ai_generated: true,
      ai_confidence: 98
    },
    {
      id: crypto.randomUUID(),
      data_plane: 'demo',
      business_id: businessId,
      location_id: DEMO_STORES[1].id, // Northshore
      action_type: 'invoice_overdue',
      source_module: 'finance',
      source_record_type: 'invoice',
      source_record_id: 'inv_789',
      title: 'Invoice Overdue',
      description: 'Final payment for Vera Wang gown is 3 days overdue. Balance: $1,200.00',
      status: 'Open' as ActionStatus,
      priority: 'High' as ActionPriority,
      deep_link: '/invoices?id=inv_789',
      due_at: new Date(now.getTime() - 72 * 3600000).toISOString(),
      financial_impact_cents: 120000,
      ai_generated: false
    },
    {
      id: crypto.randomUUID(),
      data_plane: 'demo',
      business_id: businessId,
      location_id: DEMO_STORES[0].id,
      action_type: 'staffing_conflict',
      source_module: 'scheduling',
      source_record_type: 'capacity',
      source_record_id: 'cap_101',
      title: 'Capacity Risk',
      description: 'Saturday is overbooked by 2 appointments between 1pm and 3pm.',
      status: 'Open' as ActionStatus,
      priority: 'Medium' as ActionPriority,
      deep_link: '/schedule?mode=capacity&date=' + now.toISOString().split('T')[0],
      due_at: new Date(now.getTime() + 48 * 3600000).toISOString(),
      ai_generated: true,
      ai_confidence: 90
    },
    {
      id: crypto.randomUUID(),
      data_plane: 'demo',
      business_id: businessId,
      location_id: DEMO_STORES[2].id, // River District
      action_type: 'vendor_delay',
      source_module: 'purchasing',
      source_record_type: 'purchase_order',
      source_record_id: 'po_222',
      title: 'PO Acknowledgment Overdue',
      description: 'PO #4459 to Maggie Sottero has not been acknowledged within 48 hours.',
      status: 'Open' as ActionStatus,
      priority: 'Medium' as ActionPriority,
      deep_link: '/purchases?id=po_222',
      due_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
      ai_generated: false
    }
  ];

  await supabase.from('action_center_records').insert(demoActions);
}
