import { getActiveBusinessId, setActiveBusinessId } from '@/config/hostConfig';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, setActiveDataPlane, getActiveDataPlane } from '@/lib/supabase';
import { PlatformRole, OrganizationRole, normalizeOrganizationRole } from '@/lib/auth/roles';
import { type EntitlementContext, resolveAccess } from '@/lib/entitlements/engine';
import { normalizeLegacyRole, WorkspaceRole } from '@/lib/auth/authorization';
import { resolveActiveMembership, type MembershipCandidate } from '@/lib/auth/membershipResolution';

export type StaffRole = 'Owner' | 'Manager' | 'Stylist' | 'Front Desk' | 'Seamstress';

export const STAFF_ROLES: StaffRole[] = ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'];

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  Owner: 'Full access - financial ledgers, reports, and staff role management.',
  Manager: 'Runs the stores - everything except managing staff accounts.',
  Stylist: 'Brides, leads, appointments, gown inventory, and transfers.',
  'Front Desk': 'Front-of-house - brides, leads, and the appointment book.',
  Seamstress: 'Precision alterations and fitting management.',
};

export const ROLE_BADGE_CLASSES: Record<StaffRole, string> = {
  Owner: 'bg-rose-500/20 text-rose-500 ring-1 ring-inset ring-rose-500/30',
  Manager: 'bg-amber-500/20 text-amber-600 ring-1 ring-inset ring-amber-500/30',
  Stylist: 'bg-violet-500/20 text-violet-500 ring-1 ring-inset ring-violet-500/30',
  'Front Desk': 'bg-sky-500/20 text-sky-600 ring-1 ring-inset ring-sky-500/30',
  Seamstress: 'bg-emerald-500/20 text-emerald-600 ring-1 ring-inset ring-emerald-500/30',
};

export function normalizeRole(role: string | null | undefined): StaffRole | null {
  const canonical = normalizeLegacyRole(role);
  if (!canonical) return null;
  switch (canonical) {
    case WorkspaceRole.OWNER:
      return 'Owner';
    case WorkspaceRole.STORE_MANAGER:
      return 'Manager';
    case WorkspaceRole.BRIDAL_CONSULTANT:
      return 'Stylist';
    case WorkspaceRole.ALTERATIONS_SPECIALIST:
      return 'Seamstress';
    default:
      return null;
  }
}

function staffRoleFromWorkspaceRole(role: WorkspaceRole | null): StaffRole | null {
  return role ? normalizeRole(role) : null;
}

export interface StaffProfile {
  id: string;
  name: string;
  role: StaffRole;
}

export interface UserContext {
  id: string;
  email: string;
  name: string;
  role: OrganizationRole;
  platform_role: PlatformRole;
  avatar_url?: string;
}

export interface TenantContext {
  id: string;
  name?: string;
  status: string;
  onboarding_status: string;
  plan_id?: string;
  settings?: Record<string, unknown>;
}

