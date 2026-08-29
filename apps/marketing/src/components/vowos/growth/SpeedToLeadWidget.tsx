import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@vowos/design-system';
import { leadService, UnifiedLeadRecord } from '@/lib/services/leadIntelligenceService';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ViewKey } from '../Sidebar';

export function SpeedToLeadWidget({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [uncontactedLeads, setUncontactedLeads] = useState<UnifiedLeadRecord[]>([]);

  useEffect(() => {
    // In a real app, this would subscribe to a realtime Supabase channel.
    // For now, we fetch from the local service and poll every 30s.
    const fetchLeads = () => {
      const allLeads = leadService.getLeads();
      const newLeads = allLeads
        .filter(l => l.stage === 'New' && !l.lastContactedAt)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setUncontactedLeads(newLeads);
    };

    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

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
            onClick={() => onNavigate('customers')}
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
              Longest wait: <span className="font-semibold text-stone-900">{formatDistanceToNow(parseISO(uncontactedLeads[0].createdAt))}</span> ({uncontactedLeads[0].name})
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('customers')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${breached.length > 0 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        >
          Contact Now
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
