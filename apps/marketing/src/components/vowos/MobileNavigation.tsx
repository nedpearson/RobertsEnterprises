import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MoreHorizontal, Monitor, Smartphone, X } from 'lucide-react';
import { WORKSPACES, WorkspaceId } from '@/lib/navigation/navigationRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_VIEWS } from '@/components/vowos/Sidebar';
import { useDeviceMode } from '@/contexts/DeviceModeContext';
import { useModuleResolution } from '@/lib/modules/resolver';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { useDemo } from '@/lib/demo/demoContext';

interface MobileNavigationProps {
  view: WorkspaceId;
  onNavigate: (v: WorkspaceId) => void;
  onRequestSignIn: () => void;
}

const PRIMARY_WORKSPACES_BY_ROLE: Record<string, WorkspaceId[]> = {
  Owner: ['today', 'appointments', 'sales'],
  Manager: ['today', 'appointments', 'team'],
  BridalConsultant: ['today', 'appointments', 'customers'],
  AlterationsSpecialist: ['today', 'appointments', 'customers'],
};

const DEFAULT_PRIMARY_WORKSPACES: WorkspaceId[] = ['today', 'appointments', 'customers'];

export default function MobileNavigation({ view, onNavigate }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { profile } = useAuth();
  const { isDemoMode, activePersona, activeStore } = useDemo();
  const { isDesktopModeOverride, setDesktopModeOverride } = useDeviceMode();
  const { resolveFeatureAvailability } = useModuleResolution();
  const role = isDemoMode ? activePersona.role : (profile?.role ?? null);

  const checkAccess = (workspace: typeof WORKSPACES[0]): boolean => {
    if (PUBLIC_VIEWS.includes(workspace.id)) return true;

    if (workspace.moduleKey) {
      const resolution = resolveFeatureAvailability(workspace.moduleKey);
      if (!resolution.effective) return false;
    }

    if (workspace.isCoreWorkspace) {
      if (!role) return false;
      if (workspace.roles && !workspace.roles.includes(role as never)) return false;
      return true;
    }

    if (!role) return false;
    if (role === 'Owner') return true;
    if (workspace.roles && !workspace.roles.includes(role as never)) return false;
    return true;
  };

  const primaryKeys = role && PRIMARY_WORKSPACES_BY_ROLE[role]
    ? PRIMARY_WORKSPACES_BY_ROLE[role]
    : DEFAULT_PRIMARY_WORKSPACES;

  const bottomBarItems = useMemo(
    () => primaryKeys
      .map((key) => WORKSPACES.find((workspace) => workspace.id === key))
      .filter((workspace): workspace is (typeof WORKSPACES)[number] => Boolean(workspace && checkAccess(workspace))),
    // Module resolution and role changes naturally remount/re-render this shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role],
  );

  const remainingItems = WORKSPACES.filter(
    (workspace) => checkAccess(workspace) && !bottomBarItems.some((item) => item.id === workspace.id),
  );

  useEffect(() => {
    const handleOpenDrawer = () => {
      setAdvancedOpen(false);
      setMoreOpen(true);
    };
    window.addEventListener('vowos:open-mobile-drawer', handleOpenDrawer);
    return () => window.removeEventListener('vowos:open-mobile-drawer', handleOpenDrawer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const syncMobileClass = () => {
      document.body.classList.toggle('vowos-mobile-active', media.matches && !isDesktopModeOverride);
    };

    syncMobileClass();
    media.addEventListener('change', syncMobileClass);

    return () => {
      media.removeEventListener('change', syncMobileClass);
      document.body.classList.remove('vowos-mobile-active');
    };
  }, [isDesktopModeOverride]);

  useEffect(() => {
    if (!moreOpen) setAdvancedOpen(false);
  }, [moreOpen]);

  const navigate = (workspace: WorkspaceId) => {
    onNavigate(workspace);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Primary mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(28,25,23,0.08)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex h-[60px] max-w-lg items-stretch px-1">
          {bottomBarItems.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-tour-id={`mobile-tab-${item.id}`}
                aria-current={active ? 'page' : undefined}
                aria-label={item.sidebarLabel}
                onClick={() => navigate(item.id as WorkspaceId)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-colors active:bg-stone-100 ${
                  active ? 'text-brand-primary' : 'text-stone-500'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-primary' : 'text-stone-500'}`} />
                <span className="max-w-full truncate">{item.sidebarLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            data-tour-id="mobile-more-btn"
            aria-expanded={moreOpen}
            aria-label="More VowOS navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-colors active:bg-stone-100 ${
              moreOpen || !bottomBarItems.some((item) => item.id === view)
                ? 'text-brand-primary'
                : 'text-stone-500'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="VowOS mobile menu">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-stone-950/55 backdrop-blur-[1px]"
            onClick={() => setMoreOpen(false)}
            aria-label="Close menu"
          />

          <section
            className="absolute inset-x-0 max-h-[76dvh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-4 pt-3 shadow-2xl"
            style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200" />

            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-stone-900">More</p>
                <p className="truncate text-xs text-stone-500">
                  {isDemoMode ? `${activeStore.name} · Demo` : role ? `${role} workspace` : 'VowOS'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 active:bg-stone-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {remainingItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-tour-id={`mobile-nav-${item.id}`}
                    onClick={() => navigate(item.id as WorkspaceId)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors active:bg-stone-100 ${
                      active ? 'bg-rose-50 text-brand-primary' : 'text-stone-700'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white' : 'bg-stone-100'}`}>
                      <Icon className={`h-4.5 w-4.5 ${active ? 'text-brand-primary' : 'text-stone-500'}`} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.sidebarLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => setAdvancedOpen((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm font-medium text-stone-500 active:bg-stone-100"
                aria-expanded={advancedOpen}
              >
                <span>Advanced</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </button>

              {advancedOpen && (
                <div className="mt-2 space-y-3 rounded-2xl bg-stone-50 p-3">
                  <button
                    type="button"
                    onClick={() => setDesktopModeOverride(!isDesktopModeOverride)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-3 text-left text-sm font-medium text-stone-700 shadow-sm"
                  >
                    {isDesktopModeOverride ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    <span>{isDesktopModeOverride ? 'Return to mobile view' : 'Use desktop view'}</span>
                  </button>
                  <InstallAppButton fullWidth variant="secondary" />
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