export function getTenantDisplayName(tenant: TenantContext | null | undefined): string {
  return tenant?.name?.trim() || 'Your Organization';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userContext: UserContext | null;
  profile: StaffProfile | null;
  entitlementContext: EntitlementContext | null;
  tenant: TenantContext | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsDemo: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSupportMode: boolean;
  enterSupportMode: (tenantId: string) => Promise<void>;
  exitSupportMode: () => Promise<void>;
  canAccess: (featureSlug: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeSubscriptionStatus(value: unknown): EntitlementContext['subscriptionStatus'] {
  const normalized = String(value ?? 'ACTIVE').trim().toUpperCase();
  if (normalized === 'TRIAL') return 'TRIALING';
  if (normalized === 'ACTIVE' || normalized === 'TRIALING' || normalized === 'PAST_DUE' || normalized === 'CANCELED' || normalized === 'COMPED') {
    return normalized;
  }
  return 'ACTIVE';
}

function normalizeMembershipStatus(value: unknown): EntitlementContext['userStatus'] {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'ACTIVE') return 'ACTIVE';
  if (normalized === 'SUSPENDED') return 'SUSPENDED';
  return 'PENDING_VERIFICATION';
}

async function safe<T>(fn: () => Promise<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn('Safe query caught error:', error);
      return fallback;
    }
    return data !== null ? data : fallback;
  } catch (error) {
    console.warn('Safe query caught exception:', error);
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [entitlementContext, setEntitlementContext] = useState<EntitlementContext | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportMode, setIsSupportMode] = useState(false);

  const clearTenantState = () => {
    setStaffRole(null);
    setEntitlementContext(null);
    setTenant(null);
  };

  const loadProfile = async (
    userId: string,
    userEmail?: string,
    fallbackName?: string,
    fallbackRole?: string,
  ) => {
    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_super_admin');
      if (adminError) console.warn('[auth] platform-role lookup degraded:', adminError.message);
      const platformRole = isAdmin ? PlatformRole.PLATFORM_OWNER : PlatformRole.USER;
      const dataPlane = getActiveDataPlane();

      const { data: membershipRows, error: membershipError } = await supabase
        .from('business_memberships')
        .select('role, business_id, status')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(50);

      if (membershipError) {
        console.error('[auth] membership query failed:', membershipError.message);
      }

      const preferredBusinessId = getActiveBusinessId();
      const resolution = resolveActiveMembership(
        (membershipError ? [] : (membershipRows ?? [])) as MembershipCandidate[],
        preferredBusinessId,
      );

      if (resolution.reason === 'PREFERRED_NOT_AUTHORIZED') {
        // Never silently fall through from a stale tenant selection to a different
        // organization. Clear it so the login/workspace selector can ask again.
        setActiveBusinessId(null);
      }

      let business: {
        id: string;
        name?: string | null;
        display_name?: string | null;
        status: string;
        onboarding_status: string;
      } | null = null;

      if (resolution.membership?.business_id) {
        const { data: businessRow, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, display_name, status, onboarding_status')
          .eq('id', resolution.membership.business_id)
          .maybeSingle();

        if (businessError) {
          console.error('[auth] business query failed:', businessError.message);
        } else {
          business = businessRow as typeof business;
        }
      }

      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle();

      const name = staffData?.name || fallbackName || 'User';
      const demoWorkspaceRole = dataPlane === 'demo'
        ? normalizeLegacyRole(fallbackRole) ?? WorkspaceRole.OWNER
        : null;
      const workspaceRole = business ? resolution.workspaceRole : demoWorkspaceRole;
      const organizationRole = workspaceRole
        ? normalizeOrganizationRole(workspaceRole)
        : OrganizationRole.OTHER_AUTHORIZED_ROLE;
      const userStatus = business
        ? normalizeMembershipStatus(resolution.membership?.status)
        : dataPlane === 'demo'
          ? 'ACTIVE'
          : 'PENDING_VERIFICATION';

      setUserContext({
        id: userId,
        email: userEmail || '',
        role: organizationRole,
        platform_role: platformRole,
        name,
      });
      setStaffRole(staffRoleFromWorkspaceRole(workspaceRole));

      if (business && resolution.membership) {
        const [subscriptionResult, overrideResult, preferenceResult] = await Promise.all([
          supabase
            .from('organization_subscriptions')
            .select('plan_id, status')
            .eq('business_id', business.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('organization_feature_overrides')
            .select('feature_key, state')
            .eq('business_id', business.id),
          supabase
            .from('organization_module_preferences')
            .select('module_id, is_enabled')
            .eq('business_id', business.id),
        ]);

        if (subscriptionResult.error) console.warn('[auth] subscription lookup degraded:', subscriptionResult.error.message);
        if (overrideResult.error) console.warn('[auth] feature overrides degraded:', overrideResult.error.message);
        if (preferenceResult.error) console.warn('[auth] module preferences degraded:', preferenceResult.error.message);

        const planId = subscriptionResult.data?.plan_id || 'essentials';
        const subscriptionStatus = normalizeSubscriptionStatus(subscriptionResult.data?.status);
        const overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'> = {};
        for (const override of overrideResult.data || []) {
          if (override?.feature_key && override?.state) {
            overrides[override.feature_key] = override.state as 'FORCED_ON' | 'FORCED_OFF';
          }
        }

        const hiddenModules: string[] = [];
        for (const preference of preferenceResult.data || []) {
          if (preference?.module_id && preference.is_enabled === false) hiddenModules.push(preference.module_id);
        }

        setEntitlementContext({
          platformUserRole: platformRole,
          organizationId: business.id,
          organizationPlan: planId,
          organizationFeatureOverrides: overrides,
          userOrganizationRole: organizationRole,
          userStatus,
          subscriptionStatus,
          hiddenModules,
        });
        setTenant({
          id: business.id,
          name: business.display_name || business.name || undefined,
          status: business.status,
          onboarding_status: business.onboarding_status,
          plan_id: planId,
        });
        return;
      }

      if (dataPlane === 'demo') {
        // Demo is the only surface allowed to synthesize authorization context.
        setEntitlementContext({
          platformUserRole: platformRole,
          organizationId: 'demo-sandbox',
          organizationPlan: 'enterprise',
          userOrganizationRole: organizationRole,
          userStatus: 'ACTIVE',
          subscriptionStatus: 'COMPED',
          hiddenModules: [],
        });
        setTenant(null);
        return;
      }

      // Signed-in production user with no unambiguous active membership remains
      // authenticated but receives zero tenant access.
      setEntitlementContext({
        platformUserRole: platformRole,
        userOrganizationRole: OrganizationRole.OTHER_AUTHORIZED_ROLE,
        userStatus: 'PENDING_VERIFICATION',
        subscriptionStatus: 'CANCELED',
      });
      setTenant(null);
      setStaffRole(null);
    } catch (error) {
      console.error('Error loading authorization context:', error);
      setUserContext(null);
      clearTenantState();
    }
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session: currentSession } }) => {
        setSession(currentSession);
        if (currentSession?.user) {
          await loadProfile(
            currentSession.user.id,
            currentSession.user.email,
            currentSession.user.user_metadata?.name,
            currentSession.user.user_metadata?.role,
          );
        }
      })
      .catch((error) => {
        console.error('[auth] getSession error:', error);
        clearTenantState();
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        setTimeout(() => {
          void loadProfile(
            nextSession.user.id,
            nextSession.user.email,
            nextSession.user.user_metadata?.name,
            nextSession.user.user_metadata?.role,
          );
        }, 0);
      } else {
        setUserContext(null);
        clearTenantState();
      }
    });

    return () => subscription.unsubscribe();
  // Supabase auth subscription is intentionally established once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    setActiveDataPlane('production');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signInAsDemo = async () => {
    setActiveDataPlane('demo');
    let { error } = await supabase.auth.signInWithPassword({ email: 'demo123@gmail.com', password: 'password123' });

    if (error && error.message.includes('Invalid login credentials')) {
      const signUpResult = await supabase.auth.signUp({
        email: 'demo123@gmail.com',
        password: 'password123',
        options: { data: { name: 'Demo User', role: 'Owner' } },
      });
      error = signUpResult.error;

      if (!error && signUpResult.data?.user) {
        await supabase.from('staff_profiles').upsert({ id: signUpResult.data.user.id, name: 'Demo User', role: 'Owner' });
      }
    }

    return { error: error ? error.message : null };
  };

  const signUp = async (email: string, password: string, name: string, _role: string) => {
    setActiveDataPlane('production');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, provision_default_tenant: true } },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    setActiveDataPlane('production');
    setActiveBusinessId(null);

    const keysToKeep = ['theme', 'vite-ui-theme', 'compact-sidebar'];
    const itemsToKeep: Record<string, string> = {};
    for (const key of keysToKeep) {
      const value = localStorage.getItem(key);
      if (value !== null) itemsToKeep[key] = value;
    }
    localStorage.clear();
    for (const [key, value] of Object.entries(itemsToKeep)) localStorage.setItem(key, value);

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('supabase-rest-cache')) await caches.delete(cacheName);
        }
      } catch (error) {
        console.warn('Failed to clear cache during logout', error);
      }
    }

    await supabase.auth.signOut();
    setUserContext(null);
    clearTenantState();
    window.location.reload();
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(
        session.user.id,
        session.user.email,
        session.user.user_metadata?.name,
        session.user.user_metadata?.role,
      );
    }
  };

  const enterSupportMode = async (tenantId: string) => {
    if (userContext?.platform_role !== PlatformRole.PLATFORM_OWNER && userContext?.platform_role !== PlatformRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }

    const { error: rpcError } = await supabase.rpc('enter_support_mode', { target_org_id: tenantId });
    if (rpcError) {
      console.error('Failed to authorize support mode:', rpcError);
      throw new Error('Failed to authorize support mode');
    }

    const { data: organizationData, error: organizationError } = await supabase
      .from('businesses')
      .select('id, status, onboarding_status')
      .eq('id', tenantId)
      .maybeSingle();

    if (organizationError || !organizationData) {
      console.error('Failed to load business for support mode', organizationError);
      throw new Error('Support tenant could not be resolved');
    }

    const planSubscription = await safe(
      async () => await supabase.from('organization_subscriptions').select('plan_id,status').eq('business_id', organizationData.id).maybeSingle(),
      null,
    );
    const overridesList = await safe(
      async () => await supabase.from('organization_feature_overrides').select('feature_key,state').eq('business_id', organizationData.id),
      [],
    );
    const modulePreferences = await safe(
      async () => await supabase.from('organization_module_preferences').select('module_id,is_enabled').eq('business_id', organizationData.id),
      [],
    );

    const planId = planSubscription?.plan_id || 'essentials';
    const subscriptionStatus = normalizeSubscriptionStatus(planSubscription?.status);
    const overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'> = {};
    for (const override of overridesList || []) {
      if (override?.feature_key && override?.state) {
        overrides[override.feature_key] = override.state as 'FORCED_ON' | 'FORCED_OFF';
      }
    }
    const hiddenModules = (modulePreferences || [])
      .filter((preference) => preference?.module_id && preference.is_enabled === false)
      .map((preference) => preference.module_id as string);

    setIsSupportMode(true);
    setStaffRole('Owner');
    setTenant({
      id: organizationData.id,
      name: `Support Mode [${tenantId.substring(0, 6)}]`,
      status: organizationData.status,
      onboarding_status: organizationData.onboarding_status,
      plan_id: planId,
      settings: {},
    });
    setEntitlementContext({
      platformUserRole: userContext.platform_role,
      organizationId: organizationData.id,
      organizationPlan: planId,
      organizationFeatureOverrides: overrides,
      userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN,
      userStatus: 'ACTIVE',
      subscriptionStatus,
      hiddenModules,
    });

    await supabase.from('support_sessions').insert({
      platform_user_id: userContext.id,
      target_organization_id: tenantId,
      user_agent: navigator.userAgent,
    });
  };

  const exitSupportMode = async () => {
    if (entitlementContext?.organizationId && userContext?.id) {
      await supabase.from('support_sessions')
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq('platform_user_id', userContext.id)
        .eq('target_organization_id', entitlementContext.organizationId)
        .eq('active', true);
    }

    setIsSupportMode(false);
    if (session?.user) {
      await loadProfile(
        session.user.id,
        session.user.email,
        session.user.user_metadata?.name,
        session.user.user_metadata?.role,
      );
    } else {
      clearTenantState();
    }
  };

  const canAccess = (featureSlug: string) => {
    if (!entitlementContext) return false;
    return resolveAccess(featureSlug, entitlementContext);
  };

  const profile: StaffProfile | null = userContext && staffRole
    ? { id: userContext.id, name: userContext.name, role: staffRole }
    : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userContext,
        profile,
        entitlementContext,
        tenant,
        loading,
        signIn,
        signInAsDemo,
        signUp,
        signOut,
        refreshProfile,
        isSupportMode,
        enterSupportMode,
        exitSupportMode,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
