import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import LedgersView from '@/components/vowos/LedgersView';
import ReturnsView from '@/components/vowos/ReturnsView';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Invoice, Customer } from '@/data/vowosData';
import { InvoiceRosterTab } from '@/components/vowos/sales/InvoiceRosterTab';
import CustomerRosterTab from '@/components/vowos/customers/CustomerRosterTab';
import TerminalCheckoutModal from '@/features/pos/TerminalCheckoutModal';

const TABS = [
  { id: 'invoices', label: 'Invoices', module: 'sales.core' },
  { id: 'payments', label: 'Payments', module: 'sales.core' },
  { id: 'contracts', label: 'Contracts', module: 'sales.contracts' },
  { id: 'alterations', label: 'Alterations', module: 'alterations.core' },
  { id: 'orders', label: 'Orders', module: 'sales.core' },
  { id: 'pos', label: 'POS', module: 'sales.core' },
  { id: 'layaway', label: 'Layaway', module: 'sales.layaway' },
  { id: 'payment-plans', label: 'Payment Plans', module: 'sales.payment_plans' },
  { id: 'returns', label: 'Returns', module: 'sales.returns' },
  { id: 'refunds', label: 'Refunds', module: 'sales.refunds' },
  { id: 'pickup', label: 'Pickups', module: 'sales.core' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SalesWorkspace() {
  const { requestedTab, setTab } = useWorkspaceTab('sales', 'invoices');
  const { resolveFeatureAvailability } = useModuleResolution();
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const requested = requestedTab as TabId;

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'invoices');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'invoices':
      case 'payments':
        return <InvoicesView />;
      case 'contracts':
        return <ContractsView />;
      case 'alterations':
        return <AlterationsView />;
      case 'orders':
        return (
          <InvoiceRosterTab
            title="Order Book"
            description="All invoices and orders."
            emptyLabel="No orders found"
            onSelect={setSelectedInvoice}
          />
        );
      case 'pos':
        return <LedgersView />;
      case 'layaway':
        return (
          <InvoiceRosterTab
            title="Layaway Plans"
            description="Active layaway agreements and their balances."
            filterFn={(i) => i.status === 'Partial'}
            emptyLabel="No active layaway plans"
            onSelect={setSelectedInvoice}
          />
        );
      case 'payment-plans':
        return (
          <InvoiceRosterTab
            title="Financing & Payment Plans"
            description="Scheduled split payments and third-party financing."
            filterFn={(i) => i.status === 'Open' || i.status === 'Partial'}
            emptyLabel="No active payment plans"
            onSelect={setSelectedInvoice}
          />
        );
      case 'returns':
        return <ReturnsView />;
      case 'refunds':
        return (
          <InvoiceRosterTab
            title="Refund Processing"
            description="Approved refunds awaiting payment dispatch."
            filterFn={(i: Invoice) =>
              i.status === 'Refunded' ||
              i.status === 'Void' ||
              i.paidCents < 0 ||
              (!!i.notes && String(i.notes).toLowerCase().includes('refund')) ||
              !!i.refund_status ||
              (i.amountCents < 0)
            }
            emptyLabel="No pending refunds"
            onSelect={setSelectedInvoice}
          />
        );
      case 'pickup':
        return (
          <CustomerRosterTab
            title="Ready for Pickup"
            description="Brides whose orders have been purchased or are ready to be picked up."
            filter={(c: Customer) => c.status === 'Purchased' || c.status === 'Picked Up'}
            emptyLabel="No brides ready for pickup"
          />
        );
      default:
        return null;
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
      <TerminalCheckoutModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}
