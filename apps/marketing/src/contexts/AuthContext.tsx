import { getActiveBusinessId } from '@/config/hostConfig';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, setActiveDataPlane, getActiveDataPlane } from '@/lib/supabase';
import { PlatformRole, OrganizationRole, normalizeOrganizationRole } from '@/lib/auth/roles';
import { EntitlementContext, resolveAccess } from '@/lib/entitlements/engine';

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

export function normalizeRole(role: string | null | undefined): StaffRole {
  return (STAFF_ROLES as string[]).includes(role ?? '') ? (role as StaffRole) : 'Stylist';
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
  settings?: Record<string, any>;
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


async function safe<T>(fn: () => Promise<{data: T | null, error: any}>, fallback: T): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn("Safe query caught error:", error);
      return fallback;
    }
    return data !== null ? data : fallback;
  } catch (err) {
    console.warn("Safe query caught exception:", err);
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [entitlementContext, setEntitlementContext] = useState<EntitlementContext | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportMode, setIsSupportMode] = useState(false);

  const loadProfile = async (userId: string, userEmail?: string, fallbackName?: string, fallbackRole?: string) => {
    try {
      const { data: isAdmin } = await supabase.rpc('is_super_admin');
      const pRole = isAdmin ? PlatformRole.PLATFORM_OWNER : PlatformRole.USER;

      // PART G / RESILIENT BOOTSTRAP.
      //
      // This was ONE query with three nested embeds. If any embed failed to
      // resolve, PostgREST returned 400 for the whole thing, data came back
      // null, tenant was set to null, and the ENTIRE workspace rendered blank -
      // which is exactly what happened in production when
      // organization_module_preferences was missing from the live database.
      //
      // Split into a required core query plus independent optional queries.
      // An optional query that fails degrades one feature, never the whole app.
      const { data: membershipRow, error: membershipError } = await supabase
        .from('business_memberships')
        .select('role, business_id')
        .eq('user_id', userId)
        .limit(50);

      if (membershipError) {
        console.error('[auth] membership query failed:', membershipError.message);
      }

      const rows = membershipRow || [];
      const preferredId = getActiveBusinessId();
      const chosen =
        rows.find((r: any) => r.business_id === preferredId) || rows[0] || null;

      let business: any = null;
      if (chosen?.business_id) {
        const { data: businessRow, error: businessError } = await supabase
          .from('businesses')
          .select('id, status, onboarding_status')
          .eq('id', chosen.business_id)
          .maybeSingle();
        if (businessError) {
          console.error('[auth] business query failed:', businessError.message);
        }
        business = businessRow || null;
      }

      const membership = chosen ? { role: chosen.role, businesses: business } : null;

      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('name, role')
        .eq('id', userId)
        .maybeSingle();

      const name = staffData?.name || fallbackName || 'User';
      const oRole = normalizeOrganizationRole(
        membership?.role || fallbackRole || (getActiveDataPlane() === 'demo' ? 'OWNER' : 'EMPLOYEE')
      );

      setUserContext({
        id: userId,
        email: userEmail || '',
        role: oRole,
        platform_role: pRole,
        name
      });

      if (membership && membership.businesses) {
        const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
        
        // Optional entitlement data. Each is fetched standalone and each
        // failure is survivable: a missing table or policy costs you one
        // feature flag, not the whole workspace.
        const [subRes, overrideRes, prefRes] = await Promise.all([
          supabase
            .from('organization_subscriptions')
            .select('plan_id')
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

        if (subRes.error) console.warn('[auth] subscription lookup degraded:', subRes.error.message);
        if (overrideRes.error) console.warn('[auth] feature overrides degraded:', overrideRes.error.message);
        if (prefRes.error) console.warn('[auth] module preferences degraded:', prefRes.error.message);

        const planId = subRes.data?.plan_id || 'starter';

        const overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'> = {};
        for (const ov of overrideRes.data || []) {
          if (ov?.feature_key && ov?.state) {
            overrides[ov.feature_key] = ov.state as 'FORCED_ON' | 'FORCED_OFF';
          }
        }

        const hiddenModules: string[] = [];
        for (const pref of prefRes.data || []) {
          if (pref?.module_id && pref.is_enabled === false) hiddenModules.push(pref.module_id);
        }

        setEntitlementContext({
          platformUserRole: pRole,
          organizationId: business.id,
          organizationPlan: planId,
          organizationFeatureOverrides: overrides,
          userOrganizationRole: oRole,
          hiddenModules
        });
        setTenant({
          id: business.id,
          status: business.status,
          onboarding_status: business.onboarding_status
        });
      } else {
        setEntitlementContext({
          platformUserRole: pRole,
          userOrganizationRole: oRole,
          organizationPlan: getActiveDataPlane() === 'demo' ? 'enterprise' : 'starter'
        });
        setTenant(null);
      }
    } catch (e) {
      console.error("Error loading entitlements:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.name,
          session.user.user_metadata?.role,
        );
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => {
          loadProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.name,
            session.user.user_metadata?.role,
          );
        }, 0);
      } else {
        setUserContext(null);
        setEntitlementContext(null);
        setTenant(null);
      }
    });

    return () => subscription.unsubscribe();
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
      const signUpRes = await supabase.auth.signUp({
        email: 'demo123@gmail.com',
        password: 'password123',
        options: { data: { name: 'Demo User', role: 'Owner' } }
      });
      error = signUpRes.error;
      
      if (!error && signUpRes.data?.user) {
        await supabase.from('staff_profiles').upsert({ id: signUpRes.data.user.id, name: 'Demo User', role: 'Owner' });
      }
    }
    
    return { error: error ? error.message : null };
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    setActiveDataPlane('production');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    setActiveDataPlane('production');
    
    const keysToKeep = ['theme', 'vite-ui-theme', 'compact-sidebar'];
    const itemsToKeep: Record<string, string> = {};
    for (const key of keysToKeep) {
      const val = localStorage.getItem(key);
      if (val !== null) itemsToKeep[key] = val;
    }
    localStorage.clear();
    for (const [key, val] of Object.entries(itemsToKeep)) {
      localStorage.setItem(key, val);
    }

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('supabase-rest-cache')) {
            await caches.delete(cacheName);
          }
        }
      } catch (err) {
        console.warn('Failed to clear cache during logout', err);
      }
    }

    await supabase.auth.signOut();
    setUserContext(null);
    setEntitlementContext(null);
    setTenant(null);
    window.location.reload();
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id, session.user.user_metadata?.name, session.user.user_metadata?.role);
    }
  };

  const enterSupportMode = async (tenantId: string) => {
    if (userContext?.platform_role !== PlatformRole.PLATFORM_OWNER && userContext?.platform_role !== PlatformRole.SUPER_ADMIN) {
      throw new Error("Unauthorized");
    }
    
    // Call the secure RPC to log the audit event and establish authorization
    const { error: rpcError } = await supabase.rpc('enter_support_mode', { target_org_id: tenantId });
    if (rpcError) {
      console.error("Failed to authorize support mode:", rpcError);
      throw new Error("Failed to authorize support mode");
    }

    setIsSupportMode(true);
    
    const { data: orgData, error: orgErr } = await supabase
      .from('businesses')
      .select('id, status, onboarding_status')
      .eq('id', tenantId)
      .maybeSingle();
      
    if (orgErr || !orgData) {
      console.error("Failed to load business for support mode", orgErr);
      return;
    }

    const planSub = await safe(() => supabase.from('organization_subscriptions').select('plan_id').eq('business_id', orgData.id).maybeSingle(), null);
    const overridesList = await safe(() => supabase.from('organization_feature_overrides').select('feature_key,state').eq('business_id', orgData.id), []);
    const modulePrefsList = await safe(() => supabase.from('organization_module_preferences').select('module_id,is_enabled').eq('business_id', orgData.id), []);

    const org = {
      ...orgData,
      organization_subscriptions: planSub,
      organization_feature_overrides: overridesList,
      organization_module_preferences: modulePrefsList
    };

    if (org) {
      let planId = 'starter';
      if (org.organization_subscriptions) {
        const sub = Array.isArray(org.organization_subscriptions) ? org.organization_subscriptions[0] : org.organization_subscriptions;
        if (sub && sub.plan_id) planId = sub.plan_id;
      }

      setTenant({
        id: org.id,
        name: `Support Mode [${tenantId.substring(0,6)}]`,
        status: org.status,
        onboarding_status: org.onboarding_status,
        plan_id: planId,
        settings: {}
      });

      const overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'> = {};
      if (org.organization_feature_overrides) {
        const orgOverrides = Array.isArray(org.organization_feature_overrides) 
          ? org.organization_feature_overrides 
          : [org.organization_feature_overrides];
        
        for (const ov of orgOverrides) {
          if (ov && ov.feature_key && ov.state) {
            overrides[ov.feature_key] = ov.state as 'FORCED_ON' | 'FORCED_OFF';
          }
        }
      }

      const hiddenModules: string[] = [];
      if (org.organization_module_preferences) {
        const prefs = Array.isArray(org.organization_module_preferences)
          ? org.organization_module_preferences
          : [org.organization_module_preferences];
        
        for (const pref of prefs) {
          if (pref && pref.module_id && pref.is_enabled === false) {
            hiddenModules.push(pref.module_id);
          }
        }
      }

      setEntitlementContext({
        platformUserRole: userContext.platform_role,
        organizationId: org.id,
        organizationPlan: planId,
        organizationFeatureOverrides: overrides,
        userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN, // In support mode, act as super admin
        hiddenModules
      });
      setTenant({
        id: org.id,
        status: org.status,
        onboarding_status: org.onboarding_status,
        name: `Support Mode [${tenantId.substring(0,6)}]`,
        plan_id: planId,
        settings: {}
      });

      // Log the support session
      await supabase.from('support_sessions').insert({
        platform_user_id: userContext.id,
        target_organization_id: tenantId,
        user_agent: navigator.userAgent
      });
    }
  };

  const exitSupportMode = async () => {
    // Close the active support session
    if (entitlementContext?.organizationId && userContext?.id) {
      await supabase.from('support_sessions')
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq('platform_user_id', userContext.id)
        .eq('target_organization_id', entitlementContext.organizationId)
        .eq('active', true);
    }
    
    setIsSupportMode(false);
    if (session?.user) {
      await loadProfile(session.user.id, session.user.user_metadata?.name, session.user.user_metadata?.role);
    }
  };

  const canAccess = (featureSlug: string) => {
    if (!entitlementContext) return false;
    return resolveAccess(featureSlug, entitlementContext);
  };

  const profile = userContext ? {
    id: userContext.id,
    name: userContext.name,
    role: (userContext.role === OrganizationRole.ORG_SUPER_ADMIN ? 'Owner' : userContext.role === OrganizationRole.ORG_ADMIN ? 'Manager' : 'Stylist') as StaffRole
  } : null;

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, userContext, profile, entitlementContext, tenant, loading, signIn, signInAsDemo, signUp, signOut, refreshProfile, isSupportMode, enterSupportMode, exitSupportMode, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



