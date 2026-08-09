import { supabase } from '@/lib/supabase';

export interface CommunicationThread {
  id: string;
  business_id: string;
  customer_id: string;
  appointment_id: string | null;
  subject: string | null;
  status: string;
  created_at: string;
}

export interface Communication {
  id: string;
  thread_id: string | null;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'phone' | 'portal' | 'voice_note' | 'system_event';
  sender_id: string | null;
  sender_name: string | null;
  recipient_identifier: string | null;
  body: string | null;
  status: string;
  is_automated: boolean;
  created_at: string;
}

export async function fetchCommunicationThreads(customerId: string) {
  const { data, error } = await supabase
    .from('communication_threads')
    .select('*')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as CommunicationThread[];
}

export async function fetchCommunications(threadId: string) {
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Communication[];
}

export async function sendCommunication(payload: Partial<Communication>) {
  const { data, error } = await supabase.from('communications').insert([payload]).select();
  if (error) throw error;
  return data[0];
}
