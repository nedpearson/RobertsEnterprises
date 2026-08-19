import { useState, useEffect } from 'react';
import { MoreHorizontal, X, ExternalLink, Lock, Monitor, Smartphone } from 'lucide-react';
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

export default function MobileNavigation({ view, onNavigate }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile } = useAuth();
  const { isDemoMode, activePersona, activeStore } = useDemo();
  const { isDesktopModeOverride, setDesktopModeOverride } = useDeviceMode();
  const role = isDemoMode ? activePersona.role : (profile?.role ?? null);

  let bottomBarKeys: WorkspaceId[] = [];
  if (role === 'Owner') {
    bottomBarKeys = ['today', 'appointments', 'sales', 'reports'];
  } else if (role === 'Manager') {
    bottomBarKeys = ['today', 'appointments', 'sales', 'team'];
  } else {
    bottomBarKeys = ['today', 'appointments', 'customers', 'growth'];
  }

  const bottomBarItems = bottomBarKeys.map(k => WORKSPACES.find(i => i.id === k)).filter(Boolean) as typeof WORKSPACES;

  useEffect(() => {
    const handleOpenDrawer = () => setMoreOpen(true);
    window.addEventListener('vowos:open-mobile-drawer', handleOpenDrawer);
    return () => window.removeEventListener('vowos:open-mobile-drawer', handleOpenDrawer);
  }, []);

  const { resolveFeatureAvailability } = useModuleResolution();

  const checkAccess = (workspace: typeof WORKSPACES[0]): boolean => {
    if (PUBLIC_VIEWS.includes(workspace.id)) return true;

    if (workspace.moduleKey) {
      const resolution = resolveFeatureAvailability(workspace.moduleKey);
      if (!resolution.effective) return false;
    }

    if (workspace.isCoreWorkspace) {
      if (!role) return false;
      if (workspace.roles && !workspace.roles.includes(role as any)) return false;
      return true;
    }
    if (!role) return false;
    if (role === 'Owner') return true;
    if (workspace.roles && !workspace.roles.includes(role as any)) return false;
    return true;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex items-center justify-around h-14 px-1">
          {bottomBarItems.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                data-tour-id={`mobile-tab-${item.id}`}
                onClick={() => {
                  onNavigate(item.id as WorkspaceId);
                  setMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-colors ${
                  active ? 'text-brand-primary font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-primary scale-105' : 'text-stone-500'}`} />
                <span className="truncate max-w-[64px] mt-0.5">{item.sidebarLabel}</span>
              </button>
            );
          })}

          <button
            data-tour-id="mobile-more-btn"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-colors ${
              moreOpen || (!bottomBarItems.some((i) => i.id === view) && view !== 'today')
                ? 'text-brand-primary font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 ${moreOpen ? 'text-brand-primary' : 'text-stone-500'}`} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-14 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1c1a1f] p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <p className="font-serif text-lg text-white">VowOS Menu</p>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">
                  {isDemoMode ? `${activeStore.name} · Demo` : 'Your Organization'}
                </p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    {isDesktopModeOverride ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    {isDesktopModeOverride ? 'Desktop View Active' : 'Mobile Experience Active'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1 max-w-[220px]">
                    {isDesktopModeOverride 
                      ? 'You are viewing the desktop layout on mobile.'
                      : 'You are using the optimized mobile command center.'}
                  </p>
                </div>
                <button
                  onClick={() => setDesktopModeOverride(!isDesktopModeOverride)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDesktopModeOverride ? 'bg-status-warning' : 'bg-stone-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDesktopModeOverride ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mb-6 px-1">
              <InstallAppButton fullWidth variant="secondary" />
            </div>

            <div className="space-y-6 pb-6">
              <div className="grid grid-cols-2 gap-2">
                {WORKSPACES.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  const locked = !checkAccess(item);

                  return (
                    <button
                      key={item.id}
                      data-tour-id={`mobile-nav-${item.id}`}
                      onClick={() => {
                        onNavigate(item.id as WorkspaceId);
                        setMoreOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-medium transition-all ${
                        active
                          ? 'bg-gradient-to-r from-rose-500/20 to-transparent text-rose-300 ring-1 ring-inset ring-focus-ring/30 font-semibold'
                          : 'text-stone-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-brand-primary' : 'text-stone-400'}`} />
                      <span className="truncate">{item.sidebarLabel}</span>
                      {locked && <Lock className="ml-auto h-3 w-3 text-stone-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
