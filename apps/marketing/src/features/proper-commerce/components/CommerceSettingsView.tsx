import { CommerceConnection } from '../types/properCommerceTypes';
import { Store, MapPin, ShieldCheck, RefreshCw, CheckCircle2, Globe, Link2 } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface CommerceSettingsViewProps {
  connections: CommerceConnection[];
  onOpenShopifyModal: () => void;
  onOpenGoDaddyModal: () => void;
  onOpenSquareModal: () => void;
}

export default function CommerceSettingsView({ connections, onOpenShopifyModal, onOpenGoDaddyModal, onOpenSquareModal }: CommerceSettingsViewProps) {
  const shopifyConn = connections.find((c) => c.provider === 'shopify');
  const godaddyConn = connections.find((c) => c.provider === 'godaddy');
  const squareConn = connections.find((c) => c.provider === 'square');
  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Section 1: Omnichannel Integrations Hub */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="font-bold text-stone-900 text-sm">Omnichannel Integrations Hub</h3>
          <p className="text-xs text-stone-500">
            Connect VowOS to your online storefronts to sync catalogs, inventory, and mirror orders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shopify Card */}
          <div className="rounded-xl border border-stone-200 p-4 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Shopify</h4>
              </div>
              <p className="text-xs text-stone-500 mb-2">Connect your Shopify store for full e-commerce sync.</p>
              {shopifyConn ? (
                <div className="text-xs">
                  <p className="font-bold text-stone-900">{shopifyConn.shopDomain}</p>
                  <p className="font-bold text-status-success flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> {shopifyConn.health}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-400">Not connected</p>
              )}
            </div>
            <button
              onClick={onOpenShopifyModal}
              className="mt-2 w-full justify-center rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" /> {shopifyConn ? 'Manage Shopify' : 'Connect Shopify'}
            </button>
          </div>

          {/* GoDaddy Card */}
          <div className="rounded-xl border border-stone-200 p-4 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-stone-900 text-sm">GoDaddy Websites</h4>
              </div>
              <p className="text-xs text-stone-500 mb-2">Connect your GoDaddy store to manage online presence.</p>
              {godaddyConn ? (
                <div className="text-xs">
                  <p className="font-bold text-stone-900">{godaddyConn.shopDomain}</p>
                  <p className="font-bold text-status-success flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> {godaddyConn.health}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-400">Not connected</p>
              )}
            </div>
            <button
              onClick={onOpenGoDaddyModal}
              className="mt-2 w-full justify-center rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" /> {godaddyConn ? 'Manage GoDaddy' : 'Connect GoDaddy'}
            </button>
          </div>

          {/* Square Card */}
          <div className="rounded-xl border border-stone-200 p-4 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center bg-gray-200 rounded text-gray-800 font-bold text-[10px]">SQ</div>
                <h4 className="font-bold text-stone-900 text-sm">Square POS</h4>
              </div>
              <p className="text-xs text-stone-500 mb-2">Sync in-store catalog and inventory with Square.</p>
              {squareConn ? (
                <div className="text-xs">
                  <p className="font-bold text-stone-900">{squareConn.shopDomain}</p>
                  <p className="font-bold text-status-success flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> {squareConn.health}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-400">Not connected</p>
              )}
            </div>
            <button
              onClick={onOpenSquareModal}
              className="mt-2 w-full justify-center rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" /> {squareConn ? 'Manage Square' : 'Connect Square'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Location Mappings */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="font-bold text-stone-900 text-sm">Location Mappings</h3>
          <p className="text-xs text-stone-500">
            Map VowOS boutique location records to Shopify location IDs for multi-store inventory sync.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          {connections.flatMap(c => c.locationMappings).map((loc, idx) => (
            <div key={`${loc.vowosLocationId}-${idx}`} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-stone-50">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <MapPin className="h-4 w-4 text-brand-primary" />
                <span>{loc.shopifyLocationName}</span>
              </div>
              <span className="font-mono text-stone-500 bg-stone-200 px-2 py-0.5 rounded text-[11px]">
                ID: {loc.shopifyLocationId}
              </span>
            </div>
          ))}
          {connections.flatMap(c => c.locationMappings).length === 0 && (
            <p className="text-stone-400">No active location mappings. Connect a store to view mappings.</p>
          )}
        </div>
      </div>
    </div>
  );
}
