import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getActiveDataPlane } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ModulePreference {
  id: string;
  organization_id: string;
  module_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useModulePreferences() {
  const { tenant, loading: orgLoading } = useAuth();
  const queryClient = useQueryClient();
  const isDemo = getActiveDataPlane() === 'demo';

  const organization = tenant;

  const queryKey = ['organization_module_preferences', organization?.id];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (isDemo) {
        const stored = localStorage.getItem('vowos_demo_module_prefs');
        return stored ? JSON.parse(stored) : [];
      }
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('organization_module_preferences')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;
      return data as ModulePreference[];
    },
    enabled: !!organization?.id,
  });

  const mutation = useMutation({
    mutationFn: async ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) => {
      if (isDemo) {
        const stored = localStorage.getItem('vowos_demo_module_prefs');
        let prefs = stored ? JSON.parse(stored) as ModulePreference[] : [];
        const existing = prefs.find(p => p.module_id === moduleId);
        const newPref = {
          id: `demo-${moduleId}`,
          organization_id: organization?.id || 'demo-org',
          module_id: moduleId,
          is_enabled: isEnabled,
          created_at: existing ? existing.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (existing) {
          prefs = prefs.map(p => p.module_id === moduleId ? newPref : p);
        } else {
          prefs.push(newPref);
        }
        localStorage.setItem('vowos_demo_module_prefs', JSON.stringify(prefs));
        return newPref;
      }
      
      if (!organization?.id) throw new Error('No organization context');
      
      const { data, error } = await supabase
        .from('organization_module_preferences')
        .upsert(
          {
            organization_id: organization.id,
            module_id: moduleId,
            is_enabled: isEnabled,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'organization_id,module_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as ModulePreference;
    },
    onMutate: async ({ moduleId, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousPrefs = queryClient.getQueryData<ModulePreference[]>(queryKey);

      queryClient.setQueryData<ModulePreference[]>(queryKey, (old) => {
        if (!old) return old;
        const exists = old.find((p) => p.module_id === moduleId);
        if (exists) {
          return old.map((p) => (p.module_id === moduleId ? { ...p, is_enabled: isEnabled } : p));
        }
        return [
          ...old,
          {
            id: 'temp-id',
            organization_id: organization?.id || '',
            module_id: moduleId,
            is_enabled: isEnabled,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      });

      return { previousPrefs };
    },
    onError: (err, newPref, context) => {
      if (context?.previousPrefs) {
        queryClient.setQueryData(queryKey, context.previousPrefs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const getModulePreference = (moduleId: string): boolean | undefined => {
    if (!query.data) return undefined;
    const pref = query.data.find(p => p.module_id === moduleId);
    return pref ? pref.is_enabled : undefined;
  };

  return {
    preferences: query.data,
    isLoading: orgLoading || query.isLoading,
    error: query.error,
    updatePreference: mutation.mutate,
    updatePreferenceAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    getModulePreference
  };
}
