import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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

import { VowosErrorBoundary } from "@/components/vowos/ErrorBoundary";

import { DemoProvider } from "@/lib/demo/demoContext";
import { DeviceModeProvider } from "@/contexts/DeviceModeContext";

import { OfflineWarning } from "@/components/pwa/OfflineWarning";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

import MarketingLanding from './pages/MarketingLanding';

const queryClient = new QueryClient();

const App = () => {
  return (
  <VowosErrorBoundary>
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
                    <Route path="/*" element={<Index />} />
                    <Route path="/book" element={<BookAppointment />} />
                    <Route path="/pay/:invoiceId" element={<PayInvoice />} />
                    <Route path="/sign/:contractId" element={<SignContract />} />
                    <Route path="/portal/:brideId" element={<BridePortal />} />
                    
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
                  </Routes>
                </BrowserRouter>
              </DemoProvider>
              </DeviceModeProvider>
            </AuthProvider>
          </TooltipProvider>
        </PwaInstallProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </VowosErrorBoundary>
  );
};

export default App;
