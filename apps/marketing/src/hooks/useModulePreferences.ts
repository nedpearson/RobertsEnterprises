import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveDataPlane } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

export interface ModulePreference {
  id?: string;
  organization_id?: string;
  business_id?: string;
  module_id: string;
  is_enabled: boolean;
  created_at?: string;
  updated_at: string;
  updated_by?: string | null;
}

interface ModulePreferencesResponse {
  preferences: ModulePreference[];
  moduleKeys?: string[];
}

const DEMO_STORAGE_KEY = 'vowos_demo_module_prefs';

function loadDemoPreferences(): ModulePreference[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useModulePreferences() {
  const { tenant, loading: orgLoading } = useAuth();
  const queryClient = useQueryClient();
  const isDemo = getActiveDataPlane() === 'demo';
  const organization = tenant;
  const queryKey = ['organization_module_preferences', organization?.id, isDemo ? 'demo' : 'production'];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ModulePreference[]> => {
      if (isDemo) return loadDemoPreferences();
      if (!organization?.id) return [];
      const response = await vowosApi<ModulePreferencesResponse>('/api/organization/modules');
      return response.preferences ?? [];
    },
    enabled: !!organization?.id,
    staleTime: 15_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) => {
      if (isDemo) {
        const prefs = loadDemoPreferences();
        const now = new Date().toISOString();
        const existing = prefs.find((preference) => preference.module_id === moduleId);
        const nextPreference: ModulePreference = {
          ...existing,
          id: existing?.id || `demo-${moduleId}`,
          organization_id: organization?.id || 'demo-org',
          module_id: moduleId,
          is_enabled: isEnabled,
          created_at: existing?.created_at || now,
          updated_at: now,
        };
        const next = existing
          ? prefs.map((preference) => preference.module_id === moduleId ? nextPreference : preference)
          : [...prefs, nextPreference];
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
        return { preference: nextPreference, preferences: next };
      }

      if (!organization?.id) throw new Error('No organization context');
      return vowosApi<{ preference: ModulePreference; preferences: ModulePreference[] }>(
        `/api/organization/modules/${encodeURIComponent(moduleId)}`,
        { method: 'PUT', body: jsonBody({ enabled: isEnabled }) },
      );
    },
    onMutate: async ({ moduleId, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousPrefs = queryClient.getQueryData<ModulePreference[]>(queryKey);
      const now = new Date().toISOString();

      queryClient.setQueryData<ModulePreference[]>(queryKey, (old = []) => {
        const existing = old.find((preference) => preference.module_id === moduleId);
        if (existing) {
          return old.map((preference) => preference.module_id === moduleId
            ? { ...preference, is_enabled: isEnabled, updated_at: now }
            : preference);
        }
        return [...old, {
          id: `optimistic-${moduleId}`,
          organization_id: organization?.id,
          module_id: moduleId,
          is_enabled: isEnabled,
          created_at: now,
          updated_at: now,
        }];
      });

      return { previousPrefs };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ModulePreference[]>(queryKey, result.preferences);
    },
    onError: (_error, _newPreference, context) => {
      if (context?.previousPrefs) queryClient.setQueryData(queryKey, context.previousPrefs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const getModulePreference = (moduleId: string): boolean | undefined => {
    const pref = query.data?.find((preference) => preference.module_id === moduleId);
    return pref?.is_enabled;
  };

  return {
    preferences: query.data,
    isLoading: orgLoading || query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    updatePreference: mutation.mutate,
    updatePreferenceAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
    getModulePreference,
    refetch: query.refetch,
  };
}
