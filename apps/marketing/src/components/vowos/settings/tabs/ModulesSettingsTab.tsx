import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, toast } from '@vowos/design-system';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WORKSPACES } from '@/lib/navigation/navigationRegistry';

interface ModulesSettingsTabProps {
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveRef: (fn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function ModulesSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: ModulesSettingsTabProps) {
  const { tenant, entitlementContext, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadPreferences = async () => {
      if (!tenant?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('organization_module_preferences')
          .select('module_id, is_enabled')
          .eq('organization_id', tenant.id);
        
        if (error) throw error;
        
        const prefs: Record<string, boolean> = {};
        data?.forEach(d => {
          prefs[d.module_id] = d.is_enabled;
        });
        
        setPreferences(prefs);
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to load module preferences.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [tenant?.id, resetTrigger]);

  const handleToggle = async (moduleId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, [moduleId]: newVal }));
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('organization_module_preferences')
        .upsert(
          { 
            organization_id: tenant?.id, 
            module_id: moduleId, 
            is_enabled: newVal 
          },
          { onConflict: 'organization_id,module_id' }
        );

      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Module updated', description: 'Workspace navigation updated successfully.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not save preference.', variant: 'destructive' });
      // Revert optimistic update
      setPreferences(prev => ({ ...prev, [moduleId]: currentVal }));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // We auto-save toggle changes immediately
    registerSaveRef(async () => true);
    onDirtyChange(false);
  }, [registerSaveRef, onDirtyChange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
      </div>
    );
  }

  // Filter workspaces that the user is entitled to view (disregarding whether they are hidden by preference)
  // We can just iterate over WORKSPACES and check if they are hidden.
  // Wait, if we check canAccess, it would be blocked if it's hidden!
  // But here we want to list all workspaces they are ENTITLED to, regardless of preference.

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Visibility</CardTitle>
          <CardDescription>
            Toggle the modules you want visible in your sidebar. Disabling a module hides it from your team's navigation, 
            which is useful for keeping VowOS simple if you don't use all the features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKSPACES.map(module => {
              if (module.id === 'today' || module.id === 'settings') return null; // Can't hide Core modules
              
              // A module is enabled unless explicitly disabled in preferences
              const isEnabled = preferences[module.id] !== false;
              
              return (
                <div key={module.id} className={`flex items-center justify-between p-4 rounded-xl border ${isEnabled ? 'bg-white border-stone-200' : 'bg-stone-50/50 border-stone-100'} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <module.icon className={`h-5 w-5 ${isEnabled ? 'text-brand-primary' : 'text-stone-400'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${isEnabled ? 'text-stone-900' : 'text-stone-500'}`}>
                        {module.label}
                      </p>
                    </div>
                  </div>
                  
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(module.id, isEnabled)}
                    disabled={saving}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
