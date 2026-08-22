import { useEffect, useState } from 'react';
import {
  Building2,
  Plug,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { Button } from '@vowos/design-system';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_AI_SETTINGS, AISettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import type { CustomerHealthView, IntegrationHealthStatus } from '@/types/integrationOps';
import { useAuth } from '@/contexts/AuthContext';

interface IntegrationState {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  health_status?: IntegrationHealthStatus;
  last_sync_at: string | null;
  error_message: string | null;
  reconnect_url?: string | null;
}

interface BusinessBrand {
  id: string;
  name: string;
}

interface StripeSettings {
  testMode: boolean;
  successUrl: string;
  cancelUrl: string;
  acceptedCard: boolean;
  acceptedAch: boolean;
  disputeEmails: string;
}

interface SocialSettings {
  shopify: string;
  shopifyStatus: 'connected' | 'disconnected' | 'repairing' | 'action_required';
  facebook: string;
  facebookStatus: 'connected' | 'disconnected' | 'repairing' | 'action_required';
  instagram: string;
  instagramStatus: 'connected' | 'disconnected' | 'repairing' | 'action_required';
}

const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  shopify: '',
  shopifyStatus: 'disconnected',
  facebook: '',
  facebookStatus: 'disconnected',
  instagram: '',
  instagramStatus: 'disconnected',
};

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
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [dbAiSettings, setDbAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  
  const [stripe, setStripe] = useState<StripeSettings>(DEFAULT_STRIPE_SETTINGS);
  const [dbStripe, setDbStripe] = useState<StripeSettings>(DEFAULT_STRIPE_SETTINGS);
  
  const [stripeIntegration, setStripeIntegration] = useState<IntegrationState | null>(null);
  const [social, setSocial] = useState<SocialSettings>(DEFAULT_SOCIAL_SETTINGS);
  const [dbSocial, setDbSocial] = useState<SocialSettings>(DEFAULT_SOCIAL_SETTINGS);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [brands, setBrands] = useState<BusinessBrand[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<'facebook' | 'instagram' | null>(null);

  // Helper for customer-facing simplified health states
  const getCustomerHealthView = (
    status: 'connected' | 'disconnected' | 'repairing' | 'action_required' | string
  ): CustomerHealthView => {
    switch (status) {
      case 'connected':
      case 'HEALTHY':
        return {
          status: 'HEALTHY',
          label: 'Connected & Healthy',
          description: 'Integration is operating normally with real-time sync.',
          canReconnect: false,
        };
      case 'repairing':
      case 'RECOVERING':
      case 'REPAIRING':
        return {
          status: 'REPAIRING',
          label: 'Repairing (Auto-healing in progress)',
          description: 'VowOS is automatically restoring missed events.',
          canReconnect: false,
        };
      case 'action_required':
      case 'ACTION_REQUIRED':
      case 'ACTION REQUIRED':
      case 'error':
        return {
          status: 'ACTION_REQUIRED',
          label: 'Reconnect Required',
          description: 'Please re-authorize your account to resume sync.',
          canReconnect: true,
          reconnectUrl: 'https://app.vowos.com/api/auth/reconnect',
        };
      case 'DEGRADED':
        return {
          status: 'DEGRADED',
          label: 'Slow Sync / Degraded',
          description: 'Provider is experiencing rate limits or minor delays.',
          canReconnect: false,
        };
      default:
        return {
          status: 'HEALTHY',
          label: 'Disconnected',
          description: 'Connect this channel to automate data synchronization.',
          canReconnect: false,
        };
    }
  };

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

      // Every integration and brand lookup must use the active organization.
      const businessId = tenant?.id;
      if (!businessId) {
        setBrands([]);
        setStripeIntegration(null);
        setSocial(DEFAULT_SOCIAL_SETTINGS);
        return;
      }

      const [brandsResult, connectedAccountsResult, growthConnectionsResult] = await Promise.all([
        supabase
          .from('business_brands')
          .select('id, name')
          .eq('business_id', businessId)
          .order('name'),
        supabase
          .from('connected_accounts')
          .select('provider, display_name, external_account_id, status, last_verified_at')
          .eq('business_id', businessId)
          .in('provider', ['SHOPIFY', 'shopify'])
          .order('connected_at', { ascending: false }),
        supabase
          .from('growth_provider_connections')
          .select('provider, status')
          .eq('business_id', businessId)
          .eq('provider', 'meta_social')
          .maybeSingle(),
      ]);

      if (brandsResult.error) throw brandsResult.error;
      if (connectedAccountsResult.error) throw connectedAccountsResult.error;
      if (growthConnectionsResult.error) throw growthConnectionsResult.error;

      const tenantBrands = brandsResult.data || [];
      setBrands(tenantBrands);
      setSelectedBrand((current) => (
        current === 'all' || tenantBrands.some((brand) => brand.id === current)
          ? current
          : 'all'
      ));
      // The legacy integrations table has been retired. Provider truth is derived only
      // from organization-scoped OAuth records that passed a verification check.
      setStripeIntegration(null);
      const accounts = connectedAccountsResult.data || [];
      const findAccount = (...providers: string[]) => accounts.find((account) =>
        providers.includes(account.provider.toUpperCase()),
      );
      const verifiedStatus = (account: typeof accounts[number] | undefined): SocialSettings['shopifyStatus'] => (
        account?.status?.toUpperCase() === 'CONNECTED' && account.last_verified_at
          ? 'connected'
          : account
            ? 'action_required'
            : 'disconnected'
      );
      const shopifyAccount = findAccount('SHOPIFY');
      const metaSocialConnection = growthConnectionsResult.data;
      const metaSocialStatus: SocialSettings['facebookStatus'] = metaSocialConnection?.status === 'connected'
        ? 'connected'
        : metaSocialConnection
          ? 'action_required'
          : 'disconnected';
      setSocial((current) => ({
        ...current,
        shopify: shopifyAccount?.external_account_id || shopifyAccount?.display_name || '',
        shopifyStatus: verifiedStatus(shopifyAccount),
        facebook: metaSocialConnection ? 'Authorized through Meta' : '',
        facebookStatus: metaSocialStatus,
        instagram: metaSocialConnection ? 'Authorized through Meta' : '',
        instagramStatus: metaSocialStatus,
      }));
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger, tenant?.id]);

  const isDirty =
    JSON.stringify(aiSettings) !== JSON.stringify(dbAiSettings) ||
    JSON.stringify(stripe) !== JSON.stringify(dbStripe) ||
    JSON.stringify(social) !== JSON.stringify(dbSocial);

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
      setDbSocial(social);
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
  }, [aiSettings, stripe, social]);

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

  const handleProviderSetup = async (provider: 'shopify' | 'facebook' | 'instagram') => {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    if (provider === 'facebook' || provider === 'instagram') {
      setConnectingProvider(provider);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sign in again to connect Meta.');

        // A single Meta authorization covers the selected Facebook Page and its
        // linked Instagram professional account. The worker scopes it from JWT.
        const response = await fetch('/api/growth/connect-meta/meta_social', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error || 'Meta did not return an authorization URL.');
        }
        window.location.assign(payload.url);
        return;
      } catch (error) {
        toast({
          title: 'Could not start Meta authorization',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      } finally {
        setConnectingProvider(null);
      }
      return;
    }

    toast({
      title: `${providerName} authorization is not configured`,
      description: `Entering a ${providerName} URL does not create a connection. VowOS needs a verified OAuth authorization, the required provider permissions, and a successful read-only API check before sync can be enabled.`,
      variant: 'destructive',
    });
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
      {/* Brand Context Selector */}
      <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
        <Building2 className="h-5 w-5 text-stone-500" />
        <div className="flex-1">
          <label className="text-xs font-semibold text-stone-700 block mb-1">Brand Context</label>
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={inputCls}
          >
            <option value="all">All Brands (Organization Level)</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Brand E-Commerce & Social Channels */}
      <SettingsCard
        title="Brand E-Commerce & Social Channels"
        description="Connect digital storefronts and messaging channels with automated health monitoring and self-healing."
        icon={<Plug className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {/* Shopify Channel */}
          <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {social.shopifyStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : social.shopifyStatus === 'repairing' ? (
                  <RotateCcw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : social.shopifyStatus === 'action_required' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-stone-400 flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-semibold text-stone-900 block">Shopify Storefront</span>
                  <span className="text-xs text-stone-500">
                    {getCustomerHealthView(social.shopifyStatus).label} — {getCustomerHealthView(social.shopifyStatus).description}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {social.shopifyStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3 text-emerald-600" /> Connected & Healthy
                  </span>
                )}
                {social.shopifyStatus === 'repairing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <RotateCcw className="w-3 h-3 text-blue-600 animate-spin" /> Repairing (Auto-healing)
                  </span>
                )}
                {social.shopifyStatus === 'action_required' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Reconnect Required
                  </span>
                )}
                {social.shopifyStatus === 'disconnected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-stone-200/60">
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs font-medium text-stone-600">Shopify Store URL</label>
                <input
                  type="text"
                  placeholder="e.g. my-store.myshopify.com"
                  value={social.shopify}
                  onChange={(e) => setSocial({ ...social, shopify: e.target.value })}
                  className={inputCls}
                  disabled={social.shopifyStatus === 'connected'}
                />
              </div>

              <div className="flex items-center gap-2">
                {social.shopifyStatus === 'action_required' && (
                  <Button
                    onClick={() => handleProviderSetup('shopify')}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Authorization Required
                  </Button>
                )}

                <Button 
                  variant={social.shopifyStatus === 'connected' ? 'outline' : 'default'}
                  onClick={() => handleProviderSetup('shopify')}
                  className={social.shopifyStatus === 'disconnected' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'text-xs'}
                >
                  {social.shopifyStatus === 'connected' ? 'Manage Shopify' : 'Set Up Shopify'}
                </Button>
              </div>
            </div>
          </div>

          {/* Facebook Channel */}
          <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {social.facebookStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : social.facebookStatus === 'repairing' ? (
                  <RotateCcw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : social.facebookStatus === 'action_required' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-stone-400 flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-semibold text-stone-900 block">Facebook Messenger & Leads</span>
                  <span className="text-xs text-stone-500">
                    {getCustomerHealthView(social.facebookStatus).label} — {getCustomerHealthView(social.facebookStatus).description}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {social.facebookStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3 text-emerald-600" /> Connected & Healthy
                  </span>
                )}
                {social.facebookStatus === 'repairing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <RotateCcw className="w-3 h-3 text-blue-600 animate-spin" /> Repairing (Auto-healing)
                  </span>
                )}
                {social.facebookStatus === 'action_required' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Reconnect Required
                  </span>
                )}
                {social.facebookStatus === 'disconnected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-stone-200/60">
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs font-medium text-stone-600">Facebook Page URL</label>
                <input
                  type="text"
                  placeholder="e.g. facebook.com/my-boutique"
                  value={social.facebook}
                  onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                  className={inputCls}
                  disabled={social.facebookStatus === 'connected'}
                />
              </div>

              <div className="flex items-center gap-2">
                {social.facebookStatus === 'action_required' && (
                  <Button
                    onClick={() => handleProviderSetup('facebook')}
                    disabled={connectingProvider !== null}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                  >
                    {connectingProvider === 'facebook' ? 'Opening Meta...' : 'Authorization Required'}
                  </Button>
                )}

                <Button 
                  variant={social.facebookStatus === 'connected' ? 'outline' : 'default'}
                  onClick={() => handleProviderSetup('facebook')}
                  disabled={connectingProvider !== null}
                  className={social.facebookStatus === 'disconnected' ? 'bg-blue-600 hover:bg-blue-700 text-white text-xs' : 'text-xs'}
                >
                  {connectingProvider === 'facebook' ? 'Opening Meta...' : social.facebookStatus === 'connected' ? 'Manage Facebook' : 'Set Up Facebook'}
                </Button>
              </div>
            </div>
          </div>

          {/* Instagram Channel */}
          <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {social.instagramStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : social.instagramStatus === 'repairing' ? (
                  <RotateCcw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : social.instagramStatus === 'action_required' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-stone-400 flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-semibold text-stone-900 block">Instagram Direct Messages</span>
                  <span className="text-xs text-stone-500">
                    {getCustomerHealthView(social.instagramStatus).label} — {getCustomerHealthView(social.instagramStatus).description}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {social.instagramStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3 text-emerald-600" /> Connected & Healthy
                  </span>
                )}
                {social.instagramStatus === 'repairing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <RotateCcw className="w-3 h-3 text-blue-600 animate-spin" /> Repairing (Auto-healing)
                  </span>
                )}
                {social.instagramStatus === 'action_required' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Reconnect Required
                  </span>
                )}
                {social.instagramStatus === 'disconnected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-stone-200/60">
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs font-medium text-stone-600">Instagram Handle / URL</label>
                <input
                  type="text"
                  placeholder="e.g. instagram.com/my-boutique"
                  value={social.instagram}
                  onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                  className={inputCls}
                  disabled={social.instagramStatus === 'connected'}
                />
              </div>

              <div className="flex items-center gap-2">
                {social.instagramStatus === 'action_required' && (
                  <Button
                    onClick={() => handleProviderSetup('instagram')}
                    disabled={connectingProvider !== null}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                  >
                    {connectingProvider === 'instagram' ? 'Opening Meta...' : 'Authorization Required'}
                  </Button>
                )}

                <Button 
                  variant={social.instagramStatus === 'connected' ? 'outline' : 'default'}
                  onClick={() => handleProviderSetup('instagram')}
                  disabled={connectingProvider !== null}
                  className={social.instagramStatus === 'disconnected' ? 'bg-pink-600 hover:bg-pink-700 text-white text-xs' : 'text-xs'}
                >
                  {connectingProvider === 'instagram' ? 'Opening Meta...' : social.instagramStatus === 'connected' ? 'Manage Instagram' : 'Set Up Instagram'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Brand Payment Gateways */}
      <SettingsCard
        title="Brand Payment Gateways"
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
                  {stripeIntegration?.status === 'connected' ? 'Stripe Connected (Brand Level)' : 'Stripe Disconnected (Brand Level)'}
                </span>
                <span className="block text-xs text-stone-400 mt-0.5">
                  {stripeIntegration?.status === 'connected' ? `Last sync: ${new Date(stripeIntegration.last_sync_at || '').toLocaleString()}` : 'Connect Stripe to process payments'}
                </span>
              </div>
            </div>
            <Button 
              variant={stripeIntegration?.status === 'connected' ? 'outline' : 'default'}
              className={stripeIntegration?.status !== 'connected' ? 'bg-indigo-600 hover:bg-indigo-700 text-white text-xs' : 'text-xs'}
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

      {/* Machine Learning & Copilot Settings */}
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
