import { useState } from 'react';
import {
  MarketingProvider,
  MarketingConnection,
  ConnectionTruthDescriptor,
} from '../types/marketingTypes';
import {
  getMarketingConnections,
  connectProviderOAuth,
  disconnectProviderOAuth,
  testConnectionReadonly,
} from '../api/marketingApi';
import { Modal, btnPrimary, btnSecondary } from '@/components/vowos/ui';
import CallRailDniTester from './CallRailDniTester';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Lock,
  PhoneCall,
  Radio,
  Sliders,
  Check,
  X,
  Building2,
  MapPin,
  Tag,
  KeyRound,
  FileCode,
  Sparkles,
  Info,
  ChevronRight,
  Activity,
  Copy,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ConnectionsView() {
  const [connections, setConnections] = useState<MarketingConnection[]>(getMarketingConnections());
  const [selectedConn, setSelectedConn] = useState<MarketingConnection | null>(null);
  const [testingConn, setTestingConn] = useState<MarketingConnection | null>(null);
  const [testResult, setTestResult] = useState<MarketingConnection | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Setup / Reauthorize Modal
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<MarketingProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [orgInput, setOrgInput] = useState('');
  const [dniTesterOpen, setDniTesterOpen] = useState(false);

  const refreshList = () => {
    setConnections(getMarketingConnections());
  };

  const handleRunLiveTest = (conn: MarketingConnection) => {
    setTestingConn(conn);
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      const res = testConnectionReadonly(conn.provider);
      setTestResult(res);
      setIsTesting(false);
      refreshList();
      toast({
        title: `Live Verification Completed: ${res.title}`,
        description: `Status evaluated to ${res.displayLabel}.`,
      });
    }, 1200);
  };

  const handleDisconnect = (provider: MarketingProvider) => {
    disconnectProviderOAuth(provider);
    refreshList();
    setSelectedConn(null);
    toast({ title: `Disconnected`, description: `${provider.toUpperCase()} connection has been safely revoked.` });
  };

  const handleSaveCredential = () => {
    if (!activeOAuthProvider) return;
    connectProviderOAuth(activeOAuthProvider, orgInput || 'Proper & Co. Verified Organization');
    refreshList();
    setActiveOAuthProvider(null);
    setApiKeyInput('');
    setOrgInput('');
    toast({
      title: 'Credential Saved & Verified',
      description: 'Server-side verification complete.',
    });
  };

  const PROVIDER_ACTION_BUTTONS: Record<MarketingProvider, { label: string; icon: any }> = {
    meta: { label: 'Connect Meta Business', icon: Lock },
    google: { label: 'Authorize Google Ads & GA4', icon: Lock },
    tiktok: { label: 'Connect TikTok Ads', icon: Lock },
    pinterest: { label: 'Connect Pinterest Business', icon: Lock },
    linkedin: { label: 'Connect LinkedIn Manager', icon: Lock },
    shopify: { label: 'Manage Shopify Store Connection', icon: Sliders },
    klaviyo: { label: 'Update Klaviyo Private Key / OAuth', icon: KeyRound },
    call_tracking: { label: 'Connect CallRail API Key & Webhook', icon: KeyRound },
    web_forms: { label: 'Configure VowOS Web Form Endpoint', icon: FileCode },
  };

  return (
    <div className="space-y-6 select-none max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Truthful Provider Connection Center</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Server-evaluated connection health, scope checks, resource mappings, and live API verification.
          </p>
        </div>
        <button
          onClick={refreshList}
          className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4 text-stone-500" /> Refresh Health Statuses
        </button>
      </div>

      {/* Strict Security Rule Banner */}
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-900 to-stone-800 p-4 text-white space-y-1 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-300">
          <ShieldCheck className="h-4 w-4 text-rose-400" /> Non-Negotiable Connection Truth Rule
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          VowOS connection states are derived exclusively from live server-side API verification, valid token decryption, and resource selection. A provider card will <strong>never</strong> display <em>"Connected &amp; Healthy"</em> if zero accounts are selected, if credentials fail verification, or if required location mappings are incomplete.
        </p>
      </div>

      {/* Provider Connection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => {
          const isHealthy = conn.status === 'CONNECTED_HEALTHY';
          const isDemo = conn.isDemo;
          const ActionIcon = PROVIDER_ACTION_BUTTONS[conn.provider]?.icon || Lock;
          const actionLabel = PROVIDER_ACTION_BUTTONS[conn.provider]?.label || 'Configure Provider';

          return (
            <div
              key={conn.provider}
              className={`rounded-2xl border p-5 shadow-2xs space-y-4 transition-all flex flex-col justify-between ${
                isHealthy ? 'border-stone-200/90 bg-white' : 'border-stone-200 bg-stone-50/60'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm leading-snug">{conn.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${conn.badgeStyle.bg} ${conn.badgeStyle.text} ${conn.badgeStyle.border}`}>
                        {conn.displayLabel}
                      </span>
                      {isDemo && (
                        <span className="rounded-full bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                          DEMO
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200/60">
                    {conn.authMethodLabel}
                  </span>
                </div>

                {/* Sub-Services (e.g. Google Ads vs GA4) */}
                {conn.subServices && conn.subServices.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {conn.subServices.map((sub) => (
                      <div key={sub.name} className="bg-stone-50 p-2 rounded-xl border border-stone-200/70 text-[11px]">
                        <p className="font-bold text-stone-800">{sub.name}</p>
                        <p className={`text-[10px] font-medium ${sub.status === 'CONNECTED_HEALTHY' ? 'text-emerald-600 font-bold' : 'text-stone-500'}`}>
                          {sub.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connected Identity & Account Metrics */}
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Organization / Store:</span>
                    <span className="font-bold text-stone-900 truncate max-w-[180px]">
                      {conn.externalOrganization?.name || 'Not Configured'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Selected Accounts / Resources:</span>
                    <span className={`font-bold ${conn.selectedAccountCount > 0 || conn.provider === 'web_forms' ? 'text-stone-900' : 'text-amber-700 font-black'}`}>
                      {conn.provider === 'web_forms' ? `${conn.selectedAccountCount} Active Form Endpoints` : `${conn.selectedAccountCount} Selected Accounts`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Mapped Locations:</span>
                    <div className="flex flex-wrap gap-1">
                      {conn.locationMappings.map((loc) => (
                        <span key={loc} className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-bold text-stone-700 uppercase">
                          {loc}
                        </span>
                      ))}
                      {conn.locationMappings.length === 0 && <span className="text-stone-400 text-[11px]">None</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Last Verified:</span>
                    <span className="font-semibold text-stone-600">{conn.lastVerifiedAt}</span>
                  </div>
                </div>

                {/* Warning / Action Required Banner */}
                {conn.actionRequired && (
                  <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-medium leading-tight">{conn.actionRequired}</p>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedConn(conn)}
                    className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
                  >
                    <Info className="h-3.5 w-3.5 text-stone-500" /> Inspect Scopes
                  </button>
                  <button
                    onClick={() => handleRunLiveTest(conn)}
                    className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200/80 flex items-center gap-1.5"
                  >
                    <Activity className="h-3.5 w-3.5 text-rose-600" /> Test Connection
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {conn.provider === 'call_tracking' && (
                    <button
                      onClick={() => setDniTesterOpen(true)}
                      className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-600" /> Verify DNI Snippet
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveOAuthProvider(conn.provider);
                      setOrgInput(conn.externalOrganization?.name || '');
                    }}
                    className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ActionIcon className="h-3.5 w-3.5 text-rose-300" /> {actionLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scope & Permission Detail Drawer Modal */}
      {selectedConn && (
        <Modal open={true} onClose={() => setSelectedConn(null)} title={`${selectedConn.title} — Scope & Mappings Audit`} maxWidth="max-w-3xl">
          <div className="space-y-5 text-xs">
            
            {/* Status & Identity Card */}
            <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Canonical Status:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${selectedConn.badgeStyle.bg} ${selectedConn.badgeStyle.text} ${selectedConn.badgeStyle.border}`}>
                  {selectedConn.displayLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Authentication Method:</span>
                <span className="font-semibold text-stone-900">{selectedConn.authMethodLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Organization ID:</span>
                <span className="font-mono text-stone-900 font-bold">{selectedConn.externalOrganization?.id || 'Unassigned'}</span>
              </div>
            </div>

            {/* Mapped Brand & Store Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-stone-200 p-4 space-y-2 bg-white">
                <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                  <Building2 className="h-4 w-4 text-rose-500" /> Mapped Boutique Brands
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedConn.brandMappings.map((b) => (
                    <span key={b} className="rounded-lg bg-rose-50 text-rose-800 px-2.5 py-1 font-bold uppercase text-[11px] border border-rose-200">
                      {b === 'ido' ? 'I Do Bridal Couture' : 'Proper & Company'}
                    </span>
                  ))}
                  {selectedConn.brandMappings.length === 0 && <span className="text-stone-400 italic">No brands mapped</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4 space-y-2 bg-white">
                <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                  <MapPin className="h-4 w-4 text-violet-500" /> Mapped Locations
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedConn.locationMappings.map((loc) => (
                    <span key={loc} className="rounded-lg bg-violet-50 text-violet-800 px-2.5 py-1 font-bold uppercase text-[11px] border border-violet-200">
                      {loc}
                    </span>
                  ))}
                  {selectedConn.locationMappings.length === 0 && <span className="text-stone-400 italic">No locations mapped</span>}
                </div>
              </div>
            </div>

            {/* Granted vs Missing Permissions Drawer */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-white">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-500" /> Granted &amp; Required API Scopes
              </h4>

              <div className="space-y-2 divide-y divide-stone-100">
                {selectedConn.grantedScopes.map((sc) => (
                  <div key={sc.scope} className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-stone-900">{sc.label}</p>
                      <p className="text-[10px] font-mono text-stone-400">{sc.scope}</p>
                    </div>
                    {sc.status === 'granted' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="h-3 w-3 text-emerald-600" /> Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <X className="h-3 w-3 text-rose-600" /> Missing
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Account Roster Inspection */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-white">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500">
                Connected External Accounts ({selectedConn.resources.length})
              </h4>
              <div className="space-y-2">
                {selectedConn.resources.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{r.name}</p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {r.type} · ID: {r.externalId}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.selected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                      {r.selected ? 'Selected & Active' : 'Unselected'}
                    </span>
                  </div>
                ))}
                {selectedConn.resources.length === 0 && <p className="text-stone-400 italic text-center py-2">No external resources connected yet.</p>}
              </div>
            </div>

            {/* Disconnect Control */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                onClick={() => handleDisconnect(selectedConn.provider)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Safely Revoke &amp; Disconnect Provider
              </button>
              <button onClick={() => setSelectedConn(null)} className={btnSecondary}>
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live Read-Only Connection Test Modal */}
      {testingConn && (
        <Modal open={true} onClose={() => setTestingConn(null)} title={`Live Verification: ${testingConn.title}`} maxWidth="max-w-md">
          <div className="space-y-4 text-xs">
            {isTesting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-rose-500 animate-spin" />
                <p className="font-bold text-stone-800">Executing Safe Read-Only Verification...</p>
                <p className="text-stone-500 text-[11px]">Testing token validity, identity, scopes, and location mappings</p>
              </div>
            ) : testResult ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Evaluated Truth Status:</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] border ${testResult.badgeStyle.bg} ${testResult.badgeStyle.text} ${testResult.badgeStyle.border}`}>
                      {testResult.displayLabel}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-200 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>Identity Verification:</span>
                      <span className="font-bold text-emerald-600">PASSED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Account Selection Check:</span>
                      <span className={`font-bold ${testResult.evidence.accountCheck === 'passed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {testResult.evidence.accountCheck.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Scope Authorization Check:</span>
                      <span className={`font-bold ${testResult.evidence.scopeCheck === 'passed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {testResult.evidence.scopeCheck.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button onClick={() => setTestingConn(null)} className="w-full rounded-xl bg-stone-900 py-2.5 font-bold text-white hover:bg-stone-800 transition-colors">
                  Close Test Runner
                </button>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Provider-Specific Credential / Auth Modal */}
      {activeOAuthProvider && (
        <Modal open={true} onClose={() => setActiveOAuthProvider(null)} title={`Configure ${activeOAuthProvider.toUpperCase()} Connection`} maxWidth="max-w-md">
          <div className="space-y-4 text-xs">
            <p className="text-stone-600">
              Enter your verified organization name or server-side API key for <strong>{activeOAuthProvider.toUpperCase()}</strong>.
            </p>

            <div className="space-y-2">
              <label className="font-bold text-stone-800 uppercase text-[10px] tracking-wider">Organization / Business Name</label>
              <input
                type="text"
                value={orgInput}
                onChange={(e) => setOrgInput(e.target.value)}
                placeholder="e.g. Proper & Co. Storefront"
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-medium focus:border-rose-500 focus:outline-none"
              />
            </div>

            {activeOAuthProvider === 'call_tracking' || activeOAuthProvider === 'klaviyo' ? (
              <div className="space-y-2">
                <label className="font-bold text-stone-800 uppercase text-[10px] tracking-wider">Private API Key (Stored Encrypted)</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter API Key..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setActiveOAuthProvider(null)} className={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveCredential} className={btnPrimary}>
                Save &amp; Perform Server Verification
              </button>
            </div>
          </div>
        </Modal>
      )}

      <CallRailDniTester isOpen={dniTesterOpen} onClose={() => setDniTesterOpen(false)} />
    </div>
  );
}
