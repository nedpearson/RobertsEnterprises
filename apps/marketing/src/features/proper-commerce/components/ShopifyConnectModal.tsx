import { useEffect, useState } from 'react';
import type { CommerceConnection } from '../types/properCommerceTypes';
import { Modal } from '@/components/vowos/ui';
import { CheckCircle2, Link2, Lock, RefreshCw, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface ShopifyConnectModalProps {
  open: boolean;
  onClose: () => void;
  connection?: CommerceConnection;
  onUpdate: () => void | Promise<void>;
}

const FALLBACK_DOMAIN = 'properandcompany.myshopify.com';

export default function ShopifyConnectModal({ open, onClose, connection, onUpdate }: ShopifyConnectModalProps) {
  const [shopDomain, setShopDomain] = useState(connection?.shopDomain || FALLBACK_DOMAIN);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setShopDomain(connection?.shopDomain || FALLBACK_DOMAIN);
  }, [open, connection?.shopDomain]);

  const sessionToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your VowOS session expired. Sign in again before connecting Shopify.');
    return token;
  };

  const handleConnect = async () => {
    const shop = shopDomain.trim();
    if (!shop) {
      toast({
        title: 'Enter shop domain',
        description: 'Enter the permanent Shopify domain, for example properandcompany.myshopify.com.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = await sessionToken();
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/shopify/connect?shop=${encodeURIComponent(shop)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Shopify did not return an authorization URL.');
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast({
        title: 'Could not start Shopify authorization',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this Shopify store from VowOS? Background order and catalog sync will stop until it is reconnected.')) return;
    setLoading(true);
    try {
      const token = await sessionToken();
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/shopify/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Shopify could not be disconnected.');
      await onUpdate();
      toast({ title: 'Shopify disconnected', description: 'Stored Shopify credentials were revoked from VowOS.' });
      onClose();
    } catch (error) {
      toast({
        title: 'Could not disconnect Shopify',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const connected = connection?.status === 'connected';
  const healthLabel = connected
    ? connection?.health === 'Healthy'
      ? 'Connected · Healthy'
      : 'Connected · Needs Attention'
    : connection?.status === 'reauth_required'
      ? 'Reconnect Required'
      : 'Disconnected';
  const grantedScopes = connection?.grantedScopes?.length
    ? connection.grantedScopes.join(', ')
    : 'Granted scopes appear after Shopify authorization.';

  return (
    <Modal open={open} onClose={onClose} title="Connect Proper & Co to Shopify">
      <div className="space-y-5 select-none">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-stone-700 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-900">
            <Lock className="h-4 w-4 text-rose-600" />
            <span>Secure Direct OAuth Authorization</span>
          </div>
          <p className="text-stone-600 leading-relaxed">
            VowOS connects through Shopify's merchant authorization flow. VowOS never asks for or stores your Shopify login password.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate">{connection?.shopName || 'Shopify'}</p>
                <p className="text-xs text-stone-500 truncate">{connection?.shopDomain || shopDomain}</p>
              </div>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              connected && connection?.health === 'Healthy'
                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {healthLabel}
            </span>
          </div>

          {connected && (
            <div className="border-t border-stone-200/60 pt-3 text-[11px] text-stone-500 space-y-1">
              <p>Granted scopes: <strong>{grantedScopes}</strong></p>
              {connection?.lastVerifiedAt && (
                <p>Connected: <strong>{new Date(connection.lastVerifiedAt).toLocaleString()}</strong></p>
              )}
              {connection?.lastSyncAt && (
                <p>Last sync: <strong>{new Date(connection.lastSyncAt).toLocaleString()}</strong></p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Shopify Store Permanent Domain
          </label>
          <input
            type="text"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="properandcompany.myshopify.com"
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="text-[11px] text-stone-400 mt-1">Use the permanent <strong>.myshopify.com</strong> domain, not a custom storefront domain.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">VowOS will use the approved Shopify scopes for:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Product/catalog synchronization</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Inventory/location reconciliation</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Order/customer intake</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Signed webhook processing</li>
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 pt-4 gap-3">
          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-50"
            >
              Disconnect Store
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {connected ? 'Re-authorize Shopify' : 'Connect Shopify'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
