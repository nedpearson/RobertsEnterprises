import { Toaster } from "@vowos/design-system";
import { Sonner } from "@vowos/design-system";
import { TooltipProvider } from "@vowos/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PwaInstallProvider } from "@/contexts/PwaInstallContext";
import Index from "./pages/Index";
import BookAppointment from "./pages/BookAppointment";
import PayInvoice from "./pages/PayInvoice";
import SignContract from "./pages/SignContract";
import BridePortal from "./pages/BridePortal";
import NotFound from "./pages/NotFound";
import CentralAuthCallback from "./pages/CentralAuthCallback";
import DemoLauncherPage from "./pages/DemoLauncherPage";
import MobileDemoLauncher from "@/components/vowos/mobile/MobileDemoLauncher";

import { VowosErrorBoundary } from "@/components/vowos/ErrorBoundary";

import { DemoProvider } from "@/lib/demo/demoContext";
import { DeviceModeProvider } from "@/contexts/DeviceModeContext";

import { OfflineWarning } from "@/components/pwa/OfflineWarning";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { ThemeProvider as VowosThemeProvider } from "@vowos/design-system";
import MarketingLanding from './pages/MarketingLanding';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PlatformAdmin from "./pages/PlatformAdmin";

const queryClient = new QueryClient();

const AppRouteWrapper = () => {
  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    return (
      <>
        <MarketingLanding />
        <MobileDemoLauncher />
      </>
    );
  }
  return <Navigate to="/demo" replace />;
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
                  <Routes>
                    {/* Platform Super Admin */}
                    <Route path="/platform-admin/*" element={<PlatformAdmin />} />
                    
                    {/* Marketing Site - Only active on vowos domains */}
                    {(window.location.hostname === 'vowos.bridgebox.ai' || window.location.hostname === 'vowos.localhost') ? (
                      <>
                        <Route path="/" element={<MarketingLanding />} />
                        <Route path="/demo" element={<DemoLauncherPage />} />
                        <Route path="/app" element={<AppRouteWrapper />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/*" element={<Navigate to="/" replace />} />
                      </>
                    ) : (
                      <>
                        {/* Tenant Application - Active on all other domains */}
                        <Route path="/" element={<Index />} />
                        <Route path="/demo" element={<DemoLauncherPage />} />
                        <Route path="/app" element={<AppRouteWrapper />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/*" element={<Index />} />
                        <Route path="/book" element={<BookAppointment />} />
                        <Route path="/pay/:invoiceId" element={<PayInvoice />} />
                        <Route path="/sign/:contractId" element={<SignContract />} />
                        <Route path="/portal/:brideId" element={<BridePortal />} />
                        <Route path="/central-auth" element={<CentralAuthCallback />} />
                        
                        {/* Canonical & Legacy Scheduling Routes */}
                        <Route path="/actions" element={<Navigate to="/today?section=attention" replace />} />
                        <Route path="/appointments" element={<Navigate to="/schedule?mode=calendar" replace />} />
                        <Route path="/operations" element={<Navigate to="/schedule?mode=calendar" replace />} />
                        <Route path="/schedules" element={<Navigate to="/schedule?mode=workforce" replace />} />
                        <Route path="/scheduling/unified" element={<Navigate to="/schedule?layout=unified" replace />} />
                        <Route path="/scheduling/calendar" element={<Navigate to="/schedule?mode=calendar" replace />} />
                        <Route path="/scheduling/appointments" element={<Navigate to="/schedule?mode=calendar" replace />} />
                        <Route path="/scheduling/assignment-center" element={<Navigate to="/schedule?mode=requests" replace />} />
                        <Route path="/booking-request" element={<Navigate to="/schedule?mode=requests" replace />} />
                      </>
                    )}
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
