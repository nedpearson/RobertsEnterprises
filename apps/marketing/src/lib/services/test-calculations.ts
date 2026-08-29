import { OrganizationRole } from '@/lib/auth/roles';
import { authorizeAction } from './authService';
import { calculateEmployeePayroll } from './payrollEngine';
import { CompensationProfile, Deduction, Reimbursement, Bonus, OfficialPayrollPeriod } from './workforceStore';

// Mock period
const TEST_PERIOD: OfficialPayrollPeriod = {
  id: 'pay-test-01',
  name: 'Test Period July 16 - 31, 2026',
  startDate: '2026-07-16',
  endDate: '2026-07-31',
  payDate: '2026-08-05',
  status: 'draft'
} as any;

function testOvertimeCalculation() {
  console.log('--- Running Test 1: Hourly Employee Overtime Calculations ---');
  
  const comp: CompensationProfile = {
    employeeId: 'eleanor_vance',
    employeeName: 'Eleanor Vance',
    type: 'hourly',
    hourlyRate: 2000, // $20.00 / hr
    salaryAmount: 0,
    commissionRate: 5,
    drawAmount: 0,
    effectiveDate: '2026-01-01'
  };

  // Mock punches: 1 shift of 10 hours (should yield 8h regular and 2h overtime at 1.5x)
  const punches = [
    {
      id: 'p-01',
      staffName: 'Eleanor Vance',
      clockIn: '2026-07-20T08:00:00.000Z',
      clockOut: '2026-07-20T18:00:00.000Z',
      note: '{"department":"Sales","locationId":"north","breaks":[],"transfers":[]}'
    }
  ] as any[];

  const deductions: Deduction[] = [];
  const reimbursements: Reimbursement[] = [];
  const bonuses: Bonus[] = [];
  const commissionsCents = 0;

  const result = calculateEmployeePayroll(
    'eleanor_vance',
    'Eleanor Vance',
    comp,
    punches,
    [],
    deductions,
    reimbursements,
    bonuses,
    commissionsCents,
    TEST_PERIOD
  );

  console.log(`Regular hours: ${result.regularHours} (Expected: 8)`);
  console.log(`Overtime hours: ${result.overtimeHours} (Expected: 2)`);
  console.log(`Regular pay: $${(result.regularPay / 100).toFixed(2)} (Expected: $160.00)`);
  console.log(`Overtime pay: $${(result.overtimePay / 100).toFixed(2)} (Expected: $60.00)`);
  console.log(`Gross wages: $${(result.grossWages / 100).toFixed(2)} (Expected: $220.00)`);
  
  if (
    result.regularHours === 8 &&
    result.overtimeHours === 2 &&
    result.grossWages === 22000
  ) {
    console.log('✅ Test 1 Passed Successfully!');
  } else {
    throw new Error('❌ Test 1 Failed!');
  }
}

function testAuthorizationSafeguards() {
  console.log('\n--- Running Test 2: Authorization Safeguards & Self-Approval Locks ---');

  // Case A: Owner has settings.manage privilege
  const authOwner = authorizeAction({
    userId: 'nedpearson',
    userRole: OrganizationRole.ORG_SUPER_ADMIN,
    permission: 'settings.manage'
  });
  console.log(`Owner settings.manage allowed: ${authOwner.allowed} (Expected: true)`);

  // Case B: Stylist lacks settings.manage privilege
  const authStylist = authorizeAction({
    userId: 'stylist-01',
    userRole: OrganizationRole.EMPLOYEE,
    permission: 'settings.manage'
  });
  console.log(`Stylist settings.manage allowed: ${authStylist.allowed} (Expected: false)`);

  // Case C: Self-Approval Lockout check (Manager cannot approve their own timecard)
  const selfApproval = authorizeAction({
    userId: 'manager-01',
    userRole: OrganizationRole.MANAGER,
    permission: 'timecards.approve',
    entityOwnerId: 'manager-01'
  });
  console.log(`Manager self-approve own timecard allowed: ${selfApproval.allowed} (Expected: false)`);

  // Case D: Manager Capped approval limits check
  const overLimit = authorizeAction({
    userId: 'manager-01',
    userRole: OrganizationRole.MANAGER,
    permission: 'bonuses.create',
    amountCents: 60000 // $600.00 (Limit is $500.00)
  });
  console.log(`Manager exceeding $500 bonus approval limit allowed: ${overLimit.allowed} (Expected: false)`);

  if (
    authOwner.allowed &&
    !authStylist.allowed &&
    !selfApproval.allowed &&
    !overLimit.allowed
  ) {
    console.log('✅ Test 2 Passed Successfully!');
  } else {
    throw new Error('❌ Test 2 Failed!');
  }
}

try {
  testOvertimeCalculation();
  testAuthorizationSafeguards();
  console.log('\n🌟 ALL AUTOMATED UNIT TESTS PASSED SUCCESSFULLY! 🌟');
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}



