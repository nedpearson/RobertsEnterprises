/**
 * VowOS Route Registry
 * Single source of truth for all application routes.
 */

export interface VowOSRoute {
  path: string;
  name: string;
  shell: 'marketing' | 'auth' | 'app' | 'demo' | 'super-admin' | 'public';
  component: string;
  requiredFeature?: string;
  requiredRole?: string[];
  mobileSupport: boolean;
  breadcrumbs?: string[];
}

export const routeRegistry: VowOSRoute[] = [
  // Marketing shell
  { path: '/', name: 'Home', shell: 'marketing', component: 'MarketingLanding', mobileSupport: true },
  { path: '/demo', name: 'Interactive Demo', shell: 'demo', component: 'DemoLauncherPage', mobileSupport: true },
  { path: '/app', name: 'App Launcher', shell: 'app', component: 'AppRouteWrapper', mobileSupport: true },
  // Auth shell
  { path: '/login', name: 'Sign In', shell: 'auth', component: 'Login', mobileSupport: true },
  { path: '/signup', name: 'Start Free Trial', shell: 'auth', component: 'Signup', mobileSupport: true },
  { path: '/onboarding', name: 'Setup', shell: 'auth', component: 'Onboarding', mobileSupport: true },
  // Public shell  
  { path: '/book', name: 'Book Appointment', shell: 'public', component: 'BookAppointment', mobileSupport: true },
  { path: '/pay/:invoiceId', name: 'Pay Invoice', shell: 'public', component: 'PayInvoice', mobileSupport: true },
  { path: '/sign/:contractId', name: 'Sign Contract', shell: 'public', component: 'SignContract', mobileSupport: true },
  { path: '/portal/:brideId', name: 'Bride Portal', shell: 'public', component: 'BridePortal', mobileSupport: true },
  // Super Admin
  { path: '/platform-admin/*', name: 'Platform Admin', shell: 'super-admin', component: 'PlatformAdmin', requiredRole: ['super_admin'], mobileSupport: false },
  // Application (internal nav via navigationRegistry)
  { path: '/*', name: 'Application', shell: 'app', component: 'Index', mobileSupport: true },
];
