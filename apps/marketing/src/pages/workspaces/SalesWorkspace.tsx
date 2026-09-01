import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import LedgersView from '@/components/vowos/LedgersView';
import ReturnsView from '@/components/vowos/ReturnsView';
import PaymentPlansView from '@/components/vowos/sales/PaymentPlansView';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
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

  const resolved = TABS.map((entry) => {
    const resolution = resolveFeatureAvailability(entry.module);
    return { ...entry, effective: resolution.effective, reason: resolution.reason };
  });
  const visible = resolved.filter((entry) => entry.reason !== 'WORKSPACE_DISABLED' && entry.reason !== 'PARENT_DISABLED');
  const currentTab: TabId = visible.some((entry) => entry.id === requested) ? requested : (visible[0]?.id ?? 'invoices');

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
        return <PaymentPlansView planType="LAYAWAY" />;
      case 'payment-plans':
        return <PaymentPlansView planType="PAYMENT_PLAN" />;
      case 'returns':
        return <ReturnsView />;
      case 'refunds':
        return (
          <InvoiceRosterTab
            title="Refund Processing"
            description="Approved refunds awaiting payment dispatch."
            filterFn={(invoice: Invoice) =>
              invoice.status === 'Refunded' ||
              invoice.status === 'Void' ||
              invoice.paidCents < 0 ||
              (!!invoice.notes && String(invoice.notes).toLowerCase().includes('refund')) ||
              !!invoice.refund_status ||
              invoice.amountCents < 0
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
            filter={(customer: Customer) => customer.status === 'Purchased' || customer.status === 'Picked Up'}
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
            {visible.map((entry) => (
              <TabsTrigger key={entry.id} value={entry.id} className="whitespace-nowrap flex items-center gap-1.5">
                {entry.label} {!entry.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((entry) => (
          <TabsContent key={entry.id} value={entry.id} className="mt-6 flex-1 min-h-0">
            {entry.effective ? renderBody(entry.id) : (
              <ModuleLocked title={entry.label} description="This feature is available as an upgrade to your current plan." />
            )}
          </TabsContent>
        ))}
      </Tabs>
      <TerminalCheckoutModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}
