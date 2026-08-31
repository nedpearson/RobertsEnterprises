import { useState } from 'react';
import { CommerceConnection } from '../types/properCommerceTypes';
import { connectGoDaddy, disconnectGoDaddy } from '../api/properCommerceApi';
import { Modal } from '@/components/vowos/ui';
import { ShoppingBag, ShieldCheck, CheckCircle2, RefreshCw, Lock, Link2, Globe } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface GoDaddyConnectModalProps {
  open: boolean;
  onClose: () => void;
  connection: CommerceConnection | undefined;
  onUpdate: () => void;
}

export default function GoDaddyConnectModal({ open, onClose, connection, onUpdate }: GoDaddyConnectModalProps) {
  const [shopDomain, setShopDomain] = useState(connection?.shopDomain || 'properandcompany.godaddysites.com');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      toast({ title: 'Enter shop domain', description: 'Please enter your GoDaddy store domain.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Direct the user to the real backend OAuth initiation endpoint
      window.location.href = `${String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/auth/connect/godaddy?brand=Proper%20%26%20Company&shop=${encodeURIComponent(shopDomain)}`;
    } catch (e: any) {
      toast({ title: 'Connection failed', description: e.message || 'Could not authorize with GoDaddy.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect Proper & Co from GoDaddy Websites + Marketing? Online product sync will pause.')) {
      setLoading(true);
      await disconnectGoDaddy();
      toast({ title: 'GoDaddy Disconnected', description: 'Proper & Co store connection revoked.' });
      onUpdate();
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Proper & Co to GoDaddy">
      <div className="space-y-5 select-none">
        {/* Security Shield Callout */}
        <div className="rounded-2xl border border-border-subtle bg-brand-soft/50 p-4 text-xs text-stone-700 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-brand-secondary">
            <Lock className="h-4 w-4 text-brand-primary" />
            <span>Secure Direct OAuth Authorization</span>
          </div>
          <p className="text-stone-600 leading-relaxed">
            VowOS connects to your GoDaddy Websites + Marketing store via official GoDaddy Commerce OAuth. 
            <strong className="text-stone-900 font-semibold"> VowOS never asks for, receives, or stores your GoDaddy login password.</strong>
          </p>
        </div>

        {/* Status Card */}
        {connection && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">{connection.shopName}</p>
                  <p className="text-xs text-stone-500">{connection.shopDomain}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  connection.status === 'connected'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                    : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {connection.status === 'connected' ? 'Connected · Healthy' : 'Disconnected'}
              </span>
            </div>

            {connection.status === 'connected' && (
              <div className="border-t border-stone-200/60 pt-3 text-[11px] text-stone-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>Granted Scopes: <strong>{connection.grantedScopes.join(', ')}</strong></span>
                <span>Last Verified: <strong>{new Date(connection.lastVerifiedAt || '').toLocaleDateString()}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Input Field */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            GoDaddy Store Permanent Domain
          </label>
          <div className="relative">
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="properandcompany.godaddysites.com"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Example: properandcompany.godaddysites.com</p>
        </div>

        {/* Granted Scopes Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">Authorized System Permissions:</p>
          <ul className="grid grid-cols-2 gap-2 text-xs text-stone-600">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> Read & Write Product Catalog
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> Multi-Location Stock Sync
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> Mirror Online Orders
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> Operational Fulfillment & Returns
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-stone-200 pt-4">
          {connection?.status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
            >
              Disconnect Store
            </button>
          ) : (
            <div />
          )}

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
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {connection?.status === 'connected' ? 'Re-verify Connection' : 'Connect GoDaddy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
