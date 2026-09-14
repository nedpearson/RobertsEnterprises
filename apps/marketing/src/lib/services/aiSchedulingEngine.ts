import { addMinutes, isAfter, isBefore, isEqual, parseISO } from 'date-fns';

export interface Stylist {
  id: string;
  name: string;
  email: string;
  locations?: string[]; // Array of location UUIDs
  is_active?: boolean;
}

export interface Shift {
  employee_id: string;
  location_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
}

export interface TimeOff {
  employee_id: string;
  start_date: string;
  end_date: string;
  status: 'approved' | 'pending' | 'rejected';
}

export interface ExistingAppointment {
  employee_id: string;
  event_date: string; // ISO string
  duration_minutes: number;
}

export interface ScheduleContext {
  stylists: Stylist[];
  shifts: Shift[];
  timeOff: TimeOff[];
  appointments: ExistingAppointment[];
}

export interface Recommendation {
  stylistId: string;
  stylistName: string;
  recommendedTime: string; // ISO string
  score: number;
  reasons: string[];
  warnings: string[];
  confidence: 'High' | 'Medium' | 'Low';
  blockingConflicts: string[];
}

/**
 * Checks if two time ranges overlap.
 */
function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return (isBefore(startA, endB) || isEqual(startA, endB)) && (isAfter(endA, startB) || isEqual(endA, startB));
}

export function getAIRecommendations(
  requestDate: string,
  requestTime: string | null, // '14:00:00' or null if flexible
  locationId: string,
  durationMinutes: number,
  context: ScheduleContext
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Parse the target date
  const targetDateOnly = requestDate.split('T')[0];
  const flexible = !requestTime;

  for (const stylist of context.stylists) {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const blockingConflicts: string[] = [];
    let score = 100;

    // 1. Is active?
    if (stylist.is_active === false) {
      blockingConflicts.push('Stylist is inactive.');
    }

    // 2. Assigned Location?
    if (stylist.locations && stylist.locations.length > 0 && !stylist.locations.includes(locationId)) {
      blockingConflicts.push('Stylist is not assigned to this location.');
    } else if (stylist.locations && stylist.locations.length > 0) {
      reasons.push('Assigned to requested location.');
    }

    // 3. Time Off?
    const targetDateObj = new Date(targetDateOnly);
    const hasTimeOff = context.timeOff.some(to => {
      if (to.status !== 'approved') return false;
      if (to.employee_id !== stylist.id) return false;
      const start = new Date(to.start_date);
      const end = new Date(to.end_date);
      return (targetDateObj >= start && targetDateObj <= end);
    });

    if (hasTimeOff) {
      blockingConflicts.push('Stylist has approved time off on this date.');
    }

    // 4. Shift check
    const shift = context.shifts.find(s => s.employee_id === stylist.id && s.date === targetDateOnly);
    let shiftStart: Date | null = null;
    let shiftEnd: Date | null = null;

    if (!shift) {
      blockingConflicts.push('Stylist is not scheduled to work on this date.');
    } else {
      reasons.push('Scheduled to work on this date.');
      shiftStart = new Date(`${targetDateOnly}T${shift.start_time}`);
      shiftEnd = new Date(`${targetDateOnly}T${shift.end_time}`);
    }

    // If a specific time was requested, check it
    let proposedTime = requestTime;
    let fallbackTimeFound = false;

    // Determine the exact window to check
    let proposedStart: Date;
    let proposedEnd: Date;

    if (proposedTime) {
      proposedStart = new Date(`${targetDateOnly}T${proposedTime}`);
      proposedEnd = addMinutes(proposedStart, durationMinutes);

      // Check shift bounds
      if (shiftStart && shiftEnd) {
        if (proposedStart < shiftStart || proposedEnd > shiftEnd) {
          blockingConflicts.push('Requested time falls outside the stylist\'s scheduled shift.');
        } else {
          reasons.push('Available for the complete requested time slot.');
        }
      }
    } else {
      // Flexible time: find the first available slot during their shift
      // For simplicity in this demo AI engine, default to 10:00 AM or shift start
      if (shiftStart) {
        proposedStart = shiftStart;
        proposedEnd = addMinutes(proposedStart, durationMinutes);
        proposedTime = shiftStart.toISOString().split('T')[1].substring(0, 8);
        fallbackTimeFound = true;
        reasons.push('Flexible time matched to shift start.');
      } else {
        proposedStart = new Date(`${targetDateOnly}T10:00:00`);
        proposedEnd = addMinutes(proposedStart, durationMinutes);
        proposedTime = '10:00:00';
      }
    }

    // 5. Existing appointments (Double Booking)
    const stylistAppointments = context.appointments.filter(a => a.employee_id === stylist.id);
    let doubleBooked = false;
    let dailyLoad = 0;

    stylistAppointments.forEach(appt => {
      const apptDate = appt.event_date.split('T')[0];
      if (apptDate === targetDateOnly) {
        dailyLoad++;
        const apptStart = new Date(appt.event_date);
        const apptEnd = addMinutes(apptStart, appt.duration_minutes);

        if (rangesOverlap(proposedStart, proposedEnd, apptStart, apptEnd)) {
          doubleBooked = true;
        }
      }
    });

    if (doubleBooked) {
      blockingConflicts.push('Stylist is already booked during this time slot.');
    }

    // Workload scoring
    if (dailyLoad === 0) {
      score += 10;
      reasons.push('Stylist has no other appointments today.');
    } else if (dailyLoad > 3) {
      score -= 20;
      warnings.push('Stylist has a heavy workload today.');
    } else {
      reasons.push(`${dailyLoad} appointments today (good availability).`);
    }

    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    if (blockingConflicts.length > 0) {
      score = 0;
      confidence = 'Low';
    } else if (warnings.length > 0 || fallbackTimeFound) {
      confidence = 'Medium';
    }

    // For flexibility, if it's completely blocked, we might still return it but with score 0, 
    // so the UI can show them at the bottom as "Unavailable"
    recommendations.push({
      stylistId: stylist.id,
      stylistName: stylist.name,
      recommendedTime: proposedStart.toISOString(),
      score,
      reasons,
      warnings,
      confidence,
      blockingConflicts
    });
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}
