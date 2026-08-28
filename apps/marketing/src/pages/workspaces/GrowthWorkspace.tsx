import React, { useState, useEffect } from 'react';
import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';

import { GrowthOverview } from '@/components/vowos/growth/GrowthOverview';
import LeadsView from '@/components/vowos/LeadsView';
import MarketingPage from '@/features/marketing/pages/MarketingPage';
import { SearchConsoleView } from '@/components/vowos/growth/SearchConsoleView';
import { LocalSeoCommandCenter } from '@/components/vowos/growth/LocalSeoCommandCenter';
import { ReputationCenter } from '@/components/vowos/growth/ReputationCenter';
import { CompetitorIntelligence } from '@/components/vowos/growth/CompetitorIntelligence';
import { AttributionView } from '@/components/vowos/growth/AttributionView';
import { WebsiteBuilderView } from '@/components/vowos/growth/WebsiteBuilderView';
import ConnectionsView from '@/features/marketing/components/ConnectionsView';

const TABS = [
  { id: 'overview', label: 'Overview', module: 'growth.core' },
  { id: 'leads', label: 'Leads', module: 'growth.leads' },
  { id: 'social', label: 'Social', module: 'growth.social_content' },
  { id: 'seo', label: 'SEO', module: 'growth.seo' },
  { id: 'google', label: 'Google', module: 'growth.local_seo' },
  { id: 'reviews', label: 'Reviews', module: 'growth.reputation' },
  { id: 'competitors', label: 'Competitors', module: 'growth.competitors' },
  { id: 'attribution', label: 'Attribution', module: 'growth.attribution' },
  { id: 'website', label: 'Website', module: 'growth.website' },
  { id: 'connections', label: 'Connections', module: 'growth.core' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type PrimaryGroup = 'performance' | 'social' | 'reputation' | 'channels';

const TAB_GROUP_MAP: Record<TabId, PrimaryGroup> = {
  overview: 'performance',
  leads: 'performance',
  attribution: 'performance',
  social: 'social',
  website: 'social',
  reviews: 'reputation',
  google: 'reputation',
  competitors: 'reputation',
  seo: 'reputation',
  connections: 'channels'
};

export default function GrowthWorkspace() {
  const { requestedTab, setTab, searchParams } = useWorkspaceTab('growth', 'overview');
  const { can } = useTenantEntitlements();

  const activeTab = (TABS.some((t) => t.id === requestedTab) ? requestedTab : 'overview') as TabId;
  const activePrimary = TAB_GROUP_MAP[activeTab] || 'performance';

  const handlePrimaryChange = (group: PrimaryGroup) => {
    switch (group) {
      case 'performance':
        setTab('overview');
        break;
      case 'social':
        setTab('social');
        break;
      case 'reputation':
        setTab('reviews');
        break;
      case 'channels':
        setTab('connections');
        break;
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <GrowthOverview />;
      case 'leads':
        return <LeadsView />;
      case 'attribution':
        return <AttributionView />;
      case 'social':
        return <MarketingPage initialTab={searchParams.get('view') as any} />;
      case 'website':
        return <WebsiteBuilderView />;
      case 'reviews':
        return <ReputationCenter hideHeader={true} />;
      case 'google':
        return <LocalSeoCommandCenter />;
      case 'competitors':
        return <CompetitorIntelligence />;
      case 'seo':
        return <SearchConsoleView />;
      case 'connections':
        return <ConnectionsView />;
      default:
        return <GrowthOverview />;
    }
  };

  return (
    <div className="space-y-4 relative h-full flex flex-col">
      {/* Streamlined Single Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 border-b border-rose-100/60 pb-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Growth & Marketing</h1>
          <p className="text-xs text-stone-500">Manage leads, social marketing, SEO, reviews, and competitive intelligence.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTab('leads')} className="gap-1 text-xs h-8 font-medium">
            <Plus className="h-3.5 w-3.5" />
            New Lead
          </Button>
          <Button className="gap-1 text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow-xs" onClick={() => setTab('social')}>
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* 4 Clean Primary Pillars Navigation Bar */}
      <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl overflow-x-auto shrink-0">
        {[
          { key: 'performance', label: '📊 Performance & Leads' },
          { key: 'social', label: '📲 Content & Social' },
          { key: 'reputation', label: '🌟 Reputation & SEO' },
          { key: 'channels', label: '🔗 Channels & Connections' }
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => handlePrimaryChange(p.key as PrimaryGroup)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activePrimary === p.key
                ? 'bg-white text-stone-900 shadow-sm font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Secondary Sub-Pills for the Active Pillar */}
      {activePrimary === 'performance' && (
        <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/60 p-1 rounded-lg overflow-x-auto shrink-0">
          {[
            { subId: 'overview', label: '📊 Overview' },
            { subId: 'leads', label: '📥 Leads Pipeline', module: 'growth.leads' },
            { subId: 'attribution', label: '📈 Funnel Attribution', module: 'growth.attribution' }
          ].filter(s => !s.module || can(s.module as any)).map((sub) => (
            <button
              key={sub.subId}
              onClick={() => setTab(sub.subId)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === sub.subId ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {activePrimary === 'social' && (
        <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/60 p-1 rounded-lg overflow-x-auto shrink-0">
          {[
            { subId: 'social', label: '📱 Social & Campaigns', module: 'growth.social_content' },
            { subId: 'website', label: '🌐 Website Builder', module: 'growth.website' }
          ].filter(s => !s.module || can(s.module as any)).map((sub) => (
            <button
              key={sub.subId}
              onClick={() => setTab(sub.subId)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === sub.subId ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {activePrimary === 'reputation' && (
        <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/60 p-1 rounded-lg overflow-x-auto shrink-0">
          {[
            { subId: 'reviews', label: '🌟 Customer Reviews', module: 'growth.reputation' },
            { subId: 'google', label: '📍 Google Business', module: 'growth.local_seo' },
            { subId: 'competitors', label: '🤖 Competitor Radar', module: 'growth.competitors' },
            { subId: 'seo', label: '🔍 Search Console SEO', module: 'growth.seo' }
          ].filter(s => !s.module || can(s.module as any)).map((sub) => (
            <button
              key={sub.subId}
              onClick={() => setTab(sub.subId)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === sub.subId ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Main View Content */}
      <div className="mt-2 flex-1 min-h-0">
        {renderActiveView()}
      </div>
    </div>
  );
}
