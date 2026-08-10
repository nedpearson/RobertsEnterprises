import { useEffect, useState } from 'react';
import { Plug, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { Button } from '@vowos/design-system';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_AI_SETTINGS, AISettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

interface IntegrationState {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at: string | null;
  error_message: string | null;
}

interface StripeSettings {
  testMode: boolean;
  successUrl: string;
  cancelUrl: string;
  acceptedCard: boolean;
  acceptedAch: boolean;
  disputeEmails: string;
}

const DEFAULT_STRIPE_SETTINGS: StripeSettings = {
  testMode: true,
  successUrl: 'https://robertsenterprises.com/checkout/success',
  cancelUrl: 'https://robertsenterprises.com/checkout/cancel',
  acceptedCard: true,
  acceptedAch: true,
  disputeEmails: 'billing@robertsenterprises.com, accounts@robertsenterprises.com',
};

interface IntegrationsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function IntegrationsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: IntegrationsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [dbAiSettings, setDbAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  
  const [stripe, setStripe] = useState<StripeSettings>(DEFAULT_STRIPE_SETTINGS);
  const [dbStripe, setDbStripe] = useState<StripeSettings>(DEFAULT_STRIPE_SETTINGS);
  
  const [stripeIntegration, setStripeIntegration] = useState<IntegrationState | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const dataPlane = getActiveDataPlane();
      
      const [aiResult, stripeResult] = await Promise.all([
        resolveEffectiveSetting<AISettings>('integrations', 'ai_settings', { dataPlane }, DEFAULT_AI_SETTINGS),
        resolveEffectiveSetting<StripeSettings>('integrations', 'stripe_settings', { dataPlane }, DEFAULT_STRIPE_SETTINGS)
      ]);
      
      setAiSettings(aiResult?.value || DEFAULT_AI_SETTINGS);
      setDbAiSettings(aiResult?.value || DEFAULT_AI_SETTINGS);
      setStripe(stripeResult?.value || DEFAULT_STRIPE_SETTINGS);
      setDbStripe(stripeResult?.value || DEFAULT_STRIPE_SETTINGS);

      // Load integration status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase.from('business_memberships').select('business_id').eq('user_id', user.id).maybeSingle();
        if (membership) {
          const { data: integration } = await supabase.from('integrations')
            .select('*')
            .eq('business_id', membership.business_id)
            .eq('provider', 'stripe')
            .maybeSingle();
            
          setStripeIntegration(integration);
        }
      }
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty =
    JSON.stringify(aiSettings) !== JSON.stringify(dbAiSettings) ||
    JSON.stringify(stripe) !== JSON.stringify(dbStripe);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('integrations', 'ai_settings', aiSettings, { dataPlane }, reason);
      await saveScopedSetting('integrations', 'stripe_settings', stripe, { dataPlane }, reason);
      
      toast({
        title: 'Integrations & AI settings saved',
        description: 'Integration parameters updated successfully.',
      });
      setDbAiSettings(aiSettings);
      setDbStripe(stripe);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save integrations settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [aiSettings, stripe]);

  const handleToggleStripe = async () => {
    if (stripeIntegration?.status === 'connected') {
      if (confirm('Disconnect Stripe? You will no longer be able to process payments.')) {
        await supabase.from('integrations').update({ status: 'disconnected', access_token: null }).eq('id', stripeIntegration.id);
        setStripeIntegration({ ...stripeIntegration, status: 'disconnected' });
        toast({ title: 'Stripe disconnected' });
      }
    } else {
      toast({ title: 'Connecting to Stripe...', description: 'Verifying integration state...' });
      try {
        const { data, error } = await supabase.rpc('connect_stripe_integration', { 
          integration_id: stripeIntegration?.id 
        });
        if (error) throw error;
        setStripeIntegration(data as IntegrationState);
        toast({ title: 'Stripe connected securely' });
      } catch (err: any) {
        toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
      }
    }
  };


  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading external adapters…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Stripe Payment Gateways"
        description="Verify webhook feedback loops, disconnect keys, or adjust transaction endpoints."
        icon={<Plug className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
            <div className="flex items-center gap-3">
              {stripeIntegration?.status === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-status-success flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-stone-400 flex-shrink-0" />
              )}
              <div>
                <span className="text-sm font-semibold text-stone-800">
                  {stripeIntegration?.status === 'connected' ? 'Stripe Connected' : 'Stripe Disconnected'}
                </span>
                <span className="block text-xs text-stone-400 mt-0.5">
                  {stripeIntegration?.status === 'connected' ? `Last sync: ${new Date(stripeIntegration.last_sync_at || '').toLocaleString()}` : 'Connect Stripe to process payments'}
                </span>
              </div>
            </div>
            <Button 
              variant={stripeIntegration?.status === 'connected' ? 'outline' : 'default'}
              className={stripeIntegration?.status !== 'connected' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
              onClick={handleToggleStripe}
            >
              {stripeIntegration?.status === 'connected' ? 'Disconnect' : 'Connect Stripe'}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField
              label="Stripe Environment mode"
              description="Toggle sandbox payment simulation vs production processing."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Test Mode (Sandbox Mode)</span>
                <Switch
                  checked={stripe.testMode}
                  onCheckedChange={(checked) => setStripe({ ...stripe, testMode: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Webhook Callback Health"
              description="Feedback loops status from Stripe back to VowOS database."
            >
              <div className="flex items-center justify-between h-9 px-1">
                {stripeIntegration?.status === 'connected' ? (
                  <span className="text-xs font-semibold text-status-success">● Active & Listening</span>
                ) : (
                  <span className="text-xs font-semibold text-stone-400">○ Inactive</span>
                )}
              </div>
            </SettingsField>

            <SettingsField label="Checkout Success URL">
              <input
                type="text"
                value={stripe.successUrl}
                onChange={(e) => setStripe({ ...stripe, successUrl: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField label="Checkout Cancel URL">
              <input
                type="text"
                value={stripe.cancelUrl}
                onChange={(e) => setStripe({ ...stripe, cancelUrl: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField
              label="Dispute Alert Notifications"
              description="Email addresses notified immediately on chargebacks."
              className="sm:col-span-2"
            >
              <input
                type="text"
                value={stripe.disputeEmails}
                onChange={(e) => setStripe({ ...stripe, disputeEmails: e.target.value })}
                className={inputCls}
              />
            </SettingsField>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Machine Learning & Copilot Settings"
        description="Establish data protection filters and usage cost limits for AI matches."
        icon={<Sparkles className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Enable AI Platform Features"
            description="Power stylist assignment suggestions and analytics using machine learning."
            className="sm:col-span-2"
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Active</span>
              <Switch
                checked={aiSettings.enabled}
                onCheckedChange={(checked) => setAiSettings({ ...aiSettings, enabled: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
          </SettingsField>

          <SettingsField label="AI Provider Endpoint">
            <select
              value={aiSettings.provider}
              onChange={(e) => setAiSettings({ ...aiSettings, provider: e.target.value })}
              className={inputCls}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </SettingsField>

          <SettingsField label="Global Fallback Model">
            <input
              type="text"
              value={aiSettings.model}
              onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
              className={inputCls}
            />
          </SettingsField>

          <SettingsField
            label="Temperature Controls"
            description="Controls creativity vs deterministic responses (0.0 - 1.0)."
          >
            <input
              type="number"
              value={aiSettings.temperature}
              onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) || 0 })}
              className={inputCls}
              min="0"
              max="1"
              step="0.1"
            />
          </SettingsField>

          <SettingsField
            label="Monthly AI Cost Limit ($)"
            description="Budget boundary before AI suggestions get auto-disabled."
          >
            <input
              type="number"
              value={(aiSettings.costLimitCents / 100).toFixed(0)}
              onChange={(e) => setAiSettings({ ...aiSettings, costLimitCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              className={inputCls}
              min="0"
            />
          </SettingsField>

          <div className="sm:col-span-2 rounded-xl bg-status-warning/10/50 border border-status-warning/20/60 p-4 flex items-start gap-3 mt-2">
            <AlertCircle className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
            <div>
              <h6 className="text-xs font-semibold text-amber-800">Security Safeguard</h6>
              <p className="text-[11px] text-status-warning/80 mt-1 leading-relaxed">
                AI settings will never allow machine learning endpoints to bypass deterministic business policies,
                financial constraints, invoice approvals, or user roles.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
