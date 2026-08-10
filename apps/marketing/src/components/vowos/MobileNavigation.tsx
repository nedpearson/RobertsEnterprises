import { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, Shirt, MoreHorizontal, X, ExternalLink, CalendarHeart, Lock, Monitor, Smartphone, ShieldCheck, SlidersHorizontal, BarChart3, Megaphone } from 'lucide-react';
import { NAVIGATION_ITEMS, NAVIGATION_SECTIONS, NavigationItem, ViewKey } from '@/lib/navigation/navigationRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessView } from '@/components/vowos/Sidebar';
import { useDeviceMode } from '@/contexts/DeviceModeContext';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';

interface MobileNavigationProps {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onRequestSignIn: () => void;
}

export default function MobileNavigation({ view, onNavigate, onRequestSignIn }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { session, profile } = useAuth();
  const { isDesktopModeOverride, setDesktopModeOverride } = useDeviceMode();
  const role = profile?.role ?? null;

  // Select top 4 items for bottom bar based on role
  let bottomBarKeys: ViewKey[] = [];
  if (role === 'Owner') {
    bottomBarKeys = ['overview', 'schedule', 'sales', 'reports'];
  } else if (role === 'Manager') {
    bottomBarKeys = ['dashboard', 'schedule', 'actions', 'sales'];
  } else {
    bottomBarKeys = ['dashboard', 'schedule', 'customers', 'marketing'];
  }

  const bottomBarItems = bottomBarKeys.map(k => NAVIGATION_ITEMS.find(i => i.id === k)).filter(Boolean) as NavigationItem[];

  return (
    <>
      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex items-center justify-around h-14 px-1">
          {bottomBarItems.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as ViewKey);
                  setMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-colors ${
                  active ? 'text-brand-primary font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-primary scale-105' : 'text-stone-500'}`} />
                <span className="truncate max-w-[64px] mt-0.5">{item.shortLabel || item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-colors ${
              moreOpen || (!bottomBarItems.some((i) => i.id === view) && view !== 'dashboard')
                ? 'text-brand-primary font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 ${moreOpen ? 'text-brand-primary' : 'text-stone-500'}`} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-14 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1c1a1f] p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <p className="font-serif text-lg text-white">VowOS Menu</p>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">The Boutique</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop Mode Toggle */}
            <div className="mb-6 rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    {isDesktopModeOverride ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    {isDesktopModeOverride ? 'Desktop View Active' : 'Mobile Experience Active'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1 max-w-[220px]">
                    {isDesktopModeOverride 
                      ? 'You are viewing the unoptimized desktop layout on mobile.'
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

            {/* Grouped Sections */}
            <div className="space-y-6 pb-6">
              {NAVIGATION_SECTIONS.map((sec) => {
                const itemsInSec = NAVIGATION_ITEMS.filter((i) => i.section === sec.id);
                if (itemsInSec.length === 0) return null;
                
                return (
                  <div key={sec.id} className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2">
                      {sec.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {itemsInSec.map((item) => {
                        const Icon = item.icon;
                        const active = view === item.id;
                        const locked = !canAccessView(role, item.id as ViewKey, profile?.id);

                        if (item.external) {
                          return (
                            <a
                              key={item.id}
                              href={item.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 rounded-xl border border-dashed border-brand-primary/30 p-2.5 text-xs font-medium text-rose-300 hover:bg-brand-primary/10"
                            >
                              <Icon className="h-4 w-4 text-brand-primary" />
                              <span className="truncate">{item.label}</span>
                              <ExternalLink className="ml-auto h-3 w-3 text-brand-primary/60" />
                            </a>
                          );
                        }

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as ViewKey);
                              setMoreOpen(false);
                            }}
                            className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-medium transition-all ${
                              active
                                ? 'bg-gradient-to-r from-rose-500/20 to-transparent text-rose-300 ring-1 ring-inset ring-focus-ring/30 font-semibold'
                                : 'text-stone-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${active ? 'text-brand-primary' : 'text-stone-400'}`} />
                            <span className="truncate">{item.label}</span>
                            {locked && <Lock className="ml-auto h-3 w-3 text-stone-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
