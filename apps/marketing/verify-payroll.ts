import { compilePayrollPeriod } from './src/lib/services/payrollEngine.ts';
import { 
  OfficialPayrollPeriod, 
  CompensationProfile, 
  TimeEntry, 
  TimeEntrySegment, 
  Deduction, 
  Reimbursement, 
  Bonus, 
  Department 
} from './src/lib/services/workforceStore.ts';

const testProfiles: CompensationProfile[] = [
  { employeeId: 'e1', employeeName: 'Alice', type: 'hourly', hourlyRate: 1500, payFrequency: 'biweekly', salaryAmount: 0, commissionRate: 0, drawAmount: 0, effectiveDate: '2020-01-01', reason: 'Hire' },
  { employeeId: 'e2', employeeName: 'Bob', type: 'salary', hourlyRate: 0, payFrequency: 'biweekly', salaryAmount: 12000000, commissionRate: 0, drawAmount: 0, effectiveDate: '2020-01-01', reason: 'Hire' }
];

const testPunches: TimeEntry[] = [
  { id: 'p1', employeeId: 'e1', employeeName: 'Alice', businessId: 'b1', originalLocationId: 'l1', clockIn: '2026-07-01T09:00:00Z', clockOut: '2026-07-01T17:00:00Z', deviceId: 'd1', approved: true, status: 'completed' },
  // Overtime scenario
  { id: 'p2', employeeId: 'e1', employeeName: 'Alice', businessId: 'b1', originalLocationId: 'l2', clockIn: '2026-07-02T08:00:00Z', clockOut: '2026-07-02T20:00:00Z', deviceId: 'd1', approved: true, status: 'completed' }
];

const testSegments: TimeEntrySegment[] = [
  // Bob is salaried, let's say no segments.
];

const testDeductions: Deduction[] = [];
const testReimbursements: Reimbursement[] = [];
const testBonuses: Bonus[] = [];
const testDepartments: Department[] = [];

const testPeriod: OfficialPayrollPeriod = {
  id: 'test-run',
  businessId: 'b1',
  name: 'Test Period',
  startDate: '2026-07-01',
  endDate: '2026-07-15',
  payDate: '2026-07-16',
  payFrequency: 'biweekly',
  status: 'draft'
};

try {
  const result = compilePayrollPeriod(
    testPeriod,
    testProfiles,
    testPunches,
    testSegments,
    testDeductions,
    testReimbursements,
    testBonuses,
    {},
    testDepartments
  );

  console.log("Total Gross:", result.totalGross);
  console.log("Total Net:", result.totalNet);
  console.log("Statements:", result.statements.length);
  
  const alice = result.statements.find(s => s.employeeName === 'Alice');
  console.log("Alice Gross:", alice?.grossWages);
  console.log("Alice Regular Hours:", alice?.regularHours);
  console.log("Alice Overtime Hours:", alice?.overtimeHours);

  const bob = result.statements.find(s => s.employeeName === 'Bob');
  console.log("Bob Gross:", bob?.grossWages);
  
  // Bob's annual salary is $120,000, biweekly = 120,000 / 26 = 4615.38. Cents = 461538
  if (bob?.grossWages !== 461538) {
    throw new Error(`Bob gross pay incorrect. Expected 461538, got ${bob?.grossWages}`);
  }
  
  // Alice had 8 hours on day 1 (regular). Day 2 had 12 hours (8 regular, 4 overtime).
  // Total regular: 16. Total overtime: 4.
  // Reg Pay = 16 * $15 = $240. OT Pay = 4 * $22.50 = $90. Total = $330 = 33000 cents.
  if (alice?.regularHours !== 16) throw new Error("Alice reg hours wrong");
  if (alice?.overtimeHours !== 4) throw new Error("Alice OT hours wrong");
  if (alice?.grossWages !== 33000) throw new Error(`Alice gross pay wrong. Expected 33000, got ${alice?.grossWages}`);

  console.log("SUCCESS: Isolation logic and period-aware calculations are verified.");
} catch (e) {
  console.error("ERROR:", e);
  process.exit(1);
}
