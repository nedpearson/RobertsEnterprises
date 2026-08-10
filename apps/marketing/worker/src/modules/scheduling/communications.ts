import { supabase } from '../../index';

export class CommunicationsEngine {
  static async getThread(appointmentId: string, businessId: string) {
    const { data: thread } = await supabase
      .from('communication_threads')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('business_id', businessId)
      .single();
    
    if (!thread) return null;

    const { data: messages } = await supabase
      .from('communications')
      .select('*, communication_attachments(file_id)')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    return { ...thread, messages };
  }

  static async sendSMS(businessId: string, appointmentId: string, customerId: string, senderId: string, body: string) {
    // 1. Get or create thread
    let { data: thread } = await supabase
      .from('communication_threads')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();
      
    if (!thread) {
      const { data: newThread } = await supabase
        .from('communication_threads')
        .insert([{ business_id: businessId, customer_id: customerId, appointment_id: appointmentId }])
        .select()
        .single();
      thread = newThread;
    }
    if (!thread) {
      throw new Error("Failed to create thread");
    }

    // 2. Insert message
    const { data: message, error } = await supabase
      .from('communications')
      .insert([{
        thread_id: thread.id,
        business_id: businessId,
        customer_id: customerId,
        appointment_id: appointmentId,
        direction: 'outbound',
        channel: 'sms',
        sender_id: senderId,
        body,
        status: 'queued' // Delivery worker picks this up
      }])
      .select()
      .single();

    if (error) throw error;
    return message;
  }

  static async logCall(businessId: string, appointmentId: string, customerId: string, employeeId: string, outcome: string, notes: string) {
    // Basic log call implementation
    const { data, error } = await supabase
      .from('call_logs')
      .insert([{
        business_id: businessId,
        appointment_id: appointmentId,
        customer_id: customerId,
        employee_id: employeeId,
        outcome,
        notes
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
