import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock, Search, Filter } from 'lucide-react';
import InventoryView from '@/components/vowos/InventoryView';
import PurchasesView from '@/components/vowos/PurchasesView';
import TransfersView from '@/components/vowos/TransfersView';
import ReturnsView from '@/components/vowos/ReturnsView';
import CatalogView from '@/features/catalog/CatalogView';
import InventoryCountManager from '@/features/proper-commerce/components/InventoryCountManager';
import CatalogManager from '@/features/proper-commerce/components/CatalogManager';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import RosterTab from '@/components/vowos/shared/RosterTab';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Gown, PurchaseOrder, formatCents, formatDate } from '@/data/vowosData';
import { StatusBadge, BeautifulEmptyState } from '@/components/vowos/ui';

const TABS = [
  { id: 'inventory', label: 'Inventory', module: 'inventory.core' },
  { id: 'designers', label: 'Designers', module: 'inventory.core' },
  { id: 'vendors', label: 'Vendors', module: 'inventory.core' },
  { id: 'catalogs', label: 'Catalogs', module: 'inventory.catalogs' },
  { id: 'purchases', label: 'Purchase Orders', module: 'purchasing.core' },
  { id: 'receiving', label: 'Receiving', module: 'purchasing.core' },
  { id: 'transfers', label: 'Transfers', module: 'transfers.core' },
  { id: 'returns', label: 'RTVs', module: 'purchasing.core' },
  { id: 'counts', label: 'Cycle Counts', module: 'inventory.counts' },
  { id: 'reservations', label: 'Reservations', module: 'inventory.reservations' },
  { id: 'special-orders', label: 'Special Orders', module: 'inventory.special_orders' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function InventoryWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolveFeatureAvailability } = useModuleResolution();
  const { gowns, purchaseOrders } = useVowosData();

  const requested = (searchParams.get('tab') as TabId) || 'inventory';

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'inventory');

  const uniqueDesigners = Array.from(new Set(gowns.map(g => g.designer))).map(d => ({ name: d }));
  const uniqueVendors = Array.from(new Set(purchaseOrders.map(p => p.vendor))).map(v => ({ name: v }));

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'inventory':
        return <InventoryView />;
      case 'designers':
        return (
          <RosterTab<{name: string}>
            title="Designers"
            description="Manage designer collections and relationships."
            data={uniqueDesigners}
            primaryKey={(d) => d.name}
            searchPredicate={(d, term) => d.name.toLowerCase().includes(term)}
            emptyLabel="No designers found"
            columns={[
              { header: 'Designer Name', render: (d) => <span className="font-bold">{d.name}</span> },
              { header: 'Active Styles', render: (d) => gowns.filter(g => g.designer === d.name).length },
            ]}
          />
        );
      case 'vendors':
        return (
          <RosterTab<{name: string}>
            title="Vendors"
            description="Manage supplier and vendor relationships."
            data={uniqueVendors}
            primaryKey={(v) => v.name}
            searchPredicate={(v, term) => v.name.toLowerCase().includes(term)}
            emptyLabel="No vendors found"
            columns={[
              { header: 'Vendor Name', render: (v) => <span className="font-bold">{v.name}</span> },
              { header: 'Recent POs', render: (v) => purchaseOrders.filter(p => p.vendor === v.name).length },
            ]}
          />
        );
      case 'catalogs':
        return <CatalogManager products={[]} onUpdate={async () => {}} />;
      case 'purchases':
        return <PurchasesView />;
      case 'receiving':
        return <PurchasesView />; // Typically handled within purchases view
      case 'transfers':
        return <TransfersView />;
      case 'returns':
        return <ReturnsView />; // Built in previous step
      case 'counts':
        return <InventoryCountManager sessions={[]} onUpdate={async () => {}} />;
      case 'reservations':
        return (
          <RosterTab<Gown>
            title="Stock Reservations"
            description="Inventory reserved for specific brides or events."
            data={gowns}
            filter={(g) => g.status === 'In Stock'} // Mocking reservations
            primaryKey={(g) => g.id}
            searchPredicate={(g, term) => g.name.toLowerCase().includes(term) || g.sku.toLowerCase().includes(term)}
            emptyLabel="No active reservations"
            columns={[
              { header: 'SKU', render: (g) => <span className="font-medium text-stone-600">{g.sku}</span> },
              { header: 'Designer', render: (g) => g.designer },
              { header: 'Style', render: (g) => <span className="font-bold">{g.name}</span> },
              { header: 'Status', render: (g) => <StatusBadge status="Reserved" /> },
            ]}
          />
        );
      case 'special-orders':
        return (
          <RosterTab<PurchaseOrder>
            title="Special Orders"
            description="Custom orders and non-stock items."
            data={purchaseOrders}
            filter={(p) => p.status === 'Ordered'} // Mocking special orders
            primaryKey={(p) => p.id}
            searchPredicate={(p, term) => p.vendor.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)}
            emptyLabel="No active special orders"
            columns={[
              { header: 'PO Number', render: (p) => <span className="font-bold">{p.id}</span> },
              { header: 'Vendor', render: (p) => p.vendor },
              { header: 'Expected', render: (p) => formatDate(p.expectedDelivery) },
              { header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            ]}
          />
        );
      default:
        return <InventoryView />;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Inventory</h1>
          <p className="text-stone-500">Manage products, purchasing, and stock levels.</p>
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
