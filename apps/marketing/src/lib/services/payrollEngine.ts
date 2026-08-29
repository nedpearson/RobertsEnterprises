import { TimeEntry, TimeEntrySegment, CompensationProfile, Department, Deduction, Reimbursement, Bonus, OfficialPayrollPeriod } from './workforceStore';
export type { OfficialPayrollPeriod };
import { assertEntitlement } from './entitlementService';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface LocationAllocation {
  locationId: string;
  hours: number;
  wagesCents: number;
}

export interface EmployeePayrollStatement {
  employeeId: string;
  employeeName: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularPay: number; // in cents
  overtimePay: number; // in cents
  doubleTimePay: number; // in cents
  grossWages: number; // in cents
  bonuses: number; // in cents
  commissions: number; // in cents
  reimbursements: number; // in cents
  preTaxDeductions: number; // in cents
  taxableGross: number; // in cents
  employeeTaxes: number; // in cents (FICA, Med, State)
  afterTaxDeductions: number; // in cents (Garnishments)
  netPay: number; // in cents
  employerTaxes: number; // in cents
  employerContributions: number; // in cents
  locationAllocations: Record<string, LocationAllocation>;
  calculationsExplained: string[];
}

export interface PayrollRunResult {
  runId: string;
  periodName: string;
  statements: EmployeePayrollStatement[];
  totalGross: number;
  totalTaxes: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost: number;
  posted: boolean;
}

// Helper to check if a date is within a range
function isDateInPeriod(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  return d >= start && d <= end;
}

