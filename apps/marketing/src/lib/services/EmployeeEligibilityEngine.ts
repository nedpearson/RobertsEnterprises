export interface EligibilityResult {
  employeeId: string;
  eligible: boolean;
  reasonCode: 'ELIGIBLE' | 'INACTIVE' | 'WRONG_LOCATION' | 'NOT_SCHEDULED' | 'BREAK_CONFLICT' | 'TIME_OFF_CONFLICT' | 'APPOINTMENT_CONFLICT' | 'HOLD_CONFLICT' | 'MISSING_SKILL' | 'ROOM_UNAVAILABLE';
  explanation: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

const doRangesOverlap = (r1: TimeRange, r2: TimeRange) => {
  return r1.start < r2.end && r1.end > r2.start;
};

export class EmployeeEligibilityEngine {
  static checkEligibility(
    employee: any,
    request: any,
    requestTime: TimeRange,
    schedules: any[],
    appointments: any[],
    holds: any[],
    timeOffs: any[],
    service: any,
    rooms: any[]
  ): EligibilityResult {
    // 1. Inactive
    if (employee.status === 'inactive') {
      return { employeeId: employee.id, eligible: false, reasonCode: 'INACTIVE', explanation: 'Employee is inactive.' };
    }

    // 2. Wrong business/location
    const employeeBusinessId = employee.business_id || employee.membership?.business_id || employee.membership_business_id;
    if (employeeBusinessId && employeeBusinessId !== request.business_id) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'WRONG_LOCATION', explanation: 'Employee is not assigned to this business.' };
    }
    
    if (request.preferred_location_id) {
      const locationSchedules = employeeSchedules.filter(s => s.location_id === request.preferred_location_id);
      const worksAtLocation = locationSchedules.length > 0 || (employee.locations && employee.locations.includes(request.preferred_location_id));
      if (employeeSchedules.length > 0 && !worksAtLocation) {
        return { employeeId: employee.id, eligible: false, reasonCode: 'WRONG_LOCATION', explanation: 'Employee is not scheduled at the requested location.' };
      }
    }

    // 3. Not scheduled
    const employeeSchedules = schedules.filter(s => s.employee_id === employee.id);
    const isScheduled = employeeSchedules.some(s => {
      const sStart = new Date(s.start_time || s.start_at);
      const sEnd = new Date(s.end_time || s.end_at);
      return sStart <= requestTime.start && sEnd >= requestTime.end;
    });
    if (employeeSchedules.length > 0 && !isScheduled) { // If they have schedules, they must be scheduled
       return { employeeId: employee.id, eligible: false, reasonCode: 'NOT_SCHEDULED', explanation: 'Employee is not scheduled for the requested time.' };
    }

    // 4. Break conflict
    const hasBreakConflict = employeeSchedules.some(s => {
      if (!s.breaks) return false;
      return s.breaks.some((b: any) => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return doRangesOverlap(requestTime, { start: bStart, end: bEnd });
      });
    });
    if (hasBreakConflict) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'BREAK_CONFLICT', explanation: 'Conflict with scheduled break.' };
    }

    // 5. Time-off conflict
    const hasTimeOff = timeOffs.some(t => {
      if (t.employee_id !== employee.id || t.status !== 'approved') return false;
      const tStart = new Date(t.start_time || t.start_date);
      const tEnd = new Date(t.end_time || t.end_date);
      return doRangesOverlap(requestTime, { start: tStart, end: tEnd });
    });
    if (hasTimeOff) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'TIME_OFF_CONFLICT', explanation: 'Employee has approved time off.' };
    }

    // 6. Appointment conflict
    const hasAppt = appointments.some(a => {
      if (a.employee_id !== employee.id) return false;
      if (a.status === 'cancelled' || a.status === 'no_show') return false;
      const aStart = new Date(a.start_time || a.start_at);
      const aEnd = new Date(a.end_time || a.end_at);
      return doRangesOverlap(requestTime, { start: aStart, end: aEnd });
    });
    if (hasAppt) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'APPOINTMENT_CONFLICT', explanation: 'Employee already has an appointment.' };
    }

    // 7. Tentative-hold conflict
    const hasHold = holds.some(h => {
      if (h.employee_id !== employee.id) return false;
      if (new Date(h.expires_at) < new Date()) return false;
      const hStart = new Date(h.start_time || h.start_at);
      const hEnd = new Date(h.end_time || h.end_at);
      return doRangesOverlap(requestTime, { start: hStart, end: hEnd });
    });
    if (hasHold) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'HOLD_CONFLICT', explanation: 'Employee has a tentative hold.' };
    }

    // 8. Missing service skill/role
    if (service && employee.skills) {
      const hasSkill = Array.isArray(employee.skills) && (employee.skills.includes(service.id) || employee.skills.includes(service.name));
      if (!hasSkill && service.required_role && employee.role !== service.required_role) {
         return { employeeId: employee.id, eligible: false, reasonCode: 'MISSING_SKILL', explanation: 'Employee lacks the required skill or role.' };
      }
    }

    // 9. Room/resource unavailable (handled outside or check if room overlaps)
    // If request requires a room, and all valid rooms are booked, this could be handled here or in room engine.
    // Assuming we pass in available rooms, if empty:
    if (service?.requires_room && rooms.length === 0) {
      return { employeeId: employee.id, eligible: false, reasonCode: 'ROOM_UNAVAILABLE', explanation: 'No rooms available.' };
    }

    return { employeeId: employee.id, eligible: true, reasonCode: 'ELIGIBLE', explanation: 'Employee is eligible.' };
  }
}
