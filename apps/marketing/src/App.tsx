/* eslint-disable @typescript-eslint/no-explicit-any */
import { Toaster } from "@vowos/design-system";
import { Sonner } from "@vowos/design-system";
import { TooltipProvider } from "@vowos/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PwaInstallProvider } from "@/contexts/PwaInstallContext";
import Index from "./pages/Index";
import BookAppointment from "./pages/BookAppointment";
import PayInvoice from "./pages/PayInvoice";
import SignContract from "./pages/SignContract";
import BridePortal from "./pages/BridePortal";
import CentralAuthCallback from "./pages/CentralAuthCallback";
import DemoLauncherPage from "./pages/DemoLauncherPage";
import { VowosErrorBoundary } from "@/components/vowos/ErrorBoundary";
import { DemoProvider } from "@/lib/demo/demoContext";
import { DeviceModeProvider } from "@/contexts/DeviceModeContext";
import { OfflineWarning } from "@/components/pwa/OfflineWarning";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { ThemeProvider as VowosThemeProvider } from "@vowos/design-system";
import MarketingLanding from './pages/MarketingLanding';
import { PricingPage } from './pages/public/PricingPage';
import { CompetitorComparisonPage } from './pages/public/CompetitorComparisonPage';
import { FeatureShowcasePage } from './pages/public/FeatureShowcasePage';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DemoRequestPage from "./pages/DemoRequestPage";
import Onboarding from "./pages/Onboarding";
import PlatformAdmin from "./pages/PlatformAdmin";
import { isMarketingHost } from "@/config/hostConfig";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const queryClient = new QueryClient();

const SupportModeBanner = () => {
  const { isSupportMode, tenant, exitSupportMode } = useAuth();

  if (!isSupportMode) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2 font-bold">
        <ShieldAlert className="w-5 h-5" />
        SUPPORT MODE ACTIVE: {tenant?.id}
      </div>
      <Button variant="secondary" size="sm" onClick={exitSupportMode}>
        Exit Support Mode
      </Button>
    </div>
  );
};

const HardRedirectToRoot = () => {
  if (sessionStorage.getItem('vowos_sw_loop_guard')) {
    // We already tried to escape the SPA shell and ended up right back here.
    // The service worker is trapping us. Unregister it and try one last time.
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
      sessionStorage.removeItem('vowos_sw_loop_guard');
      window.location.reload();
    });
    return null;
  }
  sessionStorage.setItem('vowos_sw_loop_guard', 'true');
  window.location.href = '/';
  return null;
};

const App = () => {
  return (
    <VowosErrorBoundary>
      <HelmetProvider>
        <VowosThemeProvider defaultTenantConfig={(window as any).__VOWOS_TENANT_CONFIG?.brand}>
          <ThemeProvider defaultTheme="light">
          <QueryClientProvider client={queryClient}>
            <PwaInstallProvider>
              <TooltipProvider>
                <OfflineWarning />
                <Toaster />
                <Sonner />
                <UpdatePrompt />
                <AuthProvider>
                  <DeviceModeProvider>
                    <DemoProvider>
                      <BrowserRouter>
                        <SupportModeBanner />
                        <Routes>
                          {/* Platform Super Admin */}
                          <Route path="/platform/*" element={<PlatformAdmin />} />

                          {/* Marketing Landing Page (only on root path of marketing host) */}
                          {isMarketingHost(window.location.hostname) && (
                            <Route path="/" element={<HardRedirectToRoot />} />
                          )}

                          {/* Shared Top-level Routes */}
                          <Route path="/pricing" element={<PricingPage />} />
                          <Route path="/compare" element={<CompetitorComparisonPage />} />
                          <Route path="/features" element={<FeatureShowcasePage />} />
                          <Route path="/demo" element={<DemoLauncherPage />} />
                          <Route path="/demo-request" element={<DemoRequestPage />} />

                          {/* Public full-access synthetic VowOS sandbox. This is intentionally
                              separate from every production tenant, especially Roberts Enterprises. */}
                          <Route path="/demoapp/book" element={<BookAppointment />} />
                          <Route path="/demoapp/*" element={<Index />} />

                          <Route path="/app" element={<Index />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route path="/book" element={<BookAppointment />} />
                          <Route path="/pay/:invoiceId" element={<PayInvoice />} />
                          <Route path="/sign/:contractId" element={<SignContract />} />
                          <Route path="/portal/:brideId" element={<BridePortal />} />
                          <Route path="/central-auth" element={<CentralAuthCallback />} />

                          {/* Legacy Route Redirects */}
                          <Route path="/dashboard" element={<Navigate to="/today" replace />} />
                          <Route path="/overview" element={<Navigate to="/today" replace />} />
                          <Route path="/schedule" element={<Navigate to="/appointments?mode=calendar" replace />} />
                          <Route path="/brides" element={<Navigate to="/customers" replace />} />
                          <Route path="/communications" element={<Navigate to="/customers?tab=inbox" replace />} />
                          <Route path="/contracts" element={<Navigate to="/sales?tab=contracts" replace />} />
                          <Route path="/alterations" element={<Navigate to="/sales?tab=alterations" replace />} />
                          <Route path="/invoices" element={<Navigate to="/sales?tab=payments" replace />} />
                          <Route path="/catalog" element={<Navigate to="/inventory?tab=vendors" replace />} />
                          <Route path="/transfers" element={<Navigate to="/inventory?tab=transfers" replace />} />
                          <Route path="/purchases" element={<Navigate to="/inventory?tab=purchases" replace />} />
                          <Route path="/ledgers" element={<Navigate to="/reports?tab=accounting" replace />} />
                          <Route path="/team" element={<Navigate to="/team?tab=employees" replace />} />
                          <Route path="/payroll" element={<Navigate to="/team?tab=payroll" replace />} />
                          <Route path="/timeclock" element={<Navigate to="/team?tab=timeclock" replace />} />
                          <Route path="/growth/leads" element={<Navigate to="/growth?tab=leads" replace />} />
                          <Route path="/growth/campaigns" element={<Navigate to="/growth?tab=overview" replace />} />
                          <Route path="/growth/social" element={<Navigate to="/growth?tab=social" replace />} />
                          <Route path="/growth/seo" element={<Navigate to="/growth?tab=seo" replace />} />
                          <Route path="/growth/local" element={<Navigate to="/growth?tab=google" replace />} />
                          <Route path="/growth/reputation" element={<Navigate to="/growth?tab=reviews" replace />} />
                          <Route path="/growth/competitors" element={<Navigate to="/growth?tab=competitors" replace />} />
                          <Route path="/growth/attribution" element={<Navigate to="/growth?tab=attribution" replace />} />
                          <Route path="/growth/website" element={<Navigate to="/growth?tab=website" replace />} />

                          {/* Application Engine (Dashboard, Today, Schedule, Customers, Inventory, etc.) */}
                          <Route path="/*" element={<Index />} />
                        </Routes>
                      </BrowserRouter>
                    </DemoProvider>
                  </DeviceModeProvider>
                </AuthProvider>
              </TooltipProvider>
            </PwaInstallProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </VowosThemeProvider>
      </HelmetProvider>
    </VowosErrorBoundary>
  );
};

export default App;

