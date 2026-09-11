import { SupabaseClient } from '@supabase/supabase-js';
import { getWorkerDb } from './runner';

export async function processAutomationRules(customDb?: SupabaseClient): Promise<void> {
  const db = getWorkerDb(customDb);
  
  try {
    // 1. Fetch active reminder rules
    const { data: rules, error: rulesError } = await db
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'appointment_reminder');

    if (rulesError) {
      console.error('[Automation Executor] Error fetching rules:', rulesError.message);
      return;
    }

    if (!rules || rules.length === 0) return;

    const now = new Date();
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    // 2. Fetch upcoming appointments
    const { data: appointments, error: apptsError } = await db
      .from('appointments')
      .select('id, business_id, customer_id, start_time')
      .gte('start_time', now.toISOString())
      .lte('start_time', future.toISOString());

    if (apptsError) {
      console.error('[Automation Executor] Error fetching appointments:', apptsError.message);
      return;
    }
    
    if (!appointments || appointments.length === 0) return;

    for (const rule of rules) {
      for (const appt of appointments) {
        // Optional: match rule brand to appointment business_id
        if (rule.brand && rule.brand !== appt.business_id) continue;

        // 3. Check if we already executed this rule for this appointment
        const { data: existingLogs, error: logErr } = await db
          .from('audit_logs')
          .select('id, after_value')
          .eq('entity_type', 'automation_rule')
          .eq('entity_id', rule.id)
          .eq('action', 'appointment_reminder_executed');

        if (logErr) {
          console.error(`[Automation Executor] Error checking audit logs for rule ${rule.id}:`, logErr.message);
          continue;
        }

        const alreadySent = existingLogs?.some((log: any) => log.after_value?.appointment_id === appt.id);
        
        if (alreadySent) continue;

        // 4. Fetch customer info to send the message
        const { data: customer, error: customerErr } = await db
          .from('customers')
          .select('phone, email, name')
          .eq('id', appt.customer_id)
          .single();
          
        if (customerErr || !customer) {
          console.warn(`[Automation Executor] Customer not found for appointment ${appt.id}`);
          continue;
        }

        const channel = rule.action_type === 'send_email' ? 'email' : 'sms';
        const to = channel === 'sms' ? customer.phone : customer.email;

        if (!to) {
          console.warn(`[Automation Executor] No ${channel} contact info for customer ${appt.customer_id}`);
          continue;
        }

        // 5. Send message using the messaging utility function
        const { error: invokeError } = await db.functions.invoke('send-message', {
          body: {
            channel,
            to,
            subject: rule.name || 'Appointment Reminder',
            body: `Hi ${customer.name || 'there'}, this is a reminder for your upcoming appointment at ${appt.start_time}.`
          }
        });

        if (invokeError) {
          console.error(`[Automation Executor] Failed to send message for rule ${rule.id}:`, invokeError.message || invokeError);
          continue;
        }

        // 6. Log to audit_logs to prevent double-sending
        await db.from('audit_logs').insert({
          entity_type: 'automation_rule',
          entity_id: rule.id,
          brand: rule.brand || appt.business_id,
          action: 'appointment_reminder_executed',
          after_value: { appointment_id: appt.id, customer_id: appt.customer_id },
          reason: `Executed rule ${rule.id} for appointment ${appt.id}`
        });
        
        console.log(`[Automation Executor] Executed automation rule ${rule.id} for appointment ${appt.id}`);
      }
    }
  } catch (err: any) {
    console.error('[Automation Executor] Unexpected error during execution:', err.message || err);
  }
}

let automationInterval: NodeJS.Timeout | null = null;
let isAutomationRunning = false;

export function startAutomationExecutor(intervalMs = 60000): void {
  console.log(`[Automation Executor] Starting background automation worker (interval: ${intervalMs}ms)`);
  
  // Run immediately
  void processAutomationRules();
  
  // Schedule repeated execution
  automationInterval = setInterval(async () => {
    if (isAutomationRunning) return;
    isAutomationRunning = true;
    try {
      await processAutomationRules();
    } finally {
      isAutomationRunning = false;
    }
  }, intervalMs);
}

export function stopAutomationExecutor(): void {
  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
  }
  isAutomationRunning = false;
  console.log('[Automation Executor] Stopped background automation worker.');
}
