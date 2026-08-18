import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';

export default function SalesWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();
  
  const currentTab = searchParams.get('tab') || 'payments';
  
  const canViewContracts = can('sales.contracts');
  const canViewAlterations = can('alterations.core');

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Sales</h1>
        <p className="text-stone-500">Manage payments, contracts, and alterations.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          {canViewContracts && (
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
          )}
          {canViewAlterations && (
            <TabsTrigger value="alterations">Alterations</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <InvoicesView />
        </TabsContent>
        
        {canViewContracts && (
          <TabsContent value="contracts" className="mt-6">
            <ContractsView />
          </TabsContent>
        )}
        
        {canViewAlterations && (
          <TabsContent value="alterations" className="mt-6">
            <AlterationsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
