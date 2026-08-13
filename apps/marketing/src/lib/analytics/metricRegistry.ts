export interface VowOSMetricDefinition {
  id: string;
  name: string;
  businessDefinition: string;
  sourceTables: string[];
  qualifyingStatuses: string[];
  excludedStatuses: string[];
  dateField: string;
  formula: string;
  currencyHandling: 'minor_units_cents' | 'none';
  drilldownRoute: string;
}

export const VOWOS_METRICS: Record<string, VowOSMetricDefinition> = {
  REVENUE: {
    id: 'REVENUE',
    name: 'Total Revenue',
    businessDefinition: 'Sum of all mathematically verified successful payments across all orders.',
    sourceTables: ['orders', 'payments'],
    qualifyingStatuses: ['PAID', 'PARTIALLY_PAID', 'COMPLETED'],
    excludedStatuses: ['CANCELED', 'VOIDED', 'FAILED'],
    dateField: 'payments.created_at',
    formula: 'SUM(payments.amount) WHERE status = "SUCCESS"',
    currencyHandling: 'minor_units_cents',
    drilldownRoute: '/app/sales/transactions',
  },
  APPOINTMENTS: {
    id: 'APPOINTMENTS',
    name: 'Total Appointments',
    businessDefinition: 'Count of all non-canceled appointments in the requested period.',
    sourceTables: ['appointments'],
    qualifyingStatuses: ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
    excludedStatuses: ['CANCELED', 'DENIED'],
    dateField: 'appointments.start_time',
    formula: 'COUNT(id)',
    currencyHandling: 'none',
    drilldownRoute: '/app/calendar',
  },
  CONVERSION_RATE: {
    id: 'CONVERSION_RATE',
    name: 'Appointment Conversion Rate',
    businessDefinition: 'Percentage of completed appointments that resulted in a sale greater than $0.',
    sourceTables: ['appointments', 'orders'],
    qualifyingStatuses: ['COMPLETED'],
    excludedStatuses: ['BOOKED', 'CANCELED', 'NO_SHOW'],
    dateField: 'appointments.start_time',
    formula: '(COUNT(appointments WITH related order > 0) / COUNT(appointments WHERE status=COMPLETED)) * 100',
    currencyHandling: 'none',
    drilldownRoute: '/app/reporting/conversion',
  },
  MRR: {
    id: 'MRR',
    name: 'Monthly Recurring Revenue',
    businessDefinition: 'Normalized monthly value of all active paid subscriptions. Excludes trials, comped, and canceled accounts.',
    sourceTables: ['organization_subscriptions'],
    qualifyingStatuses: ['ACTIVE', 'PAST_DUE'],
    excludedStatuses: ['TRIAL', 'CANCELED', 'COMPED'],
    dateField: 'organization_subscriptions.updated_at',
    formula: 'SUM(plan_monthly_price)',
    currencyHandling: 'minor_units_cents',
    drilldownRoute: '/platform/organizations',
  }
};
