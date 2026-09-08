import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../index';

export async function processScheduledReminders(db: SupabaseClient): Promise<void> {
  const { data: reminders, error } = await db
    .from('reminders')
    .select('id, business_id, location_id, customer_id, channel, subject, body')
    .eq('status', 'scheduled')
    .lte('trigger_at', new Date().toISOString());

  if (error) {
    console.error('[reminders] fetch failed:', error.message);
    return;
  }

  if (!reminders || reminders.length === 0) return;

  for (const reminder of reminders) {
    try {
      const { data: customer, error: customerError } = await db
        .from('customers')
        .select('phone, email')
        .eq('id', reminder.customer_id)
        .single();
        
      if (customerError || !customer) {
        throw new Error('Customer not found');
      }

      const to = reminder.channel === 'sms' ? customer.phone : customer.email;
      if (!to) {
        throw new Error(`Customer has no ${reminder.channel}`);
      }

      const { error: invokeError } = await db.functions.invoke('send-message', {
        body: { 
          channel: reminder.channel, 
          to, 
          subject: reminder.subject, 
          body: reminder.body 
        }
      });

      if (invokeError) throw invokeError;

      await db.from('reminder_events').insert({
        reminder_id: reminder.id,
        status: 'sent',
      });

      await db.from('reminders').update({ status: 'sent' }).eq('id', reminder.id);
    } catch (err: any) {
      console.error(`[reminders] Failed to send reminder ${reminder.id}:`, err.message);
      
      await db.from('reminder_events').insert({
        reminder_id: reminder.id,
        status: 'failed',
        error_message: err.message
      });

      await db.from('reminders').update({ status: 'failed' }).eq('id', reminder.id);
    }
  }
}

export function startReminderScheduler(): void {
  // Run on startup and every 5 minutes
  setTimeout(() => void processScheduledReminders(supabase), 5000);
  const interval = setInterval(() => void processScheduledReminders(supabase), 300_000);
  interval.unref?.();
}
