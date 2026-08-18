import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import StaffView from '@/components/vowos/StaffView';
import TimeClockView from '@/components/vowos/TimeClockView';
import PayrollView from '@/components/vowos/payroll/PayrollView';

export default function TeamWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'employees';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Team</h1>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="timeclock">Time Clock</TabsTrigger>
          {can('payroll.core') && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <StaffView />
        </TabsContent>
        
        <TabsContent value="timeclock" className="mt-6">
          <TimeClockView />
        </TabsContent>

        {can('payroll.core') && (
          <TabsContent value="payroll" className="mt-6">
            <PayrollView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
