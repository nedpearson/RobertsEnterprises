import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import StaffView from '@/components/vowos/StaffView';
import TimeClockView from '@/components/vowos/TimeClockView';
import PayrollView from '@/components/vowos/payroll/PayrollView';
import CommissionsView from '@/components/vowos/payroll/CommissionsView';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { FeatureKey } from '@/lib/features/featureCatalog';

interface TeamTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const TEAM_TABS: TeamTabDef[] = [
  { id: 'employees', label: 'Employees', module: 'team.employees' },
  { id: 'scheduling', label: 'Scheduling', module: 'team.scheduling' },
  { id: 'timeclock', label: 'Time Clock', module: 'team.timeclock' },
  { id: 'payroll', label: 'Payroll', module: 'team.payroll' },
  { id: 'commissions', label: 'Commissions', module: 'team.commissions' }
];

export default function TeamWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();

  const availableTabs = useMemo(() => {
    return TEAM_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'employees';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to team features.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Team</h1>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="employees" className="mt-6"><StaffView /></TabsContent>
        <TabsContent value="scheduling" className="mt-6"><UnifiedSchedulingWorkspace /></TabsContent>
        <TabsContent value="timeclock" className="mt-6"><TimeClockView /></TabsContent>
        <TabsContent value="payroll" className="mt-6"><PayrollView /></TabsContent>
        <TabsContent value="commissions" className="mt-6">
          <CommissionsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
