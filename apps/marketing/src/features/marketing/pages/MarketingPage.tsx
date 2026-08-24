import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MarketingOverview from '../components/MarketingOverview';
import ConnectionsView from '../components/ConnectionsView';
import CampaignsManager from '../components/CampaignsManager';
import CampaignWizardModal from '../components/CampaignWizardModal';
import ContentCalendarView from '../components/ContentCalendarView';
import CreativeStudioView from '../components/CreativeStudioView';
import BudgetCenterView from '../components/BudgetCenterView';
import AutomationsView from '../components/AutomationsView';
import MarketingReportsView from '../components/MarketingReportsView';
import ApprovalsView from '../components/ApprovalsView';
import MarketingSettingsView from '../components/MarketingSettingsView';
import AICommandCenterView from '../../marketing-ai/command-center/AICommandCenterView';
import MarketingCopilotView from '../../marketing-ai/assistant/MarketingCopilotView';
import RecommendationsView from '../../marketing-ai/recommendations/RecommendationsView';
import BudgetOptimizerView from '../../marketing-ai/budget-optimizer/BudgetOptimizerView';
import ExperimentsView from '../../marketing-ai/experiments/ExperimentsView';
import CreativeIntelligenceView from '../../marketing-ai/creative-intelligence/CreativeIntelligenceView';
import CompetitorTrendsView from '../../marketing-ai/competitors/CompetitorTrendsView';
import GovernanceView from '../../marketing-ai/governance/GovernanceView';

import LeadGeneratorWizard from '@/components/vowos/lead-generator/LeadGeneratorWizard';
import LeadInboxView from '@/components/vowos/leads/LeadInboxView';
import LeadFollowUpView from '@/components/vowos/leads/LeadFollowUpView';
import LeadAttributionView from '@/components/vowos/leads/LeadAttributionView';
import LeadReportsView from '@/components/vowos/leads/LeadReportsView';
import LeadsView from '@/components/vowos/LeadsView';
import AIModelSettingsTab from '@/components/vowos/settings/tabs/AIModelSettingsTab';
import { leadService, UnifiedLeadRecord } from '@/lib/services/leadIntelligenceService';
import Lead360Modal from '@/components/vowos/Lead360Modal';
import BookAppointmentModal from '@/components/vowos/BookAppointmentModal';

import { TrendingUp, Megaphone, Calendar, Image, DollarSign, Users, Zap, BarChart3, CheckCircle2, Radio, Settings, PlusCircle, Filter, Sparkles, Bot, Cpu, Layers, Eye, ShieldCheck, Inbox, Clock, PieChart, Tag, ChevronDown } from 'lucide-react';

export type GrowthTab =
  | 'command-center'
  | 'lead-generation'
  | 'lead-pipeline'
  | 'lead-inbox'
  | 'follow-up'
  | 'campaigns'
  | 'content'
  | 'creatives'
  | 'prospecting'
  | 'audiences'
  | 'budget'
  | 'attribution'
  | 'automations'
  | 'reports'
  | 'copilot'
  | 'connections'
  | 'settings'
  | 'ai-models';

export interface GrowthNavGroup {
  groupLabel: string;
  items: {
    id: GrowthTab;
    label: string;
    icon: any;
    badge?: string;
  }[];
}

