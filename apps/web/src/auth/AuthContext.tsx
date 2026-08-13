import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setAuthToken, getAuthToken, setOnUnauthorized } from '../api/apiClient';

// ─── Types ───

export type UserRole = 'owner' | 'manager' | 'consultant';
export type UserStatus = 'active' | 'pending_approval' | 'suspended' | 'rejected';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  boutique_id: number;
  boutique_name?: string;
  is_demo?: boolean;
  subscription_tier?: 'essential' | 'growth' | 'enterprise';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  isOwner: boolean;
  isManager: boolean;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getAuthToken(),
    loading: true,
    error: null,
  });

  // Decode token payload to restore user on mount
  const restoreSession = useCallback(() => {
    const token = getAuthToken();
    if (!token) {
      setState({ user: null, token: null, loading: false, error: null });
      return;
    }

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        setAuthToken(null);
        setState({ user: null, token: null, loading: false, error: null });
        return;
      }

      const user: AuthUser = {
        id: payload.id || payload.userId,
        name: payload.name || 'User',
        email: payload.email || '',
        role: payload.role || 'consultant',
        status: payload.status || 'active',
        boutique_id: payload.boutique_id || 1,
        boutique_name: payload.boutique_name,
        is_demo: payload.is_demo || false,
        subscription_tier: payload.subscription_tier || 'essential',
      };

      setState({ user, token, loading: false, error: null });
    } catch {
      setAuthToken(null);
      setState({ user: null, token: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    restoreSession();
    
    // Set up auto-logout on 401
    setOnUnauthorized(() => {
      setState({ user: null, token: null, loading: false, error: 'Session expired' });
    });
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await api.publicPost<{ token: string }>('/api/login', { email, password });
      
      setAuthToken(data.token);
      
      // Decode user from token
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const user: AuthUser = {
        id: payload.id || payload.userId,
        name: payload.name || 'User',
        email: payload.email || email,
        role: payload.role || 'consultant',
        status: payload.status || 'active',
        boutique_id: payload.boutique_id || 1,
        boutique_name: payload.boutique_name,
        is_demo: false,
        subscription_tier: payload.subscription_tier || 'essential',
      };

      // Block pending/suspended users
      if (user.status === 'pending_approval') {
        setAuthToken(null);
        setState({ user: null, token: null, loading: false, error: 'Your account is pending approval by a manager.' });
        return;
      }
      if (user.status === 'suspended') {
        setAuthToken(null);
        setState({ user: null, token: null, loading: false, error: 'Your account has been suspended.' });
        return;
      }

      setState({ user, token: data.token, loading: false, error: null });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message || 'Login failed' }));
    }
  }, []);

  const demoLogin = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await api.publicPost<{ token: string }>('/api/demo-login');
      
      setAuthToken(data.token);
      
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const user: AuthUser = {
        id: payload.id || payload.userId,
        name: payload.name || 'Demo Owner',
        email: payload.email || 'demo@vowos.com',
        role: payload.role || 'owner',
        status: 'active',
        boutique_id: payload.boutique_id || 1,
        boutique_name: payload.boutique_name || 'Demo Boutique',
        is_demo: true,
        subscription_tier: payload.subscription_tier || 'enterprise',
      };

      setState({ user, token: data.token, loading: false, error: null });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message || 'Demo login failed' }));
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setState({ user: null, token: null, loading: false, error: null });
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    return state.user ? roles.includes(state.user.role) : false;
  }, [state.user]);

  const value: AuthContextValue = {
    ...state,
    login,
    demoLogin,
    logout,
    isOwner: state.user?.role === 'owner',
    isManager: state.user?.role === 'owner' || state.user?.role === 'manager',
    isAuthenticated: !!state.user && !!state.token,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
