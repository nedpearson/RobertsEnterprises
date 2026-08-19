import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

export default function GrowthWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Growth</h1>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="overview" className="shrink-0" data-tour-id="nav-marketing">Overview</TabsTrigger>
          {can('growth.leads') && <TabsTrigger value="leads" className="shrink-0" data-tour-id="nav-leads">Leads</TabsTrigger>}
          {can('growth.social_content') && <TabsTrigger value="social" className="shrink-0" data-tour-id="nav-social_content">Social</TabsTrigger>}
          {can('growth.seo') && <TabsTrigger value="seo" className="shrink-0" data-tour-id="nav-seo">SEO</TabsTrigger>}
          {can('growth.local_seo') && <TabsTrigger value="google" className="shrink-0" data-tour-id="nav-local_seo">Google</TabsTrigger>}
          {can('growth.reputation') && <TabsTrigger value="reviews" className="shrink-0" data-tour-id="nav-reputation">Reviews</TabsTrigger>}
          {can('growth.competitors') && <TabsTrigger value="competitors" className="shrink-0" data-tour-id="nav-competitors">Competitors</TabsTrigger>}
          {can('growth.attribution') && <TabsTrigger value="attribution" className="shrink-0" data-tour-id="nav-attribution">Attribution</TabsTrigger>}
          {can('growth.website') && <TabsTrigger value="website" className="shrink-0" data-tour-id="nav-website_builder">Website</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <GrowthOverview />
        </TabsContent>
        {can('growth.leads') && (
          <TabsContent value="leads" className="mt-6">
            <LeadsView />
          </TabsContent>
        )}
        {can('growth.social_content') && (
          <TabsContent value="social" className="mt-6">
            <MarketingPage />
          </TabsContent>
        )}
        {can('growth.seo') && (
          <TabsContent value="seo" className="mt-6">
            <SearchConsoleView />
          </TabsContent>
        )}
        {can('growth.local_seo') && (
          <TabsContent value="google" className="mt-6">
            <LocalSeoCommandCenter />
          </TabsContent>
        )}
        {can('growth.reputation') && (
          <TabsContent value="reviews" className="mt-6">
            <ReputationCenter />
          </TabsContent>
        )}
        {can('growth.competitors') && (
          <TabsContent value="competitors" className="mt-6">
            <CompetitorIntelligence />
          </TabsContent>
        )}
        {can('growth.attribution') && (
          <TabsContent value="attribution" className="mt-6">
            <AttributionView />
          </TabsContent>
        )}
        {can('growth.website') && (
          <TabsContent value="website" className="mt-6">
            <WebsiteBuilderView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
