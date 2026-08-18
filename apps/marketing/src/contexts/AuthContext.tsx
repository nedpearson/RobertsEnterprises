import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, setActiveDataPlane } from '@/lib/supabase';

export type StaffRole = 'Owner' | 'Manager' | 'Stylist' | 'Front Desk' | 'Seamstress';

export const STAFF_ROLES: StaffRole[] = ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'];

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  Owner: 'Full access — financial ledgers, reports, and staff role management.',
  Manager: 'Runs the stores — everything except managing staff accounts.',
  Stylist: 'Brides, leads, appointments, gown inventory, and transfers.',
  'Front Desk': 'Front-of-house — brides, leads, and the appointment book.',
};

export const ROLE_BADGE_CLASSES: Record<StaffRole, string> = {
  Owner: 'bg-rose-500/20 text-rose-500 ring-1 ring-inset ring-rose-500/30',
  Manager: 'bg-amber-500/20 text-amber-600 ring-1 ring-inset ring-amber-500/30',
  Stylist: 'bg-violet-500/20 text-violet-500 ring-1 ring-inset ring-violet-500/30',
  'Front Desk': 'bg-sky-500/20 text-sky-600 ring-1 ring-inset ring-sky-500/30',
  Seamstress: 'bg-emerald-500/20 text-emerald-600 ring-1 ring-inset ring-emerald-500/30',
};

/** Normalize any stored role string into a supported StaffRole. */
export function normalizeRole(role: string | null | undefined): StaffRole {
  return (STAFF_ROLES as string[]).includes(role ?? '') ? (role as StaffRole) : 'Stylist';
}

export interface StaffProfile {
  id: string;
  name: string;
  role: StaffRole;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsDemo: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Re-read the signed-in user's profile (e.g. after an owner changes their role). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, fallbackName?: string, fallbackRole?: string) => {
    const { data } = await supabase
      .from('staff_profiles')
      .select('id, name, role')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setProfile({ id: data.id, name: data.name, role: normalizeRole(data.role) });
    } else {
      // Profile trigger may not have fired yet — fall back to auth metadata
      setProfile({
        id: userId,
        name: fallbackName || 'Staff Member',
        role: normalizeRole(fallbackRole),
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(
          session.user.id,
          session.user.user_metadata?.name,
          session.user.user_metadata?.role,
        );
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Defer Supabase calls out of the auth callback to avoid deadlocks
        setTimeout(() => {
          loadProfile(
            session.user.id,
            session.user.user_metadata?.name,
            session.user.user_metadata?.role,
          );
        }, 0);
      } else {
        setProfile(null);
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
    // Using a known test password for the demo account
    let { error } = await supabase.auth.signInWithPassword({ email: 'demo123@gmail.com', password: 'password123' });
    
    // Auto-create the demo user if it doesn't exist on this environment yet
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

  const signUp = async (email: string, password: string, name: string) => {
    setActiveDataPlane('production');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (!error) {
      // The signup trigger may predate the expanded role set — make sure the
      // chosen role is persisted on the profile row.
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from('staff_profiles').upsert({ id: data.user.id, name, role });
      }
    }
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    setActiveDataPlane('production');
    
    // Clear user-scoped local state and sensitive client caches on logout
    // keeping public preferences and offline assets intact.
    const keysToKeep = [
      'theme', 
      'vite-ui-theme', 
      'compact-sidebar', 
      'vowos_mobile_install_dismissed_v2'
    ];
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
        console.error('Failed to clear sensitive caches:', err);
      }
    }

    await supabase.auth.signOut();
    setProfile(null);
    window.location.reload();
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id, session.user.user_metadata?.name, session.user.user_metadata?.role);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signIn, signInAsDemo, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


