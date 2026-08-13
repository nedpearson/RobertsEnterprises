export type HealthState = 'HEALTHY' | 'DEGRADED' | 'ACTION REQUIRED' | 'OUTAGE' | 'UNKNOWN';

export interface SystemHealthStatus {
  id: string;
  name: string;
  status: HealthState;
  message: string;
  liveness: boolean;
  readiness: boolean;
  lastUpdated: string;
}

export function generateMockHealthStatus(): SystemHealthStatus[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'sys-web',
      name: 'Web Application',
      status: 'HEALTHY',
      message: 'Serving traffic normally. No elevated 5xx errors.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-api',
      name: 'Core API',
      status: 'HEALTHY',
      message: 'p95 latency at 85ms. All endpoints available.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-db',
      name: 'Primary Database',
      status: 'HEALTHY',
      message: 'Connection pool stable. No deadlocks.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-booking',
      name: 'Booking Service',
      status: 'HEALTHY',
      message: 'Appointments confirming normally.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-shopify',
      name: 'Shopify Sync',
      status: 'DEGRADED',
      message: 'Elevated rate limits from Shopify API slowing inventory updates.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-email',
      name: 'Email Delivery',
      status: 'HEALTHY',
      message: 'Messages delivering via provider.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-sms',
      name: 'SMS Gateway',
      status: 'ACTION REQUIRED',
      message: 'Provider reports 10% delivery failure to specific carrier.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
    {
      id: 'sys-billing',
      name: 'SaaS Billing',
      status: 'HEALTHY',
      message: 'Webhooks processing properly.',
      liveness: true,
      readiness: true,
      lastUpdated: now,
    },
  ];
}
