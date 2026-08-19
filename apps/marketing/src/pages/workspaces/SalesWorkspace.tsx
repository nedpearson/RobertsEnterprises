import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import DashboardView from '@/components/vowos/DashboardView';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import RosterTab from '@/components/vowos/shared/RosterTab';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Invoice, formatCents, formatDate } from '@/data/vowosData';
import { StatusBadge } from '@/components/vowos/ui';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', module: 'sales.core' },
  { id: 'invoices', label: 'Invoices', module: 'sales.core' },
  { id: 'payments', label: 'Payments', module: 'sales.core' },
  { id: 'contracts', label: 'Contracts', module: 'sales.contracts' },
  { id: 'layaway', label: 'Layaway', module: 'sales.layaway' },
  { id: 'payment-plans', label: 'Payment Plans', module: 'sales.payment_plans' },
  { id: 'returns', label: 'Returns', module: 'sales.returns' },
  { id: 'refunds', label: 'Refunds', module: 'sales.refunds' },
  { id: 'alterations', label: 'Alterations', module: 'alterations.core' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SalesWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolveFeatureAvailability } = useModuleResolution();
  const { invoices, brides } = useVowosData();

  const requested = (searchParams.get('tab') as TabId) || 'dashboard';

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'dashboard');

  const getCustomerName = (customerId: string) => {
    const bride = brides.find(b => b.id === customerId);
    return bride ? bride.name : 'Walk-in Customer';
  };

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'dashboard':
        return <DashboardView onNavigate={() => {}} />;
      case 'invoices':
        return <InvoicesView />;
      case 'payments':
        return <InvoicesView />; // InvoicesView typically shows payments as well
      case 'contracts':
        return <ContractsView />;
      case 'layaway':
        return (
          <RosterTab<Invoice>
            title="Layaway Plans"
            description="Active layaway agreements and their balances."
            data={invoices}
            filter={(i) => i.status === 'Partial'}
            primaryKey={(i) => i.id}
            searchPredicate={(i, term) => getCustomerName(i.customer).toLowerCase().includes(term) || i.id.toLowerCase().includes(term)}
            emptyLabel="No active layaway plans"
            columns={[
              { header: 'Invoice ID', render: (i) => i.id },
              { header: 'Customer', render: (i) => <span className="font-bold">{getCustomerName(i.customer)}</span> },
              { header: 'Total Value', render: (i) => formatCents(i.amountCents) },
              { header: 'Balance Due', render: (i) => <span className="text-amber-600 font-bold">{formatCents(i.amountCents - i.paidCents)}</span> },
              { header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            ]}
          />
        );
      case 'payment-plans':
        return (
          <RosterTab<Invoice>
            title="Financing & Payment Plans"
            description="Scheduled split payments and third-party financing."
            data={invoices}
            filter={(i) => i.status === 'Open' || i.status === 'Partial'}
            primaryKey={(i) => i.id}
            searchPredicate={(i, term) => getCustomerName(i.customer).toLowerCase().includes(term) || i.id.toLowerCase().includes(term)}
            emptyLabel="No active payment plans"
            columns={[
              { header: 'Invoice ID', render: (i) => i.id },
              { header: 'Customer', render: (i) => <span className="font-bold">{getCustomerName(i.customer)}</span> },
              { header: 'Total Amount', render: (i) => formatCents(i.amountCents) },
              { header: 'Next Payment Due', render: (i) => formatDate(i.dueDate) },
              { header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            ]}
          />
        );
      case 'returns':
        return (
          <RosterTab<Invoice>
            title="Customer Returns"
            description="Manage and approve customer returns and exchanges."
            data={invoices}
            filter={(i) => false} // Fake empty state for returns
            primaryKey={(i) => i.id}
            searchPredicate={(i, term) => getCustomerName(i.customer).toLowerCase().includes(term)}
            emptyLabel="No recent returns"
            columns={[
              { header: 'Return ID', render: (i) => i.id },
              { header: 'Customer', render: (i) => <span className="font-bold">{getCustomerName(i.customer)}</span> },
              { header: 'Refund Value', render: (i) => formatCents(i.amountCents) },
              { header: 'Date', render: (i) => formatDate(i.dueDate) },
            ]}
          />
        );
      case 'refunds':
        return (
          <RosterTab<Invoice>
            title="Refund Processing"
            description="Approved refunds awaiting payment dispatch."
            data={invoices}
            filter={(i) => false} // Fake empty state for refunds
            primaryKey={(i) => i.id}
            searchPredicate={(i, term) => getCustomerName(i.customer).toLowerCase().includes(term)}
            emptyLabel="No pending refunds"
            columns={[
              { header: 'Refund ID', render: (i) => i.id },
              { header: 'Customer', render: (i) => <span className="font-bold">{getCustomerName(i.customer)}</span> },
              { header: 'Amount', render: (i) => formatCents(i.amountCents) },
              { header: 'Status', render: (i) => <StatusBadge status="Pending" /> },
            ]}
          />
        );
      case 'alterations':
        return <AlterationsView />;
      default:
        return <DashboardView onNavigate={() => {}} />;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Sales</h1>
          <p className="text-stone-500">Manage orders, payments, and financial agreements.</p>
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
