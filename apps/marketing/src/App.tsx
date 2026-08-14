import { Toaster } from "@vowos/design-system";
import { Sonner } from "@vowos/design-system";
import { TooltipProvider } from "@vowos/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Pricing from './pages/Pricing';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

const App = () => {
  return (
    <VowosErrorBoundary>
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
                            <Route path="/" element={<MarketingLanding />} />
                          )}

                          {/* Shared Top-level Routes */}
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/demo" element={<DemoLauncherPage />} />

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
    </VowosErrorBoundary>
  );
};

export default App;
