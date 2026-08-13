import React, { useState, useEffect } from 'react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { Gem, ChevronDown, ChevronRight, Lock, LogOut, ExternalLink, SlidersHorizontal, PanelLeftClose, PanelLeftOpen, Copy, Check, Eye, CalendarHeart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
;
import { OrganizationRole, ROLE_BADGE_CLASSES } from '@/lib/auth/roles';;
import { useVowosData } from '@/contexts/VowosDataContext';
import {
  NAVIGATION_SECTIONS,
  NAVIGATION_ITEMS,
  NavigationSectionId,
  ViewKey,
  NavigationItem
} from '@/lib/navigation/navigationRegistry';
import {
  getStoredCompactSidebar,
  setStoredCompactSidebar,
  getStoredExpandedSections,
  setStoredExpandedSections
} from '@/lib/navigation/userPreferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@vowos/design-system';
import { toast } from '@vowos/design-system';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { SetupWidget } from './SetupWidget';

export const PUBLIC_VIEWS: ViewKey[] = ['dashboard', 'training', 'bride-portal', 'demo' as ViewKey, 'app' as ViewKey];

export const NAV_ITEMS = NAVIGATION_ITEMS.map((item) => ({
  key: item.id as ViewKey,
  label: item.label,
  icon: item.icon,
}));

export const VIEW_ACCESS: Record<ViewKey, OrganizationRole[]> = {
  dashboard: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  overview: ['Owner'],
  actions: ['Owner', 'Manager'],
  schedule: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  appointments: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  operations: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  sales: ['Owner', 'Manager'],
  customers: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  leads: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  inventory: ['Owner', 'Manager', 'Stylist'],
  transfers: ['Owner', 'Manager', 'Stylist'],
  timeclock: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  communications: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  contracts: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  alterations: ['Owner', 'Manager', 'Stylist'],
  invoices: ['Owner', 'Manager', 'Front Desk'],
  purchases: ['Owner', 'Manager'],
  reports: ['Owner', 'Manager'],
  ledgers: ['Owner', 'Manager'],
  staff: ['Owner'],
  schedules: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  settings: ['Owner', 'Manager'],
  payroll: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  training: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  onlinestore: ['Owner', 'Manager'],
  marketing: ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  'bride-portal': ['Owner', 'Manager', 'Stylist', 'Front Desk'],
  'fitting-room': ['Owner', 'Manager', 'Stylist', 'Front Desk'],
};

