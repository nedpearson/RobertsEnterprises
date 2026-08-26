import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import StaffView from '@/components/vowos/StaffView';
import TimeClockView from '@/components/vowos/TimeClockView';
import PayrollView from '@/components/vowos/payroll/PayrollView';
import CommissionsView from '@/components/vowos/payroll/CommissionsView';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';

const TABS = [
  { id: 'employees', label: 'Employees', module: 'team.core' },
  { id: 'scheduling', label: 'Scheduling', module: 'team.core' },
  { id: 'timeclock', label: 'Time Clock', module: 'team.timeclock' },
  { id: 'payroll', label: 'Payroll', module: 'team.payroll' },
  { id: 'commissions', label: 'Commissions', module: 'team.payroll' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TeamWorkspace() {
  const { requestedTab, setTab } = useWorkspaceTab('team', 'employees');
  const { resolveFeatureAvailability } = useModuleResolution();

  const requested = requestedTab as TabId;

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'employees');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'employees':
        return <StaffView />;
      case 'scheduling':
        return <UnifiedSchedulingWorkspace />;
      case 'timeclock':
        return <TimeClockView />;
      case 'payroll':
        return <PayrollView />;
      case 'commissions':
        return <CommissionsView />;
      default:
        return <StaffView />;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Team</h1>
          <p className="text-stone-500">Manage employees, schedules, and payroll.</p>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={setTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide shrink-0">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {visible.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!t.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-6 flex-1 min-h-0">
            {t.effective ? (
              renderBody(t.id)
            ) : (
              <ModuleLocked
                title={t.label}
                description="This feature is available as an upgrade to your current plan."
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
