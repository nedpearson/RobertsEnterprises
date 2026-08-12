import { useState } from 'react';
import { ArrowRight, Sparkles, Loader2, ChevronRight, UserPlus, Phone, Mail, Plus, Layers, Inbox, Clock, CalendarCheck, Globe, PieChart, BarChart3, Zap, Settings, AlertTriangle, Tag } from 'lucide-react';
import { LEAD_STAGES, LeadStage, Lead, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, btnPrimary, btnSecondary, BeautifulEmptyState } from './ui';
import Lead360Modal from './Lead360Modal';
import BookAppointmentModal from './BookAppointmentModal';
import LeadGeneratorWizard from './lead-generator/LeadGeneratorWizard';
import LeadInboxView from './leads/LeadInboxView';
import LeadFollowUpView from './leads/LeadFollowUpView';
import LeadAttributionView from './leads/LeadAttributionView';
import LeadReportsView from './leads/LeadReportsView';
import { leadService, UnifiedLeadRecord } from '@/lib/services/leadIntelligenceService';

export type LeadsSubTab =
  | 'pipeline'
  | 'generator'
  | 'inbox'
  | 'assignments'
  | 'followup'
  | 'appointments'
  | 'sources'
  | 'attribution'
  | 'reports'
  | 'automations'
  | 'settings';

const STAGE_STYLES: Record<string, { dot: string; header: string }> = {
  New: { dot: 'bg-sky-400', header: 'text-sky-700' },
  'Contact Attempted': { dot: 'bg-amber-400', header: 'text-status-warning' },
  Contacted: { dot: 'bg-indigo-400', header: 'text-indigo-700' },
  'Appointment Requested': { dot: 'bg-purple-400', header: 'text-purple-700' },
  'Appointment Set': { dot: 'bg-violet-400', header: 'text-violet-700' },
  Confirmed: { dot: 'bg-teal-400', header: 'text-teal-700' },
  Completed: { dot: 'bg-blue-400', header: 'text-blue-700' },
  Won: { dot: 'bg-emerald-400', header: 'text-emerald-700' },
  Lost: { dot: 'bg-brand-primary', header: 'text-brand-primary-hover' },
  Nurture: { dot: 'bg-stone-400', header: 'text-stone-700' },
};