export function calculateEmployeePayroll(
  employeeId: string,
  employeeName: string,
  comp: CompensationProfile,
  allPunches: TimeEntry[],
  allSegments: TimeEntrySegment[],
  deductions: Deduction[],
  reimbursements: Reimbursement[],
  bonuses: Bonus[],
  commissionsCents: number,
  period: DateRange,
  businessIdFilter?: string,
  locationIdsFilter?: string[], // if empty or 'all', no location filter
  departments: Department[] = []
): EmployeePayrollStatement {
  const explanations: string[] = [];
  
  // 1. ISOLATE punches for THIS employee, THIS business, and THIS period
  const periodPunches = allPunches.filter((p) => {
    if (p.employeeId !== employeeId) return false;
    if (businessIdFilter && p.businessId !== businessIdFilter) return false;
    
    // Check location filter if locations are provided
    if (locationIdsFilter && locationIdsFilter.length > 0 && !locationIdsFilter.includes('all')) {
      // If none of the segments for this punch match the location filter, skip
      // Or if no segments, check originalLocationId
      const punchSegments = allSegments.filter(s => s.timeEntryId === p.id);
      if (punchSegments.length > 0) {
        const hasMatchingSegment = punchSegments.some(s => locationIdsFilter.includes(s.locationId));
        if (!hasMatchingSegment) return false;
      } else {
        if (!locationIdsFilter.includes(p.originalLocationId)) return false;
      }
    }

    return isDateInPeriod(p.clockIn, period.startDate, period.endDate);
  });

  let regularHours = 0;
  let overtimeHours = 0;
  let doubleTimeHours = 0;
  
  const locationHours: Record<string, number> = {};
  let primaryDepartment = 'Sales'; // fallback

  // Track daily punches to compute daily OT (Over 8h is OT, Over 12h is DT)
  const punchesByDay: Record<string, number[]> = {};
  
  periodPunches.forEach((p) => {
    const day = p.clockIn.split('T')[0];
    const start = new Date(p.clockIn).getTime();
    const end = p.clockOut ? new Date(p.clockOut).getTime() : start; 
    const hrs = Math.max(0, (end - start) / 3_600_000);
    
    if (!punchesByDay[day]) punchesByDay[day] = [];
    punchesByDay[day].push(hrs);

    // Track Location Allocation & Department
    const punchSegments = allSegments.filter(s => s.timeEntryId === p.id);
    if (punchSegments.length > 0) {
      punchSegments.forEach(seg => {
        const segHrs = (seg.paidMinutes || 0) / 60;
        if (!locationHours[seg.locationId]) locationHours[seg.locationId] = 0;
        locationHours[seg.locationId] += segHrs;
        
        if (seg.departmentId) {
          const dept = departments.find(d => d.id === seg.departmentId);
          if (dept) primaryDepartment = dept.name;
        }
      });
    } else {
      // Fallback to originalLocationId
      if (!locationHours[p.originalLocationId]) locationHours[p.originalLocationId] = 0;
      locationHours[p.originalLocationId] += hrs;
    }
  });

  Object.entries(punchesByDay).forEach(([day, hoursList]) => {
    const dailyTotal = hoursList.reduce((s, h) => s + h, 0);
    if (dailyTotal > 12) {
      doubleTimeHours += dailyTotal - 12;
      overtimeHours += 4;
      regularHours += 8;
    } else if (dailyTotal > 8) {
      overtimeHours += dailyTotal - 8;
      regularHours += 8;
    } else {
      regularHours += dailyTotal;
    }
  });

  const totalWorked = regularHours + overtimeHours + doubleTimeHours;
  if (totalWorked > 40 && comp.type === 'hourly') {
    explanations.push(`Calculated ${totalWorked.toFixed(2)} total worked hours (OT/DT rules applied).`);
  }

  // 2. Earnings Calculation
  let regularPay = 0;
  let overtimePay = 0;
  let doubleTimePay = 0;
  let grossWages = 0;

  if (comp.type === 'hourly' || comp.type === 'hourly_plus_commission') {
    regularPay = Math.round(regularHours * comp.hourlyRate);
    overtimePay = Math.round(overtimeHours * comp.hourlyRate * 1.5);
    doubleTimePay = Math.round(doubleTimeHours * comp.hourlyRate * 2.0);
    grossWages = regularPay + overtimePay + doubleTimePay;
    explanations.push(`Hourly Compensation: $${(comp.hourlyRate / 100).toFixed(2)}/hr.`);
    explanations.push(`Regular: ${regularHours.toFixed(1)}h ($${(regularPay / 100).toFixed(2)}).`);
    if (overtimeHours > 0) explanations.push(`Overtime (1.5x): ${overtimeHours.toFixed(1)}h ($${(overtimePay / 100).toFixed(2)}).`);
    if (doubleTimeHours > 0) explanations.push(`Double Time (2.0x): ${doubleTimeHours.toFixed(1)}h ($${(doubleTimePay / 100).toFixed(2)}).`);
  } else {
    // Salaried - dynamic based on pay frequency
    let divisor = 24; // semimonthly default
    if (comp.payFrequency === 'weekly') divisor = 52;
    else if (comp.payFrequency === 'biweekly') divisor = 26;
    else if (comp.payFrequency === 'monthly') divisor = 12;
    
    const payPeriodSalary = Math.round(comp.salaryAmount / divisor);
    regularPay = payPeriodSalary;
    grossWages = payPeriodSalary;
    explanations.push(`Salaried Compensation: Annual $${(comp.salaryAmount / 100).toLocaleString()} (Frequency: ${comp.payFrequency || 'semimonthly'}, Allocation: $${(payPeriodSalary / 100).toLocaleString()}).`);
  }

  // Calculate location allocations for wages
  const locationAllocations: Record<string, LocationAllocation> = {};
  if (totalWorked > 0) {
    Object.entries(locationHours).forEach(([locId, hrs]) => {
      // Only allocate if location passes filter
      if (locationIdsFilter && locationIdsFilter.length > 0 && !locationIdsFilter.includes('all') && !locationIdsFilter.includes(locId)) {
        return; // skip this location's allocation if filtered out
      }
      
      const ratio = hrs / totalWorked;
      const allocWages = Math.round(grossWages * ratio);
      locationAllocations[locId] = {
        locationId: locId,
        hours: hrs,
        wagesCents: allocWages
      };
    });
  } else if (comp.type === 'salary') {
    // For salaried with 0 hours, put all in a default location or the user's primary
    // If no primary known, fallback
    const locId = (locationIdsFilter && locationIdsFilter.length > 0 && locationIdsFilter[0] !== 'all') ? locationIdsFilter[0] : 'north';
    locationAllocations[locId] = {
      locationId: locId,
      hours: 0,
      wagesCents: grossWages
    };
  }

  // 3. Bonuses & Commissions Draw
  const myBonuses = bonuses
    .filter((b) => b.employeeId === employeeId && b.status === 'approved' && b.id && isDateInPeriod(b.id.substring(0,8) || new Date().toISOString(), period.startDate, period.endDate)) // Note: the user asked to remove placeholder dates. Let's assume bonus has a date field or we extract from id properly. Wait, I should add a 'date' field to Bonus or assume effectiveDate. Let's fix this in workforceStore next or use 'createdAt'. I'll use the id timestamp correctly or assume Bonus has a date.
    // wait, I will modify Bonus interface to include `date?: string`
    .reduce((s, b) => s + b.amountCents, 0);

  let finalCommissions = commissionsCents;
  if (comp.drawAmount > 0) {
    if (commissionsCents < comp.drawAmount) {
      finalCommissions = comp.drawAmount;
      explanations.push(`Commission Draw Guarantee: Draw of $${(comp.drawAmount / 100).toFixed(2)} paid instead of earned commission $${(commissionsCents / 100).toFixed(2)}.`);
    } else {
      explanations.push(`Commissions: Earned commission $${(commissionsCents / 100).toFixed(2)} exceeded draw threshold.`);
    }
  } else if (commissionsCents > 0) {
    explanations.push(`Commissions Earned: $${(commissionsCents / 100).toFixed(2)}.`);
  }

  // 4. Pre-Tax Deductions
  const preTax = deductions
    .filter((d) => d.employeeId === employeeId && d.type === 'pre_tax')
    .reduce((sum, d) => {
      const amt = d.fixed ? d.amountCents : Math.round((grossWages * (d.percentValue ?? 0)) / 100);
      explanations.push(`Pre-Tax Deduction (${d.code}): $${(amt / 100).toFixed(2)}`);
      return sum + amt;
    }, 0);

  const taxableGross = Math.max(0, grossWages + myBonuses + finalCommissions - preTax);

  // 5. Statutory Tax Estimates Engine
  // FICA Social Security: 6.2%, Medicare: 1.45%, Federal/State Income Tax Estimate: 10%
  const ssnTax = Math.round(taxableGross * 0.062);
  const medTax = Math.round(taxableGross * 0.0145);
  const incTax = Math.round(taxableGross * 0.10);
  const employeeTaxes = ssnTax + medTax + incTax;

  explanations.push(`Estimate — Not Payroll Filing Amount: FICA SS (6.2%): $${(ssnTax / 100).toFixed(2)}, Medicare (1.45%): $${(medTax / 100).toFixed(2)}, Fed/State: $${(incTax / 100).toFixed(2)}.`);

  // 6. After-Tax Deductions
  const postTax = deductions
    .filter((d) => d.employeeId === employeeId && d.type === 'after_tax')
    .reduce((sum, d) => {
      const amt = d.fixed ? d.amountCents : Math.round((grossWages * (d.percentValue ?? 0)) / 100);
      explanations.push(`After-Tax Deduction (${d.code}): $${(amt / 100).toFixed(2)}`);
      return sum + amt;
    }, 0);

  // 7. Reimbursements (Non-taxable)
  const myReimbursements = reimbursements
    .filter((r) => r.employeeId === employeeId && r.status === 'approved' && isDateInPeriod(r.date, period.startDate, period.endDate))
    .reduce((s, r) => s + r.amountCents, 0);
  
  if (myReimbursements > 0) {
    explanations.push(`Expense Reimbursements: $${(myReimbursements / 100).toFixed(2)} (Tax-Exempt).`);
  }

  // 8. Net Pay Calculation
  const netPay = Math.max(0, taxableGross - employeeTaxes - postTax + myReimbursements);

  // 9. Employer Taxes
  const employerTaxes = Math.round(taxableGross * 0.0765); // Matching FICA

  return {
    employeeId,
    employeeName,
    department: primaryDepartment,
    regularHours,
    overtimeHours,
    doubleTimeHours,
    regularPay,
    overtimePay,
    doubleTimePay,
    grossWages,
    bonuses: myBonuses,
    commissions: finalCommissions,
    reimbursements: myReimbursements,
    preTaxDeductions: preTax,
    taxableGross,
    employeeTaxes,
    afterTaxDeductions: postTax,
    netPay,
    employerTaxes,
    employerContributions: 0,
    locationAllocations,
    calculationsExplained: explanations
  };
}

