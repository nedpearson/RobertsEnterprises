import { supabase } from '../shared';

export async function evaluateAutomationRules(brand: string, triggerEvent: string, eventData: any) {
  console.log(`Evaluating rules for ${brand} on event ${triggerEvent}`);

  const { data: rules, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('brand', brand)
    .eq('trigger_type', triggerEvent)
    .eq('is_active', true);

  if (error || !rules) return;

  for (const rule of rules) {
    if (checkConditions(rule.conditions, eventData)) {
      await executeRule(rule, eventData);
    }
  }
}

function checkConditions(conditions: any, eventData: any): boolean {
  // Simple condition evaluator
  // In production, this would use JSONPath or a robust rules engine library
  return true; 
}

async function executeRule(rule: any, eventData: any) {
  console.log(`Executing rule [${rule.name}] at Level ${rule.execution_level}`);
  
  if (rule.execution_level === 1) {
    // LEVEL 1: Recommend Only
    // Generate an audit log / recommendation alert in VowOS
    await logAction(rule, 'recommendation_generated', eventData);
  } 
  else if (rule.execution_level === 2) {
    // LEVEL 2: Approval Required
    // Queue a draft job that requires human approval in VowOS
    await supabase.from('durable_jobs').insert({
      queue_name: 'pending_approval',
      payload: { rule_id: rule.id, action: rule.action_type, data: eventData },
      status: 'pending' // UI changes this to 'approved' when ready
    });
    await logAction(rule, 'approval_requested', eventData);
  }
  else if (rule.execution_level === 3) {
    // LEVEL 3: Autonomous
    // Enqueue the action immediately
    await supabase.from('durable_jobs').insert({
      queue_name: rule.action_type,
      payload: eventData,
    });
    await logAction(rule, 'autonomous_execution', eventData);
    
    await supabase
      .from('automation_rules')
      .update({
        execution_count: rule.execution_count + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', rule.id);
  }
}

async function logAction(rule: any, action: string, data: any) {
  await supabase.from('audit_logs').insert({
    entity_type: 'automation_rule',
    entity_id: rule.id,
    brand: rule.brand,
    action,
    after_value: data,
    reason: `Rule: ${rule.name}`
  });
}