export default function GrowthMarketingPage() {
  const { profile } = useAuth();
  const userRole = profile?.role || 'Stylist';

  // Role-based initial default view
  const getDefaultTab = (): GrowthTab => {
    if (userRole === 'Stylist' || userRole === 'Front Desk') return 'lead-pipeline';
    if (userRole === 'Manager') return 'command-center';
    return 'command-center'; // Owner default
  };

  const [activeTab, setActiveTab] = useState<GrowthTab>(getDefaultTab());
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [selectedLead360, setSelectedLead360] = useState<any | null>(null);
  const [bookLeadModal, setBookLeadModal] = useState<{ name: string; email: string } | null>(null);

  const NAV_GROUPS: GrowthNavGroup[] = [
    {
      groupLabel: 'Sales & Lead Execution',
      items: [
        { id: 'command-center', label: 'Command Center', icon: Sparkles },
        { id: 'lead-pipeline', label: 'Lead Pipeline', icon: Layers, badge: 'Active' },
        { id: 'lead-generation', label: 'Lead Generation', icon: PlusCircle },
        { id: 'lead-inbox', label: 'Lead Inbox', icon: Inbox },
        { id: 'follow-up', label: 'Follow-Up & SLAs', icon: Clock, badge: 'SLA 5m' },
      ],
    },
    {
      groupLabel: 'Campaigns & Content',
      items: [
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
        { id: 'content', label: 'Content Calendar', icon: Calendar },
        { id: 'creatives', label: 'Creative Studio', icon: Image },
        { id: 'prospecting', label: 'AI Prospecting & Audiences', icon: Users },
        { id: 'budget', label: 'Budget Center', icon: DollarSign },
      ],
    },
    {
      groupLabel: 'Analytics & Intelligence',
      items: [
        { id: 'attribution', label: 'Attribution Matrix', icon: PieChart },
        { id: 'reports', label: 'Growth Reports', icon: BarChart3 },
        { id: 'copilot', label: 'AI Copilot', icon: Bot },
        { id: 'automations', label: 'Automations', icon: Zap },
        { id: 'connections', label: 'Connections & OAuth', icon: Radio },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'ai-models', label: 'AI Model Gateway', icon: Cpu },
      ],
    },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Top Header & Brand/Location Scoping Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900">Growth &amp; Marketing Operating System</h1>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-secondary">
              Demand ➔ Lead ➔ Revenue ➔ Profit
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Canonical closed-loop growth system unifying Meta, Google, TikTok, Pinterest, Shopify, and Lead Execution.
          </p>
        </div>

        {/* Global Brand & Location Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 rounded-xl p-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-stone-400 ml-1" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-transparent font-bold text-stone-800 focus:outline-none text-xs"
            >
              <option value="all">All Brands (I Do + Proper)</option>
              <option value="ido">I Do Bridal Couture</option>
              <option value="proper">Proper &amp; Co. Boutique</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 rounded-xl p-1.5 shadow-2xs">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-transparent font-bold text-stone-800 focus:outline-none text-xs"
            >
              <option value="all">All Locations (BR + Cov)</option>
              <option value="ido-br">I Do · Baton Rouge</option>
              <option value="ido-cov">I Do · Covington</option>
              <option value="pc-br">Proper &amp; Co · Baton Rouge</option>
              <option value="pc-cov">Proper &amp; Co · Covington</option>
            </select>
          </div>

          <button
            onClick={() => setShowCampaignWizard(true)}
            className="rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Build Campaign
          </button>
        </div>
      </div>

      {/* Structured Internal Grouped Navigation Bar */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.groupLabel} className="space-y-1.5 flex-1 min-w-[240px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {grp.groupLabel}
              </span>
              <div className="flex flex-wrap gap-1">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xl ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`ml-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-brand-primary text-white' : 'bg-brand-soft text-brand-secondary'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Section Content Area */}
      <div>
        {activeTab === 'command-center' && (
          <AICommandCenterView
            brandFilter={brandFilter}
            onNavigateTab={(tab: string) => setActiveTab(tab as GrowthTab)}
          />
        )}
        {activeTab === 'lead-pipeline' && <LeadsView />}
        {activeTab === 'lead-generation' && (
          <LeadGeneratorWizard
            onComplete={() => setActiveTab('lead-pipeline')}
            onCancel={() => setActiveTab('lead-pipeline')}
          />
        )}
        {activeTab === 'lead-inbox' && (
          <LeadInboxView
            onSelectLead={(l) => {
              setSelectedLead360({
                id: l.id,
                name: l.name,
                email: l.email,
                source: l.sourcePlatform,
                budgetCents: l.budgetCents,
                weddingDate: l.weddingDate,
                stage: l.stage === 'Contact Attempted' || l.stage === 'Contacted' ? 'Contacted' : 'New',
              });
            }}
          />
        )}
        {activeTab === 'follow-up' && (
          <LeadFollowUpView
            onSelectLead={(l) => {
              setSelectedLead360({
                id: l.id,
                name: l.name,
                email: l.email,
                source: l.sourcePlatform,
                budgetCents: l.budgetCents,
                weddingDate: l.weddingDate,
                stage: l.stage === 'Contact Attempted' || l.stage === 'Contacted' ? 'Contacted' : 'New',
              });
            }}
          />
        )}
        {activeTab === 'campaigns' && (
          <CampaignsManager
            brandFilter={brandFilter}
            onOpenWizard={() => setShowCampaignWizard(true)}
          />
        )}
        {activeTab === 'content' && <ContentCalendarView />}
        {activeTab === 'creatives' && <CreativeStudioView />}
        {activeTab === 'budget' && <BudgetCenterView brandFilter={brandFilter} locationFilter={locationFilter} />}
        {activeTab === 'attribution' && <LeadAttributionView />}
        {activeTab === 'reports' && <LeadReportsView />}
        {activeTab === 'copilot' && <MarketingCopilotView brandFilter={brandFilter} />}
        {activeTab === 'automations' && <AutomationsView />}
        {activeTab === 'connections' && <ConnectionsView />}
        {activeTab === 'settings' && <MarketingSettingsView />}
        {activeTab === 'ai-models' && <AIModelSettingsTab onDirtyChange={() => {}} registerSaveRef={() => {}} resetTrigger={0} />}
      </div>

      {/* Lead 360 Modal when clicked from Inbox or Follow-Up */}
      {selectedLead360 && (
        <Lead360Modal
          lead={selectedLead360}
          onClose={() => setSelectedLead360(null)}
          onBookAppointment={(name, email) => setBookLeadModal({ name, email })}
        />
      )}

      {/* Book Appointment Modal */}
      {bookLeadModal && (
        <BookAppointmentModal
          open={true}
          onClose={() => setBookLeadModal(null)}
          defaults={{ request: { customer: { name: bookLeadModal.name, email: bookLeadModal.email } } }}
        />
      )}

      {/* Campaign Wizard Modal */}
      {showCampaignWizard && (
        <CampaignWizardModal
          onClose={() => setShowCampaignWizard(false)}
          onCampaignCreated={() => setActiveTab('campaigns')}
        />
      )}
    </div>
  );
}
