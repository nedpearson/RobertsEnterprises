import { useState, useEffect } from 'react';
import { getDiscoveredLeads, generateSimulatedOutreach } from '../api/marketingApi';
import { DiscoveredLead, OutreachDraft } from '../types/marketingTypes';
import { Bot, Sparkles, Send, CheckCircle, ExternalLink, MessageSquareText } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface AIProspectingViewProps {
  brandFilter: string;
}

export default function AIProspectingView({ brandFilter }: AIProspectingViewProps) {
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OutreachDraft>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLeads(getDiscoveredLeads(brandFilter));
  }, [brandFilter]);

  const handleGenerateOutreach = async (leadId: string) => {
    setGenerating((prev) => ({ ...prev, [leadId]: true }));
    try {
      const draft = await generateSimulatedOutreach(leadId);
      setDrafts((prev) => ({ ...prev, [leadId]: draft }));
      toast({ title: 'Draft Generated', description: 'AI has drafted an outreach message.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate draft', variant: 'destructive' });
    } finally {
      setGenerating((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const handleApproveAndSend = (leadId: string) => {
    setDrafts((prev) => {
      const updated = { ...prev };
      if (updated[leadId]) {
        updated[leadId].status = 'approved_sent';
      }
      return updated;
    });
    toast({ title: 'Message Sent!', description: 'Outreach successfully queued for delivery.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            AI Prospecting Engine
          </h2>
          <p className="text-sm text-stone-500">Autonomous social listening and intent capture.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {leads.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
            No leads found currently for {brandFilter}.
          </div>
        ) : (
          leads.map((lead) => {
            const draft = drafts[lead.id];
            const isGenerating = generating[lead.id];
            const isSent = draft?.status === 'approved_sent';

            return (
              <div key={lead.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                        {lead.source}
                      </span>
                      {lead.intentScore === 'High' && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand-secondary text-[10px] font-bold uppercase">
                          High Intent
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-stone-900">{lead.author}</h3>
                  </div>
                  <a href={lead.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-indigo-600">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl text-sm text-stone-700 italic border border-stone-100 mb-6">
                  "{lead.content}"
                </div>

                {isSent ? (
                  <div className="rounded-xl bg-status-success/10 border border-emerald-100 p-4 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">Outreach Sent</p>
                      <p className="text-xs text-emerald-700 mt-1">{draft.draftContent}</p>
                    </div>
                  </div>
                ) : draft ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                      <div className="flex items-center gap-2 mb-2 text-indigo-900 font-semibold text-xs uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        AI Draft
                      </div>
                      <textarea 
                        className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-sm text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows={3}
                        defaultValue={draft.draftContent}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleApproveAndSend(lead.id)} className={`${btnPrimary} flex-1 justify-center`}>
                        <Send className="h-4 w-4 mr-2" /> Approve &amp; Send
                      </button>
                      <button onClick={() => handleGenerateOutreach(lead.id)} className={`${btnSecondary} px-4`} disabled={isGenerating}>
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerateOutreach(lead.id)}
                    disabled={isGenerating}
                    className={`${btnSecondary} w-full justify-center text-indigo-700 border-indigo-200 hover:bg-indigo-50`}
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 animate-pulse" /> Analyzing...</span>
                    ) : (
                      <span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Generate AI Outreach</span>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
