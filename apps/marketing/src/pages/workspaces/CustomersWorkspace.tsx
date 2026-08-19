import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { Lock } from 'lucide-react';
import CustomersView from '@/components/vowos/CustomersView';
import CommunicationsView from '@/components/vowos/CommunicationsView';

export default function CustomersWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'customers';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const tabs = [
    { id: 'customers', label: 'Customers', module: 'customers.core' },
    { id: 'customer-360', label: 'Customer 360', module: 'customers.core' },
    { id: 'inbox', label: 'Inbox', module: 'communications.core' },
    { id: 'follow-ups', label: 'Follow-Ups', module: 'customers.core' },
    { id: 'style-profiles', label: 'Style Profiles', module: 'customers.style_profiles' },
    { id: 'measurements', label: 'Measurements', module: 'customers.measurements' },
    { id: 'try-ons', label: 'Try-Ons', module: 'customers.core' },
    { id: 'favorites', label: 'Favorites', module: 'customers.portal' },
    { id: 'files', label: 'Files', module: 'customers.core' },
    { id: 'customer-portal', label: 'Customer Portal', module: 'customers.portal' },
    { id: 'timeline', label: 'Timeline', module: 'customers.core' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Customers</h1>
        <p className="text-stone-500">Manage brides, communications, and relationships.</p>
      </div>
      
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!can(t.module) && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="customers" className="mt-6"><CustomersView /></TabsContent>
        <TabsContent value="customer-360" className="mt-6"><CustomersView /></TabsContent>
        
        <TabsContent value="inbox" className="mt-6">
          {can('communications.core') ? <CommunicationsView /> : <ModuleLocked title="Unified Inbox" description="Manage SMS and email communications directly in VowOS." />}
        </TabsContent>

        {tabs.filter(t => !['customers', 'customer-360', 'inbox'].includes(t.id)).map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-6">
            {!can(t.module) ? (
               <ModuleLocked title={t.label} description="This feature is available as an upgrade to your current plan." />
            ) : (
               <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
                 {t.label} capabilities are loading...
               </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
