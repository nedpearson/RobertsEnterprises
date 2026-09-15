import { createClient } from '@supabase/supabase-js';

// Background job to send reminders for missing staff availability

export async function processAvailabilityReminders(db: any) {
  // 1. Fetch all reminder rules
  const { data: rules, error: rulesError } = await db.from('availability_reminder_rules').select('*');
  if (rulesError || !rules?.length) return;

  // 2. Fetch all staff memberships to know who needs availability
  const { data: memberships } = await db.from('business_memberships')
    .select('user_id, business_id, role')
    .in('role', ['Stylist', 'Consultant', 'Employee', 'Alterations']);
    
  if (!memberships?.length) return;

  // 3. Check their submissions
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  for (const rule of rules) {
    const orgMembers = memberships.filter((m: any) => m.business_id === rule.organization_id);
    for (const member of orgMembers) {
      // Check if they submitted for next week
      const { data: submission } = await db.from('staff_availability_submissions')
        .select('id')
        .eq('organization_id', rule.organization_id)
        .eq('staff_user_id', member.user_id)
        .gte('period_end', nextWeekStr)
        .limit(1);

      if (!submission || submission.length === 0) {
        // Queue a reminder event if not already sent recently
        const { data: existingReminder } = await db.from('availability_reminder_events')
          .select('id')
          .eq('rule_id', rule.id)
          .eq('staff_user_id', member.user_id)
          .eq('period_start', nextWeekStr)
          .limit(1);

        if (!existingReminder || existingReminder.length === 0) {
          await db.from('availability_reminder_events').insert({
            rule_id: rule.id,
            staff_user_id: member.user_id,
            period_start: nextWeekStr,
            channel: rule.enabled_channels?.[0] || 'in_app',
            status: 'queued'
          });
        }
      }
    }
  }
}
