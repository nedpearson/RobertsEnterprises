import React, { useState, useEffect } from 'react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { useModuleResolution } from '@/lib/modules/resolver';
import { Gem, Lock, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth, ROLE_BADGE_CLASSES } from '@/contexts/AuthContext';
import { useDemo } from '@/lib/demo/demoContext';
import FeatureExplorerModal from '@/features/demo/FeatureExplorerModal';
import { Compass } from 'lucide-react';
import { WORKSPACES, WorkspaceId } from '@/lib/navigation/navigationRegistry';
import {
  getStoredCompactSidebar,
  setStoredCompactSidebar,
} from '@/lib/navigation/userPreferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';

export const PUBLIC_VIEWS: WorkspaceId[] = ['today', 'settings'];
export type ViewKey = WorkspaceId;

export const NAV_ITEMS = WORKSPACES.map((w) => ({
  key: w.id,
  label: w.sidebarLabel,
  icon: w.icon
}));

export const VIEW_ACCESS: Record<string, string[]> = {};
WORKSPACES.forEach((w) => {
  VIEW_ACCESS[w.id] = w.roles;
  w.children.forEach((c) => {
    VIEW_ACCESS[c.id] = c.roles || w.roles;
  });
});

export function canAccessView(role: string | null, view: string, staffId?: string | null, hiddenModules: string[] = []): boolean {
  if (hiddenModules.includes(view)) return false;
  if (PUBLIC_VIEWS.includes(view as WorkspaceId)) return true;
  if (!role) return false;
  if (role === 'Owner') return true;

  const allowedRoles = VIEW_ACCESS[view];
  if (!allowedRoles) return false;

  return allowedRoles.includes(role);
}

interface SidebarProps {
  view: WorkspaceId;
  onNavigate: (v: WorkspaceId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onRequestSignIn: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

export default function Sidebar({
  view,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  onRequestSignIn,
  isCompact: externalCompact,
  onToggleCompact,
}: SidebarProps) {
  const { session, profile, signOut } = useAuth();
  const role = session && profile ? profile.role : null;
  const { can } = useTenantEntitlements();

  const [compact, setCompact] = useState<boolean>(() => {
    if (externalCompact !== undefined) return externalCompact;
    return getStoredCompactSidebar();
  });

  useEffect(() => {
    if (externalCompact !== undefined) {
      setCompact(externalCompact);
    }
  }, [externalCompact]);

  const toggleCompactMode = () => {
    const next = !compact;
    setCompact(next);
    setStoredCompactSidebar(next);
    if (onToggleCompact) onToggleCompact();
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'G';

  const { isDemoMode, activePersona } = useDemo();
  const [exploreOpen, setExploreOpen] = React.useState(false);
  const effectiveRole = isDemoMode ? activePersona.role : role;

  // Filter children based on entitlements (not full visibility stack, just entitlements for now)
  const filterChildren = (children: typeof WORKSPACES[0]['children']) => {
    return children.filter(child => {
      if (!child.entitlementKey) return true;
      return can(child.entitlementKey) ?? false;
    });
  };

  const { resolveFeatureAvailability } = useModuleResolution();

  const checkAccess = (workspace: typeof WORKSPACES[0]): boolean => {
    // 1. If it's explicitly public, just let them see it
    if (PUBLIC_VIEWS.includes(workspace.id)) return true;

    // 2. Use the 4-layer resolution engine if it has a moduleKey
    if (workspace.moduleKey) {
      const resolution = resolveFeatureAvailability(workspace.moduleKey);
      if (!resolution.effective) return false;
    }

    // 3. Fallback role check (in case module engine missed something or it's a legacy check)
    if (workspace.isCoreWorkspace) {
      if (!effectiveRole) return false;
      if (workspace.roles && !workspace.roles.includes(effectiveRole as any)) return false;
      return true;
    }
    
    if (!effectiveRole) return false;
    if (effectiveRole === 'Owner') return true;
    if (workspace.roles && !workspace.roles.includes(effectiveRole as any)) return false;
    
    return true;
  };

  const visibleWorkspaces = WORKSPACES.filter(checkAccess);

  const mainWorkspaces = visibleWorkspaces.filter(w => w.id !== 'settings');
  const utilityWorkspaces = visibleWorkspaces.filter(w => w.id === 'settings');

  const renderWorkspaceLink = (workspace: typeof WORKSPACES[0]) => {
    const active = view === workspace.id;
    const Icon = workspace.icon;

    const buttonContent = (
      <button
        key={workspace.id}
        data-tour-id={`nav-${workspace.id}`}
        onClick={() => {
          onNavigate(workspace.id as WorkspaceId);
          onCloseMobile();
        }}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
          active
            ? 'bg-gradient-to-r from-rose-500/20 to-transparent text-rose-300 ring-1 ring-inset ring-rose-500/30 font-semibold'
            : 'text-stone-400 hover:bg-white/5 hover:text-white'
        } ${compact ? 'justify-center px-0 py-2.5' : ''}`}
      >
        <Icon
          className={`h-4 w-4 flex-shrink-0 ${
            active ? 'text-rose-400' : 'text-stone-400 group-hover:text-stone-200'
          }`}
        />
        {!compact && <span className="truncate">{workspace.sidebarLabel}</span>}
      </button>
    );

    if (compact) {
      return (
        <Tooltip key={workspace.id} delayDuration={100}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-stone-900 text-white font-medium border-stone-800 text-xs">
            {workspace.sidebarLabel}
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
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

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-stone-800">
        {mainWorkspaces.map(renderWorkspaceLink)}

        {utilityWorkspaces.length > 0 && (
          <>
            <div className="my-4 h-px bg-white/10" />
            {utilityWorkspaces.map(renderWorkspaceLink)}
          </>
        )}
      </nav>

      {/* Anchored Bottom Actions: Profile */}
      <div className="border-t border-white/10 p-3 space-y-2 bg-[#17151a]">
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
              onClick={() => onNavigate('platform-admin' as any)}
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
                      ROLE_BADGE_CLASSES[profile.role as any]
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
              className="mt-1 w-full rounded-lg bg-rose-500 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
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
        
      {/* Feature Explorer Modal */}
      <FeatureExplorerModal isOpen={exploreOpen} onClose={() => setExploreOpen(false)} />

    </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/60" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#1c1a1f] shadow-2xl">{sidebarContent}  
      {/* Feature Explorer Modal */}
      <FeatureExplorerModal isOpen={exploreOpen} onClose={() => setExploreOpen(false)} />

    </aside>
        </div>
      )}
    </TooltipProvider>
  );
}
