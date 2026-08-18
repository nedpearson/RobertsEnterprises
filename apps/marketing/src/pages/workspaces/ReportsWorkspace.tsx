import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import ReportsView from '@/components/vowos/ReportsView';
import LedgersView from '@/components/vowos/LedgersView';

export default function ReportsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'sales';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Reports</h1>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {can('reports.advanced') && <TabsTrigger value="accounting">Accounting</TabsTrigger>}
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <ReportsView />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <div className="p-8 text-center text-stone-500">Analytics dashboard — coming soon</div>
        </TabsContent>

        {can('reports.advanced') && (
          <TabsContent value="accounting" className="mt-6">
            <LedgersView />
          </TabsContent>
        )}

        <TabsContent value="marketing" className="mt-6">
          <div className="p-8 text-center text-stone-500">Marketing reports — coming soon</div>
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="p-8 text-center text-stone-500">Staff reports — coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
