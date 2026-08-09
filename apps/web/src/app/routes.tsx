import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';
import { ProtectedRoute } from '../auth';

// ─── Lazy-loaded module pages ───
const LoginPage = lazy(() => import('../auth/LoginPage'));
const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const CustomersPage = lazy(() => import('../modules/customers/CustomersPage'));
const CalendarPage = lazy(() => import('../modules/calendar/CalendarPage'));
const LeadsPage = lazy(() => import('../modules/leads/LeadsPage'));
const CommunicationsPage = lazy(() => import('../modules/communications/CommunicationsPage'));
const InventoryPage = lazy(() => import('../modules/inventory/InventoryPage'));
const PurchasingPage = lazy(() => import('../modules/purchasing/PurchasingPage'));
const AlterationsPage = lazy(() => import('../modules/alterations/AlterationsPage'));
const TransfersPage = lazy(() => import('../modules/transfers/TransfersPage'));
const PickupsPage = lazy(() => import('../modules/pickups/PickupsPage'));
const FinancialsPage = lazy(() => import('../modules/financials/FinancialsPage'));
const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'));
const LocationsPage = lazy(() => import('../modules/locations/LocationsPage'));
const PayrollPage = lazy(() => import('../modules/payroll/PayrollPage'));
const StaffPage = lazy(() => import('../modules/staff/StaffPage'));
const SettingsPage = lazy(() => import('../modules/settings/SettingsPage'));
const TrainingPage = lazy(() => import('../modules/training/TrainingPage'));
const SignupPage = lazy(() => import('../auth/SignupPage'));
const GrowthPage = lazy(() => import('../modules/growth/GrowthPage'));
const FranchisePage = lazy(() => import('../modules/franchise/FranchisePage'));
const PricingPage = lazy(() => import('../marketing/PricingPage'));

// ─── Loading fallback ───
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div className="animate-spin" style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid #e5e7eb', borderTopColor: '#e91e63',
      }} />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── Error boundary for routes ───
function RouteErrorBoundary() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
        Something went wrong
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        An unexpected error occurred loading this page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 20px', background: '#1a1a2e', color: '#fff',
          borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

// ─── 404 Page ───
function NotFoundPage() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
        Page Not Found
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          padding: '10px 20px', background: '#1a1a2e', color: '#fff',
          borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block',
        }}
      >
        Back to Dashboard
      </a>
    </div>
  );
}

// ─── Router Configuration ───

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/signup',
    element: <SuspenseWrapper><SignupPage /></SuspenseWrapper>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/pricing',
    element: <SuspenseWrapper><PricingPage /></SuspenseWrapper>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: 'customers', element: <SuspenseWrapper><CustomersPage /></SuspenseWrapper> },
      { path: 'calendar', element: <SuspenseWrapper><CalendarPage /></SuspenseWrapper> },
      { path: 'leads', element: <SuspenseWrapper><LeadsPage /></SuspenseWrapper> },
      { path: 'communications', element: <SuspenseWrapper><CommunicationsPage /></SuspenseWrapper> },
      { path: 'inventory', element: <SuspenseWrapper><InventoryPage /></SuspenseWrapper> },
      { path: 'purchasing', element: <SuspenseWrapper><PurchasingPage /></SuspenseWrapper> },
      { path: 'alterations', element: <SuspenseWrapper><AlterationsPage /></SuspenseWrapper> },
      { path: 'transfers', element: <SuspenseWrapper><TransfersPage /></SuspenseWrapper> },
      { path: 'pickups', element: <SuspenseWrapper><PickupsPage /></SuspenseWrapper> },
      { path: 'financials', element: <SuspenseWrapper><FinancialsPage /></SuspenseWrapper> },
      { path: 'reports', element: <SuspenseWrapper><ReportsPage /></SuspenseWrapper> },
      { path: 'locations', element: <SuspenseWrapper><LocationsPage /></SuspenseWrapper> },
      {
        path: 'payroll',
        element: <ProtectedRoute roles={['owner', 'manager']}><SuspenseWrapper><PayrollPage /></SuspenseWrapper></ProtectedRoute>,
      },
      {
        path: 'staff',
        element: <ProtectedRoute roles={['owner', 'manager']}><SuspenseWrapper><StaffPage /></SuspenseWrapper></ProtectedRoute>,
      },
      {
        path: 'settings',
        element: <ProtectedRoute roles={['owner']}><SuspenseWrapper><SettingsPage /></SuspenseWrapper></ProtectedRoute>,
      },
      {
        path: 'training',
        element: <ProtectedRoute roles={['owner', 'manager']}><SuspenseWrapper><TrainingPage /></SuspenseWrapper></ProtectedRoute>,
      },
      {
        path: 'growth',
        element: <ProtectedRoute roles={['owner']}><SuspenseWrapper><GrowthPage /></SuspenseWrapper></ProtectedRoute>,
      },
      {
        path: 'franchise',
        element: <ProtectedRoute roles={['owner']}><SuspenseWrapper><FranchisePage /></SuspenseWrapper></ProtectedRoute>,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
