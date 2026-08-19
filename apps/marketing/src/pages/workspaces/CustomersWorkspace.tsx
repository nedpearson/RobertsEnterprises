import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CustomersView from '@/components/vowos/CustomersView';
import CommunicationsView from '@/components/vowos/CommunicationsView';
import { CalendarCheck } from 'lucide-react';

export default function CustomersWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'customers';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Customers</h1>
        <p className="text-stone-500">Manage customer relationships and communications.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="followups">Follow-Ups</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-6">
          <CustomersView />
        </TabsContent>
        
        <TabsContent value="inbox" className="mt-6">
          <CommunicationsView />
        </TabsContent>
        
        <TabsContent value="followups" className="mt-6">
          <div className="flex flex-col items-center justify-center p-12 bg-stone-50 rounded-lg border border-stone-200 border-dashed">
            <CalendarCheck className="h-12 w-12 text-stone-400 mb-4" />
            <h3 className="text-lg font-medium text-stone-900">Follow-ups coming soon</h3>
            <p className="text-stone-500">Track and manage your customer follow-ups here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
