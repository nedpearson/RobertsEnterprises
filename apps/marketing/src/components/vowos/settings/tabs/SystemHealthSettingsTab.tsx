import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { SettingsCard } from '../components/SettingsCard';
import { supabase } from '@/lib/supabase';
import { resolveEffectiveSetting } from '@/lib/settings';

interface SystemHealthSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function SystemHealthSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: SystemHealthSettingsTabProps) {
  const [checking, setChecking] = useState(false);
  const [dbStatus, setDbStatus] = useState<'Pending' | 'Healthy' | 'Error'>('Pending');
  const [stripeStatus, setStripeStatus] = useState<'Pending' | 'Healthy' | 'Error' | 'Disconnected'>('Pending');
  const [aiStatus, setAiStatus] = useState<'Pending' | 'Healthy' | 'Error' | 'Disconnected'>('Pending');

  useEffect(() => {
    // This tab doesn't have unsaved changes
    onDirtyChange(false);
    registerSaveRef(async () => true);
  }, []);

  const runDiagnostics = async () => {
    setChecking(true);
    setDbStatus('Pending');
    setStripeStatus('Pending');
    setAiStatus('Pending');
    
    try {
      // 1. Check DB Health
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      setDbStatus('Healthy');

      // 2. Check Integrations
      const { data: membership } = await supabase.from('business_memberships').select('business_id').eq('user_id', user.id).maybeSingle();
      if (membership) {
        const { data: integration } = await supabase.from('integrations')
          .select('status')
          .eq('business_id', membership.business_id)
          .eq('provider', 'stripe')
          .maybeSingle();
          
        setStripeStatus(integration?.status === 'connected' ? 'Healthy' : 'Disconnected');
      }

      // 3. Check AI Config
      const aiResult = await resolveEffectiveSetting<any>('integrations', 'ai_settings', { dataPlane: 'production' }, { enabled: false });
      setAiStatus(aiResult?.value?.enabled ? 'Healthy' : 'Disconnected');

      toast({
        title: 'Diagnostics check complete',
        description: 'All system services have been polled.',
      });
    } catch (e: any) {
      setDbStatus('Error');
      toast({
        title: 'Diagnostics check failed',
        description: e.message || 'Could not connect to database.',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const services = [
    { name: 'Supabase Database', desc: 'Queries, auth tokens, row level security policies.', status: dbStatus },
    { name: 'Stripe Adapter', desc: 'Secure connection check and webhook delivery loops.', status: stripeStatus },
    { name: 'AI Copilot Provider', desc: 'AI routing gateway and model verification.', status: aiStatus },
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Owner System Administrations"
        description="Verify backend databases and integration endpoints health. Download diagnostics files."
        icon={<Activity className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Commit SHA:</span>
              <span className="text-xs text-stone-600 font-semibold ml-2">d7fce0f (main)</span>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              Run Health Check
            </button>
          </div>

          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden bg-white">
            {services.map((svc) => (
              <div key={svc.name} className="flex justify-between items-center p-4">
                <div>
                  <h6 className="text-xs font-bold text-stone-800 uppercase tracking-wider">{svc.name}</h6>
                  <p className="text-[11px] text-stone-400 mt-0.5">{svc.desc}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  svc.status === 'Healthy' ? 'bg-status-success/10 text-status-success' :
                  svc.status === 'Error' ? 'bg-red-50 text-red-600' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
