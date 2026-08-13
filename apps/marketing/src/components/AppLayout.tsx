import { useState, useEffect } from 'react';
import { Menu, Search, LogIn, LogOut, Lock, ShieldCheck, ShieldAlert, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import Sidebar, { ViewKey, NAV_ITEMS, PUBLIC_VIEWS, canAccessView, VIEW_ACCESS } from '@/components/vowos/Sidebar';
import NotificationsBell from '@/components/vowos/NotificationsBell';
import AuthModal from '@/components/vowos/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_BADGE_CLASSES } from '@/lib/auth/roles';;
import { useVowosData } from '@/contexts/VowosDataContext';
import { locationById } from '@/data/vowosData';
import { LocationSwitcher } from '@/components/vowos/LocationSelect';
import { VowosErrorBoundary } from '@/components/vowos/ErrorBoundary';
import Breadcrumbs from '@/components/vowos/Breadcrumbs';
import CommandPaletteModal from '@/components/vowos/CommandPaletteModal';
import MobileNavigation from '@/components/vowos/MobileNavigation';
import { NAVIGATION_ITEMS } from '@/lib/navigation/navigationRegistry';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { getStoredCompactSidebar } from '@/lib/navigation/userPreferences';
import { fetchMessages } from '@/lib/messaging';
import { EntitlementGuard } from '@/components/vowos/guards/EntitlementGuard';

import { DemoModeBanner } from '@/components/demo/DemoModeBanner';
import { DemoCursorOverlay } from '@/components/demo/DemoCursorOverlay';
import { TourControlBar } from '@/components/demo/TourControlBar';
import { DemoLauncherModal } from '@/components/demo/DemoLauncherModal';
import TrainingCenterView from '@/features/training/components/TrainingCenterView';
import { VirtualCursorOverlay } from '@/features/training/components/VirtualCursorOverlay';
import DashboardView from '@/components/vowos/DashboardView';
import CustomersView from '@/components/vowos/CustomersView';
import LeadsView from '@/components/vowos/LeadsView';
import InventoryView from '@/components/vowos/InventoryView';
import TransfersView from '@/components/vowos/TransfersView';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import InvoicesView from '@/components/vowos/InvoicesView';
import PurchasesView from '@/components/vowos/PurchasesView';
import ReportsView from '@/components/vowos/ReportsView';
import LedgersView from '@/components/vowos/LedgersView';
import StaffView from '@/components/vowos/StaffView';
import CommunicationsView from '@/components/vowos/CommunicationsView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import SettingsView from '@/components/vowos/settings/SettingsShell';
import PayrollView from '@/components/vowos/payroll/PayrollView';
import TimeClockView from '@/components/vowos/TimeClockView';
import OnlineStorePage from '@/features/proper-commerce/pages/OnlineStorePage';
import MarketingPage from '@/features/marketing/pages/MarketingPage';
import BridePortalView from '@/features/bride-portal/BridePortalView';
import ConsultantFittingRoomView from '@/features/fitting-room/ConsultantFittingRoomView';
import { PlatformAdminView } from '@/components/vowos/PlatformAdminView';
import CatalogView from '@/features/catalog/CatalogView';
import NotFound from '@/pages/NotFound';

import MobileManagerToday from '@/components/vowos/mobile/MobileManagerToday';
import MobileManagerSchedule from '@/components/vowos/mobile/MobileManagerSchedule';
import MobileOwnerOverview from '@/components/vowos/mobile/MobileOwnerOverview';
import OwnerExecutiveOverview from '@/components/vowos/OwnerExecutiveOverview';
import MobileOwnerSales from '@/components/vowos/mobile/MobileOwnerSales';
import MobilePayroll from '@/components/vowos/mobile/MobilePayroll';
import { useDeviceMode } from '@/contexts/DeviceModeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { HelpCenterSlideOut } from '@/features/support/components/HelpCenterSlideOut';
function LockedPanel({ label, onSignIn }: { label: string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-serif text-2xl text-stone-900">{label} is staff-only</h2>
      <p className="mt-2 max-w-sm text-sm text-stone-500">
        Sign in with your The Boutique staff account to manage {label.toLowerCase()}. The
        dashboard remains available as a preview for guests.
      </p>
      <button
        onClick={onSignIn}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
      >
        <LogIn className="h-4 w-4" /> Staff Sign In
      </button>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Secured by Supabase authentication
      </p>
    </div>
  );
}

function RoleLockedPanel({ label, view, role }: { label: string; view: ViewKey; role: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-amber-300 bg-status-warning/10/40 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-warning text-white shadow-lg">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-serif text-2xl text-stone-900">{label} needs a higher role</h2>
      <p className="mt-2 max-w-sm text-sm text-stone-500">
        Your <span className="font-semibold">{role}</span> role doesn't include {label.toLowerCase()}.
        This section is open to: {VIEW_ACCESS[view].join(', ')}. Ask an Owner to adjust your role in
        Staff &amp; Roles.
      </p>
    </div>
  );
}

import { useDemo } from '@/lib/demo/demoContext';

import { OnboardingWizardModal } from '@/components/vowos/onboarding/OnboardingWizardModal';

export default function AppLayout() {
  const { currentView, navigateToView } = useApplicationRoute();
  const view = currentView;
  const setView = (v: ViewKey) => navigateToView(v);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const { session, profile, loading, signOut } = useAuth();
  const { activeLocation, activeBusinessId } = useVowosData();
  const { isDemoMode, activePersona } = useDemo();

  // Auto-open onboarding if business is pending (simulated for now since onboardingStatus isn't exposed in useVowosData yet)
  // In a real app, this would check useVowosData().business.onboarding_status === 'PENDING'

  const currentLabel = NAV_ITEMS.find((n) => n.key === view)?.label ?? 'Dashboard';
  const isGuestLocked = !session && !PUBLIC_VIEWS.includes(view) && !isDemoMode;
  
  const effectiveRole = isDemoMode ? activePersona.role : (session && profile ? profile.role : null);
  const isRoleLocked = !!effectiveRole && !canAccessView(effectiveRole, view, profile?.id);

  const effectiveName = isDemoMode ? activePersona.name : (profile?.name || '');
  const initials = effectiveName
    ? effectiveName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(() => getStoredCompactSidebar());

  const { isDesktopModeOverride } = useDeviceMode();
  const isMobileViewport = useIsMobile();
  const showMobileView = isMobileViewport && !isDesktopModeOverride;

  const [headerMessages, setHeaderMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchMessages().then(setHeaderMessages).catch(() => {});
  }, []);

  const unreadMessagesCount = (headerMessages || []).filter(
    (c) => c.direction === 'inbound' || c.status === 'failed'
  ).length;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Sidebar
        view={view}
        onNavigate={setView}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onRequestSignIn={() => setAuthOpen(true)}
        isCompact={compactSidebar}
        onToggleCompact={() => setCompactSidebar(!compactSidebar)}
        onOpenOnboarding={() => setOnboardingModalOpen(true)}
      />

      <div className={`flex flex-col transition-all duration-200 ${compactSidebar ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <DemoModeBanner />
        {showMobileView ? (
          <header className="sticky top-0 z-20 bg-white border-b border-stone-200 shadow-sm px-4 py-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-bold text-stone-900">{currentLabel}</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  The Boutique · {activeLocation === 'all' ? 'All Locations' : locationById(activeLocation).short}
                </p>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-2 rounded-full bg-stone-100 text-stone-600"
                >
                  <Search className="h-4 w-4" />
                </button>
                <NotificationsBell onNavigate={setView} />
              </div>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#faf8f5]/90 backdrop-blur">
            <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-brand-primary">VowOS</p>
                <h2 className="text-sm font-semibold text-stone-800">{currentLabel}</h2>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Help / Training Button */}
                <HelpCenterSlideOut />

                {/* Store / location switcher — scopes every view */}
                <div data-tour-id="header-location-select">
                  <LocationSwitcher />
                </div>

                {/* Global Search / Command Palette button */}
                <button
                  data-tour-id="header-search-brides"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-400 transition-colors hover:border-stone-300 sm:flex shadow-2xs"
                >
                  <Search className="h-3.5 w-3.5 text-stone-400" />
                  <span>Search brides, gowns, orders...</span>
                  <kbd className="ml-1 rounded border border-stone-200 bg-stone-50 px-1 py-0.5 text-[9px] font-medium text-stone-500">
                    Ctrl K
                  </kbd>
                </button>

                {/* Global Communications Header Button */}
                <button
                  onClick={() => setView('communications')}
                  className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 transition-colors shadow-2xs"
                  title="Client Communications Inbox"
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[9px] font-bold text-white shadow-xs">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>

                {/* Live alerts: in-transit transfers, overdue invoices, delayed POs */}
                <div data-tour-id="header-notifications">
                  <NotificationsBell onNavigate={setView} />
                </div>

                {/* Auth control */}
                {!loading && (
                  session && profile ? (
                    <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <div className="hidden leading-tight sm:block">
                        <p className="max-w-[120px] truncate text-xs font-semibold text-stone-800">{profile.name}</p>
                        <span className={`inline-flex rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE_CLASSES[profile.role]}`}>
                          {profile.role}
                        </span>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="ml-1 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                        aria-label="Sign out"
                        title="Sign out"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-700"
                    >
                      <LogIn className="h-4 w-4" /> Sign In
                    </button>
                  )
                )}
              </div>
            </div>
          </header>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          {!showMobileView && <Breadcrumbs view={view} onNavigate={setView} />}

          {/* Mobile App Download Prompt */}
          {showMobileView && view === 'dashboard' && (
            <div className="mb-6 flex flex-col items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-lg font-bold font-serif text-white">
                  R
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">The Boutique App</p>
                  <p className="text-xs text-stone-500">Get the native mobile experience</p>
                </div>
              </div>
              <InstallAppButton size="sm" className="w-full sm:w-auto shrink-0 font-bold" />
            </div>
          )}

          {/* Guest preview banner on the dashboard */}
          {!session && !loading && view === 'dashboard' && (
            <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-border-subtle bg-brand-soft/70 px-5 py-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-brand-primary">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-medium">You're viewing the dashboard in preview mode.</p>
              </div>
              <p className="text-xs text-brand-primary/80 sm:flex-1">
                Sign in with a staff account to manage brides, inventory, invoices, and more.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
              >
                Staff Sign In
              </button>
            </div>
          )}

          {isGuestLocked ? (
            <LockedPanel label={currentLabel} onSignIn={() => setAuthOpen(true)} />
          ) : isRoleLocked ? (
            <RoleLockedPanel label={currentLabel} view={view} role={effectiveRole!} />
          ) : (() => {
            const activeNavItem = NAVIGATION_ITEMS.find((n) => n.id === view);
            const content = (
              <VowosErrorBoundary>
                {view === 'dashboard' && (showMobileView && (effectiveRole === 'Manager' || effectiveRole === 'Owner') ? <MobileManagerToday onNavigate={setView} /> : <DashboardView onNavigate={setView} />)}
                {view === 'overview' && (showMobileView ? <MobileOwnerOverview onNavigate={setView} /> : <OwnerExecutiveOverview onNavigate={setView} />)}
                {view === 'sales' && (showMobileView && (effectiveRole === 'Owner' || effectiveRole === 'Manager') ? <MobileOwnerSales onNavigate={setView} /> : <ReportsView />)}
                {view === 'customers' && <CustomersView />}
                {view === 'leads' && <LeadsView onNavigate={(v) => setView(v as ViewKey)} />}
                {view === 'catalog' && <CatalogView />}
                {view === 'inventory' && <InventoryView />}
                {view === 'transfers' && <TransfersView />}
                {(view === 'schedule' || view === 'appointments' || view === 'operations' || view === 'schedules') && (
                  showMobileView && (effectiveRole === 'Manager' || effectiveRole === 'Owner') && !window.location.search.includes('layout=unified') ? (
                    <MobileManagerSchedule onNavigate={setView} />
                  ) : (
                    <UnifiedSchedulingWorkspace />
                  )
                )}
                {view === 'communications' && <CommunicationsView />}
                {view === 'contracts' && <ContractsView />}
                {view === 'alterations' && <AlterationsView />}

                {view === 'invoices' && <InvoicesView />}
                {view === 'purchases' && <PurchasesView />}
                {view === 'reports' && <ReportsView />}
                {view === 'ledgers' && <LedgersView />}
                {view === 'staff' && <StaffView />}
                {view === 'settings' && <SettingsView />}
                {view === 'payroll' && (showMobileView && (effectiveRole === 'Manager' || effectiveRole === 'Owner') ? <MobilePayroll onNavigate={setView} /> : <PayrollView />)}
                {view === 'timeclock' && <TimeClockView />}
                {view === 'training' && <TrainingCenterView onNavigate={setView} />}
                {view === 'onlinestore' && <OnlineStorePage />}
                {view === 'marketing' && <MarketingPage />}
                {view === 'bride-portal' && <BridePortalView />}
                {view === 'fitting-room' && <ConsultantFittingRoomView />}
                {view === 'platform-admin' && <PlatformAdminView />}
                {view === 'not-found' && <NotFound />}
              </VowosErrorBoundary>
            );

            if (activeNavItem?.requiredFeature) {
              return (
                <EntitlementGuard featureKey={activeNavItem.requiredFeature}>
                  {content}
                </EntitlementGuard>
              );
            }
            return content;
          })()}

          <DemoLauncherModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} onNavigateNeeded={setView} />
          <CommandPaletteModal open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onNavigate={setView} />
          <DemoCursorOverlay />
          <VirtualCursorOverlay />
          <TourControlBar onNavigateNeeded={setView} />

          <footer className="mt-10 border-t border-stone-200 pt-6 pb-4 text-center text-xs text-stone-400">
            VowOS — Bridal Retail Operating System · © 2026 The Boutique · I Do Bridal Couture
            + Proper & Company · Baton Rouge & Covington, LA ·{' '}
            {activeLocation === 'all' ? 'Viewing all locations' : `Viewing ${locationById(activeLocation).short}`}
          </footer>
        </main>
      </div>

      {/* Role-aware mobile navigation bar and More drawer */}
      <MobileNavigation view={view} onNavigate={setView} onRequestSignIn={() => setAuthOpen(true)} />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      
      <OnboardingWizardModal 
        open={onboardingModalOpen} 
        onOpenChange={setOnboardingModalOpen} 
        businessId={activeBusinessId} 
        onComplete={() => setOnboardingModalOpen(false)} 
      />
    </div>
  );
}
