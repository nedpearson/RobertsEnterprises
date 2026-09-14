import { SupabaseClient } from '@supabase/supabase-js';
import { getWorkerDb } from './runner';

const MODEL_VERSION = '1.0';
const MIN_SALES_SAMPLE = 30; // Minimum comparable appointments before using conversion data

/**
 * AI Scheduling Agent — runs continuously in the background.
 * Evaluates new requests, monitors for schedule changes, and
 * performs safe auto-assignment when configured.
 */
export async function runAISchedulingAgent(customDb?: SupabaseClient): Promise<void> {
  const db = getWorkerDb(customDb);
  
  try {
    // 1. Load all active businesses
    const { data: businesses, error: bizErr } = await db
      .from('businesses')
      .select('id')
      .eq('status', 'active');
    
    if (bizErr || !businesses?.length) return;
    
    for (const biz of businesses) {
      await processBusinessRequests(db, biz.id);
    }
  } catch (err) {
    console.error('[AI Scheduling Agent] Fatal error:', err);
  }
}

async function processBusinessRequests(db: SupabaseClient, businessId: string): Promise<void> {
  // Load AI mode settings
  const { data: settings } = await db
    .from('settings')
    .select('value')
    .eq('business_id', businessId)
    .eq('key', 'ai_scheduling')
    .maybeSingle();
  
  const aiConfig = settings?.value ?? {
    mode: 'recommend_only',
    confidence_threshold: 80,
    auto_notify_staff: true,
    auto_notify_customer: false,
    auto_assign_enabled: false,
  };
  
  // 2. Find unassigned pending requests
  const { data: requests } = await db
    .from('appointment_requests')
    .select(`
      id, business_id, preferred_location_id, preferred_date_1, 
      preferred_window_1, type, service_id, customer_id,
      employee_id, status, notes, created_at
    `)
    .eq('business_id', businessId)
    .in('status', ['submitted', 'new', 'review', 'needs_review'])
    .is('employee_id', null)
    .order('preferred_date_1', { ascending: true });
  
  if (!requests?.length) return;
  
  // 3. Load context data for scoring
  const { data: employees } = await db
    .from('staff_profiles')
    .select('id, first_name, last_name, role, location_id, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true);
  
  const { data: shifts } = await db
    .from('employee_schedules')
    .select('id, employee_id, start_at, end_at, location_id, status')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .gte('start_at', new Date().toISOString());
  
  const { data: appointments } = await db
    .from('appointments')
    .select('id, employee_id, start_at, end_at, status, location_id')
    .eq('business_id', businessId)
    .neq('status', 'Canceled')
    .gte('start_at', new Date().toISOString());
  
  const { data: timeOff } = await db
    .from('employee_time_off')
    .select('id, employee_id, start_date, end_date, status')
    .eq('business_id', businessId)
    .eq('status', 'approved');
  
  const context = {
    employees: employees ?? [],
    shifts: shifts ?? [],
    appointments: appointments ?? [],
    timeOff: timeOff ?? [],
  };
  
  for (const request of requests) {
    await evaluateRequest(db, request, context, aiConfig, businessId);
  }
}

async function evaluateRequest(
  db: SupabaseClient,
  request: any,
  context: any,
  aiConfig: any,
  businessId: string
): Promise<void> {
  try {
    // Check if we already have a recent recommendation (within 1 hour)
    const { data: existingRec } = await db
      .from('ai_scheduling_decisions')
      .select('id, created_at')
      .eq('request_id', request.id)
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .maybeSingle();
    
    if (existingRec) return; // Skip — recently evaluated
    
    // Score each eligible stylist
    const recommendations = scoreStylists(request, context);
    if (!recommendations.length) return;
    
    const best = recommendations[0];
    const alternatives = recommendations.slice(1, 4);
    
    // Store the AI decision
    const { data: decision } = await db
      .from('ai_scheduling_decisions')
      .insert({
        business_id: businessId,
        request_id: request.id,
        mode: aiConfig.mode,
        recommended_employee_id: best.stylistId,
        recommended_start_at: best.recommendedTime,
        score: best.score,
        confidence: best.confidence,
        reasons_json: best.reasons,
        data_limitations_json: best.dataLimitations ?? [],
        alternatives_json: alternatives.map(a => ({
          stylistId: a.stylistId,
          stylistName: a.stylistName,
          time: a.recommendedTime,
          score: a.score,
          confidence: a.confidence,
          reasons: a.reasons,
        })),
        model_version: MODEL_VERSION,
        was_auto_assigned: false,
      })
      .select('id')
      .single();
    
    // Also store in appointment_assignment_recommendations for frontend display
    await db.from('appointment_assignment_recommendations').insert({
      request_id: request.id,
      employee_id: best.stylistId,
      location_id: request.preferred_location_id,
      proposed_start_at: best.recommendedTime,
      proposed_end_at: best.recommendedTime 
        ? new Date(new Date(best.recommendedTime).getTime() + 90 * 60 * 1000).toISOString()
        : null,
      score: best.score,
      score_breakdown_json: {
        reasons: best.reasons,
        warnings: best.warnings,
        confidence: best.confidence,
        alternatives: alternatives.map(a => ({ stylistId: a.stylistId, score: a.score })),
      },
      model_metadata: { version: MODEL_VERSION, generatedBy: 'aiSchedulingAgent' },
    });
    
    // If Safe Auto-Assign mode and confidence is High with no blocking conflicts
    if (
      aiConfig.mode === 'safe_auto_assign' &&
      aiConfig.auto_assign_enabled &&
      best.confidence === 'High' &&
      best.score >= (aiConfig.confidence_threshold ?? 80) &&
      best.blockingConflicts.length === 0 &&
      best.recommendedTime
    ) {
      await performSafeAutoAssign(db, request, best, decision?.id, businessId, aiConfig);
    }
  } catch (err) {
    console.error(`[AI Agent] Error evaluating request ${request.id}:`, err);
  }
}

async function performSafeAutoAssign(
  db: SupabaseClient,
  request: any,
  recommendation: any,
  decisionId: string | undefined,
  businessId: string,
  aiConfig: any
): Promise<void> {
  try {
    // Use the atomic assign_appointment_request RPC
    const endAt = new Date(new Date(recommendation.recommendedTime).getTime() + 90 * 60 * 1000).toISOString();
    
    const { data: appointmentId, error } = await db.rpc('assign_appointment_request', {
      p_request_id: request.id,
      p_employee_id: recommendation.stylistId,
      p_room_id: '00000000-0000-0000-0000-000000000000',
      p_start_at: recommendation.recommendedTime,
      p_end_at: endAt,
    });
    
    if (error) {
      console.error('[AI Agent] Auto-assign failed:', error.message);
      return;
    }
    
    // Update decision record to reflect auto-assignment
    if (decisionId) {
      await db.from('ai_scheduling_decisions').update({
        assigned_employee_id: recommendation.stylistId,
        appointment_id: appointmentId,
        was_auto_assigned: true,
      }).eq('id', decisionId);
    }
    
    // Queue staff notification
    await db.from('appointment_audit_events').insert({
      business_id: businessId,
      request_id: request.id,
      appointment_id: appointmentId,
      event_type: 'ai_auto_assigned',
      new_values: {
        employee_id: recommendation.stylistId,
        start_at: recommendation.recommendedTime,
        end_at: endAt,
        confidence: recommendation.confidence,
        score: recommendation.score,
        reasons: recommendation.reasons,
      },
    });
    
    console.log(`[AI Agent] Auto-assigned request ${request.id} to stylist ${recommendation.stylistId}`);
  } catch (err) {
    console.error('[AI Agent] performSafeAutoAssign error:', err);
  }
}

/**
 * Score all eligible stylists for a given request.
 * Returns sorted array, highest score first.
 */
function scoreStylists(request: any, context: any): any[] {
  const targetDate = request.preferred_date_1;
  const targetDateOnly = targetDate ? new Date(targetDate).toISOString().split('T')[0] : null;
  const requestTime = request.preferred_window_1;
  const isFlexible = !targetDate || targetDate.toLowerCase().includes('flexible');
  const durationMinutes = 90; // Default bridal appointment duration
  
  const recommendations: any[] = [];
  
  for (const stylist of context.employees) {
    if (!stylist.is_active) continue;
    
    let score = 50; // Base score
    const reasons: string[] = [];
    const warnings: string[] = [];
    const blockingConflicts: string[] = [];
    const dataLimitations: string[] = [];
    
    // Location match
    if (request.preferred_location_id && stylist.location_id === request.preferred_location_id) {
      score += 20;
      reasons.push('Assigned to the requested boutique location.');
    } else if (request.preferred_location_id && stylist.location_id !== request.preferred_location_id) {
      blockingConflicts.push('Stylist is not assigned to the requested location.');
    }
    
    if (isFlexible) {
      reasons.push('Flexible date — stylist available for scheduling.');
      const rec = { stylistId: stylist.id, stylistName: `${stylist.first_name} ${stylist.last_name}`, recommendedTime: null, score, reasons, warnings, blockingConflicts, dataLimitations, confidence: 'Medium' as const };
      recommendations.push(rec);
      continue;
    }
    
    if (!targetDateOnly) continue;
    
    // Check time off
    const onTimeOff = context.timeOff.some((to: any) => {
      const toStart = to.start_date.split('T')[0];
      const toEnd = to.end_date.split('T')[0];
      return stylist.id === to.employee_id && targetDateOnly >= toStart && targetDateOnly <= toEnd;
    });
    
    if (onTimeOff) {
      blockingConflicts.push('Stylist is on approved time off on this date.');
    }
    
    // Check shift
    const shift = context.shifts.find((s: any) => {
      if (s.employee_id !== stylist.id) return false;
      const shiftDate = s.start_at.split('T')[0];
      return shiftDate === targetDateOnly;
    });
    
    if (!shift) {
      blockingConflicts.push('Stylist is not scheduled to work on this date.');
    } else {
      score += 15;
      reasons.push('Scheduled to work on the requested date.');
    }
    
    // Determine proposed time
    let proposedStart: Date | null = null;
    if (requestTime && shift) {
      proposedStart = new Date(`${targetDateOnly}T${requestTime.includes(':') ? requestTime : '10:00:00'}`);
      const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60000);
      const shiftStart = new Date(shift.start_at);
      const shiftEnd = new Date(shift.end_at);
      
      if (proposedStart >= shiftStart && proposedEnd <= shiftEnd) {
        score += 15;
        reasons.push('Available for the requested time slot.');
      } else {
        warnings.push('Requested time falls outside shift hours.');
        proposedStart = shiftStart;
      }
    } else if (shift) {
      proposedStart = new Date(shift.start_at);
      reasons.push('Flexible time matched to shift start.');
      dataLimitations.push('No specific time requested — defaulting to shift start.');
    }
    
    // Check existing appointments (double booking)
    if (proposedStart) {
      const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60000);
      const doubleBooked = context.appointments.some((a: any) => {
        if (a.employee_id !== stylist.id) return false;
        const aStart = new Date(a.start_at);
        const aEnd = new Date(a.end_at);
        return aStart < proposedEnd && aEnd > proposedStart;
      });
      
      if (doubleBooked) {
        blockingConflicts.push('Stylist already has an appointment at this time.');
      }
    }
    
    // Workload balance
    const todayLoad = context.appointments.filter((a: any) => {
      if (a.employee_id !== stylist.id) return false;
      const aDate = a.start_at.split('T')[0];
      return aDate === targetDateOnly;
    }).length;
    
    if (todayLoad === 0) {
      score += 10;
      reasons.push('No other appointments on this date.');
    } else if (todayLoad >= 4) {
      score -= 20;
      warnings.push(`Heavy workload — ${todayLoad} appointments already scheduled.`);
    } else {
      reasons.push(`${todayLoad} appointment${todayLoad === 1 ? '' : 's'} already scheduled (good availability).`);
    }
    
    // Note: Sales/conversion history requires MIN_SALES_SAMPLE (30+) comparable records
    // before being used. Without sufficient data, we rely on availability + qualification.
    dataLimitations.push(`Conversion history requires ${MIN_SALES_SAMPLE}+ comparable appointments to be used in scoring.`);
    
    // Calculate confidence
    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    if (blockingConflicts.length > 0) { score = 0; confidence = 'Low'; }
    else if (warnings.length > 0) { confidence = 'Medium'; score = Math.max(10, score - 10); }
    
    recommendations.push({
      stylistId: stylist.id,
      stylistName: `${stylist.first_name} ${stylist.last_name}`,
      recommendedTime: proposedStart?.toISOString() ?? null,
      score,
      confidence,
      reasons,
      warnings,
      blockingConflicts,
      dataLimitations,
    });
  }
  
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Morning review: surface unassigned, unconfirmed, and conflict summary.
 */