export function canAccessView(role: OrganizationRole | null, view: ViewKey, staffId?: string | null): boolean {
  if (PUBLIC_VIEWS.includes(view)) return true;
  if (!role) return false;
  if (role === 'Owner') return true;

  if (staffId && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem('vowos_user_permissions');
      if (cached) {
        const map = JSON.parse(cached);
        if (map && map[staffId] !== undefined) {
          const perm = map[staffId];
          if (Array.isArray(perm)) {
            return perm.includes(view);
          }
          if (typeof perm === 'object' && perm !== null) {
            return !!perm[view];
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  return VIEW_ACCESS[view]?.includes(role) ?? false;
}

interface SidebarProps {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onRequestSignIn: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  onOpenOnboarding?: () => void;
}

export default function Sidebar({
  view,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  onRequestSignIn,
  isCompact: externalCompact,
  onToggleCompact,
  onOpenOnboarding,
}: SidebarProps) {
  const { session, profile, signOut } = useAuth();
  const { activeLocation } = useVowosData();
  const role: OrganizationRole | null = session && profile ? profile.role : null;
  const { can } = useTenantEntitlements();
  
  // TODO: Fetch actual business onboarding status from database
  const [onboardingStatus, setOnboardingStatus] = useState('PENDING');
  const [setupProgress, setSetupProgress] = useState(25);

  const [compact, setCompact] = useState<boolean>(() => {
    if (externalCompact !== undefined) return externalCompact;
    return getStoredCompactSidebar();
  });

  const [expandedSections, setExpandedSections] = useState<Record<NavigationSectionId, boolean>>(
    () => getStoredExpandedSections()
  );

  const [bookingMenuOpen, setBookingMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync external compact prop
  useEffect(() => {
    if (externalCompact !== undefined) {
      setCompact(externalCompact);
    }
  }, [externalCompact]);

  // Ensure active section is automatically expanded
  useEffect(() => {
    const activeItem = NAVIGATION_ITEMS.find((item) => item.id === view);
    if (activeItem && activeItem.section) {
      setExpandedSections((prev) => {
        if (!prev[activeItem.section]) {
          const next = { ...prev, [activeItem.section]: true };
          setStoredExpandedSections(next);
          return next;
        }
        return prev;
      });
    }
  }, [view]);

  const toggleCompactMode = () => {
    const next = !compact;
    setCompact(next);
    setStoredCompactSidebar(next);
    if (onToggleCompact) onToggleCompact();
  };

  const toggleSection = (sectionId: NavigationSectionId) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      setStoredExpandedSections(next);
      return next;
    });
  };

  const copyBookingLink = async () => {
    try {
      const url = `${window.location.origin}/book`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({ title: 'Booking link copied to clipboard', description: url });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Failed to copy booking link', variant: 'destructive' });
    }
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'G';

  const checkAccess = (item: NavigationItem): boolean => {
    if (item.id === 'onlinestore') {
      if (activeLocation !== 'pc-br' && activeLocation !== 'pc-cov') return false;
    }
    if (item.id === 'training' || item.id === 'dashboard') return true;
    if (item.requiredFeature && !can(item.requiredFeature)) return false;
    
    if (!role) return false;
    if (role === 'Owner') return true;
    return item.allowedRoles.includes(role);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#1c1a1f] text-stone-300 select-none">
      {/* Header / Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-900/30 flex-shrink-0">
            <Gem className="h-5 w-5 text-white" />
          </div>
          {!compact && (
            <div>
              <p className="font-serif text-lg leading-tight text-white font-bold">VowOS</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-medium">The Boutique</p>
            </div>
          )}
        </div>

        {/* Compact Toggle Button (Desktop) */}
        <button
          onClick={toggleCompactMode}
          className="hidden lg:flex items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
          title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {onboardingStatus === 'PENDING' && (
        <SetupWidget 
          progress={setupProgress} 
          compact={compact} 
          onContinue={() => {
            if (onOpenOnboarding) {
              onOpenOnboarding();
            } else {
              onNavigate('settings');
            }
          }} 
        />
      )}

      {/* Grouped Navigation Sections */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-stone-800">
        {NAVIGATION_SECTIONS.map((section) => {
          if (section.id === 'external') return null; // Rendered anchored at bottom

          const items = NAVIGATION_ITEMS.filter((item) => item.section === section.id);
          const isExpanded = expandedSections[section.id] !== false;
          const hasActiveItem = items.some((i) => i.id === view);

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header (when not compact) */}
              {!compact ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-stone-500 uppercase hover:text-stone-300 transition-colors ${
                    hasActiveItem ? 'text-brand-primary/90' : ''
                  }`}
                >
                  <span>{section.label}</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              ) : (
                <div className="h-px bg-white/5 my-2" />
              )}

              {/* Section Items */}
              {(isExpanded || compact) && (
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = view === item.id;
                    const locked = !checkAccess(item);
                    const Icon = item.icon;

                    if (item.id === 'staff' && role && role !== 'Owner') return null;
                    
                    // Actually hide the item if they don't have entitlement, so they don't see it locked if it's completely inaccessible
                    // Wait, do we want to show it locked or hide it? The user requested: "Automatically hide left-nav items if the tenant lacks the required feature key."
                    if (item.requiredFeature && !can(item.requiredFeature)) return null;

                    const buttonContent = (
                      <button
                        key={item.id}
                        data-tour-id={`nav-${item.id}`}
                        onClick={() => {
                          onNavigate(item.id as ViewKey);
                          onCloseMobile();
                        }}
                        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'bg-gradient-to-r from-rose-500/20 to-transparent text-rose-300 ring-1 ring-inset ring-focus-ring/30 font-semibold'
                            : 'text-stone-400 hover:bg-white/5 hover:text-white'
                        } ${compact ? 'justify-center px-0 py-2.5' : ''}`}
                      >
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            active ? 'text-brand-primary' : 'text-stone-400 group-hover:text-stone-200'
                          }`}
                        />
                        {!compact && <span className="truncate">{item.label}</span>}
                        {!compact && locked && <Lock className="ml-auto h-3.5 w-3.5 text-stone-600" />}
                      </button>
                    );

                    if (compact) {
                      return (
                        <Tooltip key={item.id} delayDuration={100}>
                          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                          <TooltipContent side="right" className="bg-stone-900 text-white font-medium border-stone-800 text-xs">
                            {item.label} {locked ? '(Staff Only)' : ''}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return buttonContent;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Anchored Bottom Actions: Booking Page & Profile */}
      <div className="border-t border-white/10 p-3 space-y-2 bg-[#17151a]">
        {/* Booking Page Control */}
        <div className="relative">
          <button
            onClick={() => setBookingMenuOpen(!bookingMenuOpen)}
            className={`group flex w-full items-center gap-2.5 rounded-xl border border-dashed border-brand-primary/30 bg-brand-primary/5 px-3 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-brand-primary/10 ${
              compact ? 'justify-center px-0' : ''
            }`}
            title="View Online Booking Page"
          >
            <CalendarHeart className="h-4 w-4 text-brand-primary flex-shrink-0" />
            {!compact && <span className="truncate">View Online Booking Page</span>}
            {!compact && <ExternalLink className="ml-auto h-3 w-3 text-brand-primary/60" />}
          </button>

          {/* Sub-menu actions popup */}
          {bookingMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-stone-900 border border-stone-800 p-1.5 shadow-2xl space-y-1 text-xs text-stone-300 z-50">
              <a
                href="/book"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setBookingMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/10 text-white transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-brand-primary" />
                <span>Open Booking Page</span>
              </a>
              <button
                onClick={copyBookingLink}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-stone-400" />}
                <span>Copy Booking Link</span>
              </button>
              {(role === 'Owner' || role === 'Manager') && (
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setBookingMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-stone-400" />
                  <span>Booking Settings</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* PWA Install Button (if applicable) */}
        {!compact && (
          <div className="pt-2">
            <InstallAppButton fullWidth variant="secondary" size="sm" className="bg-white/5 border-white/10 text-stone-300 hover:bg-white/10 hover:text-white" />
          </div>
        )}
        
        {/* Platform Admin Link */}
        {role === 'Owner' && (
          <div className="pt-2">
            <button
              onClick={() => onNavigate('platform-admin' as ViewKey)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-stone-400" />
              {!compact && <span className="text-xs font-semibold">Platform Admin</span>}
            </button>
          </div>
        )}

        {/* Profile Card */}
        {session && profile ? (
          <div className={`rounded-xl bg-white/5 p-2.5 ${compact ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-xs font-semibold text-white">
                {initials}
              </div>
              {!compact && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{profile.name}</p>
                  <span
                    className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                      ROLE_BADGE_CLASSES[profile.role]
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>
              )}
              {!compact && (
                <button
                  onClick={() => signOut()}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 p-2 text-center">
            {!compact && <p className="text-xs font-medium text-stone-300">Guest Mode</p>}
            <button
              onClick={() => {
                onCloseMobile();
                onRequestSignIn();
              }}
              className="mt-1 w-full rounded-lg bg-brand-primary py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
            >
              Staff Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden bg-[#1c1a1f] lg:block transition-all duration-200 ${
          compact ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/60" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#1c1a1f] shadow-2xl">{sidebarContent}</aside>
        </div>
      )}
    </TooltipProvider>
  );
}