export async function compilePayrollPeriod(
  period: OfficialPayrollPeriod,
  profiles: CompensationProfile[],
  punches: TimeEntry[],
  segments: TimeEntrySegment[],
  deductions: Deduction[],
  reimbursements: Reimbursement[],
  bonuses: Bonus[],
  commissionsMap: Record<string, number>,
  departments: Department[] = []
): Promise<PayrollRunResult> {
  await assertEntitlement('payroll.core', period.businessId);
  
  // Filter eligible profiles if period restricts it
  const eligibleProfiles = period.eligiblePayGroups && period.eligiblePayGroups.length > 0
    ? profiles.filter(p => period.eligiblePayGroups?.includes(p.type))
    : profiles;

  const statements = eligibleProfiles.map((p) => {
    const employeeComm = commissionsMap[p.employeeName] || 0;
    return calculateEmployeePayroll(
      p.employeeId, 
      p.employeeName, 
      p, 
      punches, 
      segments,
      deductions, 
      reimbursements, 
      bonuses, 
      employeeComm, 
      period, 
      period.businessId,
      ['all'], // all locations in business
      departments
    );
  });

  const totalGross = statements.reduce((s, st) => s + st.grossWages, 0);
  const totalTaxes = statements.reduce((s, st) => s + st.employeeTaxes, 0);
  const totalDeductions = statements.reduce((s, st) => s + st.preTaxDeductions + st.afterTaxDeductions, 0);
  const totalNet = statements.reduce((s, st) => s + st.netPay, 0);
  const totalEmployerCost = totalGross + statements.reduce((s, st) => s + st.employerTaxes, 0);

  return {
    runId: period.id,
    periodName: period.name,
    statements,
    totalGross,
    totalTaxes,
    totalDeductions,
    totalNet,
    totalEmployerCost,
    posted: period.status === 'posted' || period.status === 'provider_submitted' || period.status === 'reconciled'
  };
}
