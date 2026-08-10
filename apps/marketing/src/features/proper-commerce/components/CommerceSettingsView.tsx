import { CommerceConnection } from '../types/properCommerceTypes';
import { Store, MapPin, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface CommerceSettingsViewProps {
  connection: CommerceConnection;
  onOpenConnectModal: () => void;
}

export default function CommerceSettingsView({ connection, onOpenConnectModal }: CommerceSettingsViewProps) {
  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Section 1: Connection & Authentication */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-brand-primary" />
            <h3 className="font-bold text-stone-900 text-sm">Shopify Connection &amp; Authentication</h3>
          </div>
          <button
            onClick={onOpenConnectModal}
            className="rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100"
          >
            Re-authenticate / Change Store
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-stone-400">Store Domain</p>
            <p className="font-bold text-stone-900">{connection.shopDomain}</p>
          </div>
          <div>
            <p className="text-stone-400">Health Status</p>
            <p className="font-bold text-status-success flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> {connection.health}
            </p>
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
          {connection.locationMappings.map((loc) => (
            <div key={loc.vowosLocationId} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-stone-50">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <MapPin className="h-4 w-4 text-brand-primary" />
                <span>{loc.shopifyLocationName}</span>
              </div>
              <span className="font-mono text-stone-500 bg-stone-200 px-2 py-0.5 rounded text-[11px]">
                ID: {loc.shopifyLocationId}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
