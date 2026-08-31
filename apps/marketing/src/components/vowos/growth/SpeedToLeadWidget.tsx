import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { Card, CardContent } from '@vowos/design-system';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useVowosData } from '@/contexts/VowosDataContext';
import { ViewKey } from '../Sidebar';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';

/** Minutes a new lead may wait before it counts as a speed-to-lead breach. */
const SLA_WARNING_MINUTES = 15;
const SLA_BREACH_MINUTES = 60;

export function SpeedToLeadWidget({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  // Reads the tenant's real leads from the shared data context. The previous
  // version polled an in-memory demo service that is never populated for a
  // live tenant, so this banner said "Zero Uncontacted Leads" no matter what.
  const { leads } = useVowosData();
  const { navigateToView } = useApplicationRoute();
  void onNavigate;

  const uncontactedLeads = useMemo(() => {
    const now = Date.now();
    return leads
      .filter((l) => l.stage === 'New' && !l.lastContactedAt)
      .map((l) => {
        const created = l.createdAt ? parseISO(l.createdAt).getTime() : NaN;
        const waitedMin = Number.isFinite(created) ? (now - created) / 60000 : 0;
        const slaStatus = waitedMin >= SLA_BREACH_MINUTES ? 'Breached' : waitedMin >= SLA_WARNING_MINUTES ? 'Warning' : 'OK';
        return { ...l, waitedMin, slaStatus };
      })
      .sort((a, b) => b.waitedMin - a.waitedMin);
  }, [leads]);

  const breached = uncontactedLeads.filter(l => l.slaStatus === 'Breached' || l.slaStatus === 'Warning');

  if (uncontactedLeads.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-stone-50 to-white shadow-sm border-stone-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Zero Uncontacted Leads</p>
              <p className="text-xs text-stone-500">Your speed-to-lead is looking perfect.</p>
            </div>
          </div>
          <button 
            onClick={() => navigateToView('growth', { tab: 'leads' })}
            className="text-xs font-semibold text-stone-900 hover:text-stone-600"
          >
            View Pipeline &rarr;
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm ${breached.length > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${breached.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
              {uncontactedLeads.length} {uncontactedLeads.length === 1 ? 'Lead' : 'Leads'} Waiting
              {breached.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" /> SLA Breach
                </span>
              )}
            </p>
            <p className="text-xs text-stone-600 mt-0.5">
              {uncontactedLeads[0].createdAt
                ? <>Longest wait: <span className="font-semibold text-stone-900">{formatDistanceToNow(parseISO(uncontactedLeads[0].createdAt))}</span> ({uncontactedLeads[0].name})</>
                : <>Oldest: <span className="font-semibold text-stone-900">{uncontactedLeads[0].name}</span></>}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigateToView('growth', { tab: 'leads' })}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${breached.length > 0 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        >
          Contact Now
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