export async function runMorningReview(customDb?: SupabaseClient): Promise<void> {
  const db = getWorkerDb(customDb);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  try {
    const { data: businesses } = await db.from('businesses').select('id').eq('status', 'active');
    if (!businesses?.length) return;
    
    for (const biz of businesses) {
      const { data: unassigned } = await db
        .from('appointment_requests')
        .select('id, preferred_date_1, customer_id')
        .eq('business_id', biz.id)
        .in('status', ['submitted', 'new', 'needs_review'])
        .is('employee_id', null);
      
      const { data: unconfirmed } = await db
        .from('appointments')
        .select('id, start_at, employee_id')
        .eq('business_id', biz.id)
        .neq('status', 'Canceled')
        .lte('start_at', in48h.toISOString())
        .neq('confirmation_status', 'Confirmed');
      
      if ((unassigned?.length ?? 0) > 0 || (unconfirmed?.length ?? 0) > 0) {
        await db.from('appointment_audit_events').insert({
          business_id: biz.id,
          event_type: 'ai_morning_review',
          new_values: {
            unassigned_count: unassigned?.length ?? 0,
            unconfirmed_in_48h: unconfirmed?.length ?? 0,
            reviewed_at: now.toISOString(),
          },
        });
      }
    }
  } catch (err) {
    console.error('[AI Agent] Morning review error:', err);
  }
}
