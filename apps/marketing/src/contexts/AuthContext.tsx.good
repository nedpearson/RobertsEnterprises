import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, setActiveDataPlane } from '@/lib/supabase';
import { PlatformRole, OrganizationRole, normalizeOrganizationRole } from '@/lib/auth/roles';
import { EntitlementContext, resolveAccess } from '@/lib/entitlements/engine';

export interface UserContext {
  id: string;
  role: OrganizationRole;
  platform_role: PlatformRole;
  name: string;
}

export interface TenantContext {
  id: string;
  status: string;
  onboarding_status: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userContext: UserContext | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [entitlementContext, setEntitlementContext] = useState<EntitlementContext | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportMode, setIsSupportMode] = useState(false);

  const loadProfile = async (userId: string, userEmail?: string, fallbackName?: string, fallbackRole?: string) => {
    try {
      // 1. Fetch platform role
      const { data: platformUser } = await supabase
        .from('platform_users')
        .select('platform_role')
        .eq('auth_user_id', userId)
        .maybeSingle();
      
      const pRole = (platformUser?.platform_role as PlatformRole) || PlatformRole.USER;

      // 2. Fetch membership and tenant
      const { data: membership } = await supabase
        .from('business_memberships')
        .select(`
          role,
          businesses (
            id,
            status,
            onboarding_status,
            organization_subscriptions (
              plan_id
            ),
            organization_feature_overrides (
              feature_key,
              state
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      // Legacy fallback for name
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle();

      const name = staffData?.name || fallbackName || 'User';
      const oRole = normalizeOrganizationRole(membership?.role || fallbackRole || 'EMPLOYEE');

      setUserContext({
        id: userId,
        role: oRole,
        platform_role: pRole,
        name
      });

      if (membership && membership.businesses) {
        const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
        
        let planId = 'starter';
        if (business.organization_subscriptions) {
           const sub = Array.isArray(business.organization_subscriptions) ? business.organization_subscriptions[0] : business.organization_subscriptions;
           if (sub && sub.plan_id) planId = sub.plan_id;
        }

        const overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'> = {};
        if (business.organization_feature_overrides) {
          const orgOverrides = Array.isArray(business.organization_feature_overrides) 
            ? business.organization_feature_overrides 
            : [business.organization_feature_overrides];
          
          for (const ov of orgOverrides) {
            if (ov && ov.feature_key && ov.state) {
              overrides[ov.feature_key] = ov.state as 'FORCED_ON' | 'FORCED_OFF';
            }
          }
        }

        setEntitlementContext({
          platformUserRole: pRole,
          organizationId: business.id,
          organizationPlan: planId,
          organizationFeatureOverrides: overrides,
          userOrganizationRole: oRole
        });
        setTenant({
          id: business.id,
          status: business.status,
          onboarding_status: business.onboarding_status
        });
      } else {
        setEntitlementContext({
          platformUserRole: pRole,
          userOrganizationRole: oRole
        });
        setTenant(null);
      }
    } catch (e) {
      console.error("Error loading entitlements:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(
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
    
    const { data: org } = await supabase
      .from('organizations')
      .select('id, status, onboarding_status, organization_subscriptions(plan_id), organization_feature_overrides(feature_key, state)')
      .eq('id', tenantId)
      .single();

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

      setEntitlementContext({
        platformUserRole: userContext.platform_role,
        organizationId: business.id,
        organizationPlan: planId,
        organizationFeatureOverrides: overrides,
        userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN // In support mode, act as super admin
      });
      setTenant({
        id: business.id,
        status: business.status,
        onboarding_status: business.onboarding_status
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

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, userContext, entitlementContext, tenant, loading, signIn, signInAsDemo, signUp, signOut, refreshProfile, isSupportMode, enterSupportMode, exitSupportMode, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

