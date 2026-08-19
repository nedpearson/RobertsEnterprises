import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import ReportsView from '@/components/vowos/ReportsView';
import LedgersView from '@/components/vowos/LedgersView';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';

const TABS = [
  { id: 'executive', label: 'Executive', module: 'reports.core' },
  { id: 'sales', label: 'Sales', module: 'reports.core' },
  { id: 'inventory', label: 'Inventory', module: 'reports.core' },
  { id: 'accounting', label: 'Accounting', module: 'reports.accounting' },
  { id: 'marketing', label: 'Marketing', module: 'reports.core' },
  { id: 'staff', label: 'Team', module: 'reports.core' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ReportsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolveFeatureAvailability } = useModuleResolution();

  const requested = (searchParams.get('tab') as TabId) || 'executive';

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'executive');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'executive':
        return <ReportsView filterTabs={['revenue', 'locations']} />;
      case 'sales':
        return <ReportsView filterTabs={['goals', 'sales-range']} />;
      case 'inventory':
        return <ReportsView filterTabs={['open-orders', 'deliveries']} />;
      case 'accounting':
        return <LedgersView />;
      case 'marketing':
        return <ReportsView filterTabs={['bookings', 'follow-ups']} />;
      case 'staff':
        return <ReportsView filterTabs={['hours', 'payroll-executive', 'payroll-locations']} />;
      default:
        return <ReportsView />;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Reports</h1>
          <p className="text-stone-500">Business analytics and financial ledgers.</p>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full flex-1 flex flex-col min-h-0">
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
