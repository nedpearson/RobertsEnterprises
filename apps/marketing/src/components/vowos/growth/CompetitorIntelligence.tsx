import { useMemo, useState } from 'react';
import { AlertTriangle, Crosshair, ExternalLink, Eye, Plus, Radar, Trash2, Verified } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vowos/design-system';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { resolveLocationId, useVowosData } from '@/contexts/VowosDataContext';
import { locationById } from '@/data/vowosData';
import { useGrowthConnections } from '@/lib/growth/useGrowth';
import {
  useGrowthCompetitorActions,
  useGrowthCompetitors,
  useGrowthCompetitorSignals,
} from '@/lib/growth/useGrowthIntelligence';

export function CompetitorIntelligence() {
  const { activeLocation } = useVowosData();
  const competitorsState = useGrowthCompetitors();
  const signalsState = useGrowthCompetitorSignals();
  const connectionsState = useGrowthConnections();
  const actions = useGrowthCompetitorActions();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const locationId = activeLocation === 'all' ? null : resolveLocationId(activeLocation);
  const locationName = locationById(activeLocation)?.city || 'all locations';
  const competitors = useMemo(
    () => competitorsState.data.filter((competitor) => !locationId || !competitor.location_id || competitor.location_id === locationId),
    [competitorsState.data, locationId],
  );
  const competitorIds = useMemo(() => new Set(competitors.map((competitor) => competitor.id)), [competitors]);
  const signals = useMemo(
    () => signalsState.data.filter((signal) => competitorIds.has(signal.competitor_id)),
    [signalsState.data, competitorIds],
  );
  const connectedSearchSources = connectionsState.data.filter(
    (connection) =>
      connection.status === 'connected' &&
      ['google_business_profile', 'google_search_console', 'google_ads'].includes(connection.provider),
  );

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await actions.add({ name: name.trim(), websiteUrl: websiteUrl.trim() || null, locationId });
      setName('');
      setWebsiteUrl('');
      setIsAdding(false);
      competitorsState.refresh();
      toast.success('Competitor added to verified tracking.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add competitor.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await actions.remove(id);
      competitorsState.refresh();
      signalsState.refresh();
      toast.success('Competitor removed from active tracking.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove competitor.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Competitive Intelligence</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track verified local competitors and measured market signals for {locationName}. Estimated data is explicitly labeled.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add Competitor
          </button>
        )}
      </div>

      <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
        <CardContent className="flex gap-3 p-4">
          <Verified className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-950">Production truth standard</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              VowOS no longer manufactures search-share percentages from appointment volume. Share of voice appears only when a connected search-data source can support the methodology.
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdding && (
        <Card className="border-brand-primary/20 bg-brand-soft/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Add a verified competitor</CardTitle>
            <CardDescription>Enter a business you actually compete with. Website is optional but improves matching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Competitor business name"
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://competitor.com"
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={saving || !name.trim()}
                onClick={handleAdd}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Start Tracking'}
              </button>
              <button onClick={() => setIsAdding(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700">
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Verified Competitors</CardTitle>
            <CardDescription>
              {competitors.length} active competitors for this scope. No market-share number is shown unless measured data exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competitorsState.loading ? (
              <p className="text-sm text-stone-500">Loading competitors…</p>
            ) : competitorsState.error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{competitorsState.error}</div>
            ) : competitors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <Crosshair className="mx-auto h-7 w-7 text-stone-400" />
                <p className="mt-3 text-sm font-semibold text-stone-800">No verified competitors configured</p>
                <p className="mx-auto mt-1 max-w-lg text-xs text-stone-500">
                  Add direct local competitors, then connect Google/Search sources so VowOS can build defensible visibility and opportunity comparisons.
                </p>
                <button onClick={() => setIsAdding(true)} className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700">
                  Add First Competitor
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {competitors.map((competitor) => {
                  const signalCount = signals.filter((signal) => signal.competitor_id === competitor.id).length;
                  return (
                    <div key={competitor.id} className="group rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-stone-900">{competitor.name}</h3>
                            {competitor.verified_by_user && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Verified</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs capitalize text-stone-500">{competitor.competitor_type} competitor · {signalCount} measured signals</p>
                        </div>
                        <button
                          onClick={() => handleRemove(competitor.id)}
                          className="rounded-md p-1 text-stone-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                          aria-label={`Remove ${competitor.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {competitor.website_url ? (
                        <a href={competitor.website_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                          Visit website <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-stone-400">Website not mapped</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Measurement Readiness</CardTitle>
            <CardDescription>Connected search sources required for real competitive visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['google_business_profile', 'google_search_console', 'google_ads'].map((provider) => {
              const connection = connectionsState.data.find((item) => item.provider === provider);
              const connected = connection?.status === 'connected';
              return (
                <div key={provider} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">{provider.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                    <p className="mt-0.5 text-[10px] text-stone-400">Last sync: {connection?.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                    {connected ? 'Connected' : 'Needed'}
                  </span>
                </div>
              );
            })}
            {connectedSearchSources.length === 0 && (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
                Connect Google Business Profile, Search Console and/or Ads to populate measured competitive visibility. VowOS will show “unavailable” instead of fabricating share-of-voice.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Market Signal Timeline</CardTitle>
              <CardDescription>Only persisted public/API signals with evidence quality and methodology.</CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-stone-500"><Radar className="h-4 w-4" /> {signals.length} signals</div>
          </div>
        </CardHeader>
        <CardContent>
          {signalsState.loading ? (
            <p className="text-sm text-stone-500">Loading signals…</p>
          ) : signalsState.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{signalsState.error}</div>
          ) : signals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <Eye className="mx-auto h-7 w-7 text-stone-400" />
              <p className="mt-3 text-sm font-semibold text-stone-800">No measured competitor signals yet</p>
              <p className="mx-auto mt-1 max-w-xl text-xs text-stone-500">
                This is a truthful empty state. Signals will appear after competitor sources are connected and a collection job successfully stores evidence.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => {
                const competitor = competitors.find((item) => item.id === signal.competitor_id);
                return (
                  <div key={signal.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-stone-900">{competitor?.name || 'Tracked competitor'}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${signal.evidence_quality === 'measured' ? 'bg-emerald-50 text-emerald-700' : signal.evidence_quality === 'estimated' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                            {signal.evidence_quality}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-700">{signal.headline || signal.signal_type.replace(/_/g, ' ')}</p>
                        {signal.summary && <p className="mt-1 text-xs leading-relaxed text-stone-500">{signal.summary}</p>}
                      </div>
                      <p className="text-[10px] font-medium text-stone-400">{formatDistanceToNow(parseISO(signal.detected_at))} ago</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-stone-500">
                      <span>Source: {signal.source}</span>
                      {signal.methodology && <span>Method: {signal.methodology}</span>}
                      {signal.public_url && (
                        <a href={signal.public_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline">
                          Evidence <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {connectionsState.error && (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4" /> Connection status could not be loaded: {connectionsState.error}
        </div>
      )}
    </div>
  );
}
