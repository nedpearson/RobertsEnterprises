import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import CustomersView from '@/components/vowos/CustomersView';
import CommunicationsView from '@/components/vowos/CommunicationsView';
import { FeatureKey } from '@/lib/features/featureCatalog';

interface CustomerTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const CUSTOMERS_TABS: CustomerTabDef[] = [
  { id: 'customers', label: 'Directory', module: 'customers' },
  { id: 'inbox', label: 'Inbox', module: 'customers.inbox' },
  { id: 'style-profiles', label: 'Style Profiles', module: 'customers.style_profiles' },
  { id: 'measurements', label: 'Measurements', module: 'customers.measurements' },
  { id: 'try-ons', label: 'Try-Ons', module: 'customers.try_ons' },
  { id: 'customer-portal', label: 'Portal', module: 'customers.portals' }
];

export default function CustomersWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();

  const availableTabs = useMemo(() => {
    return CUSTOMERS_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'customers';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to customer features.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Customers</h1>
        <p className="text-stone-500">Manage brides, communications, and relationships.</p>
      </div>
      
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="customers" className="mt-6"><CustomersView /></TabsContent>
        <TabsContent value="inbox" className="mt-6"><CommunicationsView /></TabsContent>

        {CUSTOMERS_TABS.filter(t => !['customers', 'inbox'].includes(t.id)).map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-6">
               <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
                 {t.label} capabilities are loading...
               </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
