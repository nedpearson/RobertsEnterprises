import { Lock, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function MarketingSettingsView() {
  return (
    <div className="space-y-6 select-none max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Marketing Command Center Settings &amp; API Keys</h2>
        <p className="text-xs text-stone-500">Configure global currency, OAuth app credentials, and notification webhooks.</p>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          <Key className="h-4 w-4 text-rose-500" /> Platform App Client Credentials Guide
        </h3>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-stone-700">Meta App ID &amp; Graph API Version</span>
            <p className="text-stone-500">Meta App ID: <span className="font-mono font-bold text-stone-900">881940284910</span> (Graph API v20.0)</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-stone-700">Google Ads Developer Token</span>
            <p className="text-stone-500">Developer Token status: <span className="font-bold text-emerald-600">Approved (Standard Access)</span></p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-stone-700">OAuth Redirect URI</span>
            <p className="font-mono text-stone-800 bg-stone-100 p-2 rounded-xl border border-stone-200 text-[11px]">
              https://robertsenterprises.vowos.com/api/marketing/connections/callback
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