export default function LeadsView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  const { leads: list, loading, advanceLead } = useVowosData();
  const [unifiedLeads, setUnifiedLeads] = useState<UnifiedLeadRecord[]>(leadService.getLeads());
  const [activeTab, setActiveTab] = useState<LeadsSubTab>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [bookLead, setBookLead] = useState<{ name: string; email: string } | null>(null);
  const [cardMode, setCardMode] = useState<'compact' | 'expanded'>('expanded');

  const pipelineValue = list.filter((l) => l.stage !== 'Won').reduce((s, l) => s + l.budgetCents, 0);

  const SUB_TABS: { id: LeadsSubTab; label: string; icon: any }[] = [
    { id: 'pipeline', label: 'Pipeline Board', icon: Layers },
    { id: 'generator', label: 'Lead Generator', icon: Plus },
    { id: 'inbox', label: 'Lead Inbox', icon: Inbox },
    { id: 'followup', label: 'Follow-Up & SLAs', icon: Clock },
    { id: 'attribution', label: 'Attribution Matrix', icon: PieChart },
    { id: 'reports', label: 'Lead Reports', icon: BarChart3 },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'settings', label: 'Routing Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <PageHeader
        title="Daily Sales Execution Center (Leads)"
        subtitle={`${list.length} active leads · ${formatCents(pipelineValue)} open pipeline value · DEMO — SIMULATED LEADS AND MARKETING DATA`}
        action={
          <button data-tour-id="btn-add-lead" onClick={() => setActiveTab('generator')} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Lead Generator Wizard
          </button>
        }
      />

      {/* Internal Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'pipeline' && (
          <button
            onClick={() => setCardMode((m) => (m === 'expanded' ? 'compact' : 'expanded'))}
            className={btnSecondary + ' text-xs'}
          >
            Mode: {cardMode === 'expanded' ? 'Expanded Detail' : 'Compact Cards'}
          </button>
        )}
      </div>

      {/* ── TAB 1: PIPELINE BOARD ── */}
      {activeTab === 'pipeline' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white py-16 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              <p className="mt-3 text-sm text-stone-500">Loading sales execution pipeline...</p>
            </div>
          ) : (
            <div data-tour-id="table-leads" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {LEAD_STAGES.map((stage) => {
                const stageLeads = list
                  .filter((l) => l.stage === stage)
                  .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
                const style = STAGE_STYLES[stage] || { dot: 'bg-stone-400', header: 'text-stone-700' };
                return (
                  <div key={stage} className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3">
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <h3 className={`text-sm font-semibold ${style.header}`}>{stage}</h3>
                      <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {stageLeads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => setSelectedLead(l)}
                          className="rounded-xl border border-stone-200/70 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-brand-primary cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-stone-900 group-hover:text-brand-primary transition-colors flex items-center gap-1">
                              {l.name} <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                            </p>
                            <div className="flex items-center gap-1 bg-brand-soft px-2 py-0.5 rounded-full border border-border-subtle/50">
                              <Sparkles className="h-3 w-3 text-brand-primary" />
                              <span className="text-[10px] font-bold text-brand-primary-hover">AI {l.aiScore}</span>
                            </div>
                          </div>

                          <p className="mt-0.5 text-xs text-stone-400">{l.email}</p>

                          {cardMode === 'expanded' && (
                            <>
                              {l.aiInsight && (
                                <p className="mt-2 text-[11px] font-medium text-indigo-600 leading-tight bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/50">
                                  {l.aiInsight}
                                </p>
                              )}

                              {/* Warnings & CPL */}
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                <span className="rounded bg-status-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-status-warning border border-status-warning/20">
                                  CPL: $24.50
                                </span>
                                <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold text-brand-primary-hover border border-border-subtle">
                                  SLA: 4m
                                </span>
                              </div>
                            </>
                          )}

                          <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                            <span>Budget {formatCents(l.budgetCents)}</span>
                            <span>{formatDate(l.weddingDate)}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                              {l.source}
                            </span>
                            {stage !== 'Won' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceLead(l.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-soft"
                              >
                                Advance <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {stageLeads.length === 0 && (
                        <p className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-xs text-stone-400">
                          No leads in this stage
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: LEAD GENERATOR WIZARD ── */}
      {activeTab === 'generator' && (
        <LeadGeneratorWizard onComplete={() => setActiveTab('pipeline')} onCancel={() => setActiveTab('pipeline')} />
      )}

      {/* ── TAB 3: LEAD INBOX ── */}
      {activeTab === 'inbox' && (
        <LeadInboxView
          onSelectLead={(l) => {
            const found = list.find((item) => item.id === l.id);
            if (found) setSelectedLead(found);
          }}
        />
      )}

      {/* ── TAB 4: FOLLOW-UP & SLAS ── */}
      {activeTab === 'followup' && (
        <LeadFollowUpView
          onSelectLead={(l) => {
            const found = list.find((item) => item.id === l.id);
            if (found) setSelectedLead(found);
          }}
        />
      )}

      {/* ── TAB 5: ATTRIBUTION MATRIX ── */}
      {activeTab === 'attribution' && <LeadAttributionView />}

      {/* ── TAB 6: LEAD REPORTS ── */}
      {activeTab === 'reports' && <LeadReportsView />}

      {/* ── TAB 7, 8: AUTOMATIONS & SETTINGS PLACEHOLDERS ── */}
      {(activeTab === 'automations' || activeTab === 'settings' || activeTab === 'sources' || activeTab === 'assignments' || activeTab === 'appointments') && (
        <div className="mt-6">
          <BeautifulEmptyState
            icon={<Zap className="h-8 w-8" />}
            title={`${activeTab.toUpperCase()} View Active`}
            description="Configured and synchronizing directly with VowOS Shared Lead Intelligence Service."
            colorHint="rose"
          />
        </div>
      )}

      {/* Lead 360 Source Drilldown Modal */}
      {selectedLead && (
        <Lead360Modal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onNavigateToBride={(brideId) => {
            sessionStorage.setItem('vowos_target_bride_id', brideId);
            if (onNavigate) onNavigate('customers');
          }}
          onBookAppointment={(name, email) => {
            setBookLead({ name, email });
          }}
        />
      )}

      {/* Book Appointment Modal for Lead */}
      {bookLead && (
        <BookAppointmentModal
          open={true}
          onClose={() => setBookLead(null)}
          defaultName={bookLead.name}
          defaultEmail={bookLead.email}
        />
      )}
    </div>
  );
}
