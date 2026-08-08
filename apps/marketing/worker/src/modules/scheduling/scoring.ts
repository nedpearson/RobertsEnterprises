import { SupabaseClient } from '@supabase/supabase-js';

export interface ScoringRequest {
  businessId: string;
  requestId: string;
  availableShifts: any[];
}

export async function scoreAssignments(db: SupabaseClient, req: ScoringRequest) {
  // 1. In a real AI system, we'd evaluate soft constraints here.
  // We rank the eligible shifts based on:
  // - Customer preferred date/time
  // - Customer preferred employee
  // - Fair workload distribution
  
  const recommendations = req.availableShifts.map((shift, index) => {
    // Generate a mock score
    const score = 100 - (index * 10);
    
    return {
      request_id: req.requestId,
      employee_id: shift.employee_id,
      location_id: shift.location_id,
      proposed_start_at: shift.start_at,
      proposed_end_at: shift.end_at,
      score,
      score_breakdown_json: {
        base_match: 50,
        availability_bonus: 30,
        skill_bonus: 20
      },
      disqualification_reasons_json: []
    };
  });
  
  // Sort by score
  recommendations.sort((a, b) => b.score - a.score);
  
  // Insert recommendations into the DB
  if (recommendations.length > 0) {
    await db.from('appointment_assignment_recommendations').insert(recommendations);
  }
  
  return recommendations;
}
