import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import InventoryView from '@/components/vowos/InventoryView';
import PurchasesView from '@/components/vowos/PurchasesView';
import TransfersView from '@/components/vowos/TransfersView';
import InventoryCountManager from '@/features/proper-commerce/components/InventoryCountManager';
import CatalogManager from '@/features/proper-commerce/components/CatalogManager';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useVowosData } from '@/contexts/VowosDataContext';
import { formatCents } from '@/data/vowosData';
import { GownRosterTab } from '@/components/vowos/inventory/GownRosterTab';
import { PurchaseOrderRosterTab } from '@/components/vowos/inventory/PurchaseOrderRosterTab';
import RosterTab from '@/components/vowos/shared/RosterTab';

const TABS = [
  { id: 'inventory', label: 'Inventory', module: 'inventory.core' },
  { id: 'products', label: 'Products', module: 'inventory.core' },
  { id: 'purchases', label: 'Purchases', module: 'purchasing.core' },
  { id: 'receiving', label: 'Receiving', module: 'purchasing.core' },
  { id: 'transfers', label: 'Transfers', module: 'transfers.core' },
  { id: 'vendors', label: 'Vendors', module: 'inventory.core' },
  { id: 'designers', label: 'Designers', module: 'inventory.core' },
  { id: 'counts', label: 'Cycle Counts', module: 'inventory.counts' },
  { id: 'catalogs', label: 'Catalogs', module: 'inventory.catalogs' },
  { id: 'adjustments', label: 'Adjustments', module: 'inventory.core' },
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

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'inventory':
      case 'products':
        return <InventoryView />;
      case 'purchases':
      case 'receiving':
        return <PurchasesView />;
      case 'transfers':
        return <TransfersView />;
      case 'counts':
        return <InventoryCountManager />;
      case 'catalogs':
        return <CatalogManager />;
      case 'adjustments':
        return (
          <GownRosterTab
            title="Stock Adjustments"
            description="Manage inventory levels and register manual adjustments."
            emptyLabel="No gowns available for adjustment"
          />
        );
      case 'reservations':
        return (
          <GownRosterTab
            title="Reservations"
            description="Gowns currently reserved or assigned to a specific bride."
            filterFn={(g) => g.status === 'Reserved' || g.status === 'Assigned'}
            emptyLabel="No active reservations"
          />
        );
      case 'special-orders':
        return (
          <PurchaseOrderRosterTab
            title="Special Orders"
            description="Purchase orders designated for specific customers."
            filterFn={(po) => !!po.assignedCustomer}
            emptyLabel="No special orders found"
          />
        );
      case 'vendors': {
        const vendorMap = new Map<string, { name: string; poCount: number; totalValue: number }>();
        purchaseOrders.forEach(po => {
          const v = vendorMap.get(po.vendor) || { name: po.vendor, poCount: 0, totalValue: 0 };
          v.poCount += 1;
          v.totalValue += po.amountCents;
          vendorMap.set(po.vendor, v);
        });
        const vendors = Array.from(vendorMap.values());
        return (
          <RosterTab
            title="Vendors"
            description="Active vendors and total purchase order volume."
            data={vendors}
            primaryKey={(v) => v.name}
            searchPredicate={(v, term) => v.name.toLowerCase().includes(term)}
            emptyLabel="No vendors found"
            columns={[
              { header: 'Vendor Name', render: (v) => <span className="font-bold text-stone-900">{v.name}</span> },
              { header: 'Purchase Orders', render: (v) => v.poCount.toString() },
              { header: 'Total Ordered Value', render: (v) => formatCents(v.totalValue) },
            ]}
          />
        );
      }
      case 'designers': {
        const designerMap = new Map<string, { name: string; gownCount: number; stock: number }>();
        gowns.forEach(g => {
          const d = designerMap.get(g.designer) || { name: g.designer, gownCount: 0, stock: 0 };
          d.gownCount += 1;
          d.stock += g.stock;
          designerMap.set(g.designer, d);
        });
        const designers = Array.from(designerMap.values());
        return (
          <RosterTab
            title="Designers"
            description="Designers represented in your catalog and current inventory levels."
            data={designers}
            primaryKey={(d) => d.name}
            searchPredicate={(d, term) => d.name.toLowerCase().includes(term)}
            emptyLabel="No designers found"
            columns={[
              { header: 'Designer', render: (d) => <span className="font-bold text-stone-900">{d.name}</span> },
              { header: 'Catalog Styles', render: (d) => d.gownCount.toString() },
              { header: 'Total Units in Stock', render: (d) => d.stock.toString() },
            ]}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Inventory</h1>
          <p className="text-stone-500">Manage products, purchasing, and catalogs.</p>
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
