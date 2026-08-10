import { useState, useEffect } from 'react';
import {
  fetchCommerceConnection,
  fetchCatalogProducts,
  fetchCommerceOrders,
  fetchInventoryLevels,
  fetchInventoryMovements,
  fetchCountSessions,
  fetchSyncIssues
} from '../api/properCommerceApi';
import {
  CatalogProduct,
  CommerceConnection,
  CommerceOrder,
  CommerceSyncIssue,
  InventoryCountSession,
  InventoryLevel,
  InventoryMovement
} from '../types/properCommerceTypes';

import OnlineStoreOverview from '../components/OnlineStoreOverview';
import CatalogManager from '../components/CatalogManager';
import VendorImportWizard from '../components/VendorImportWizard';
import InventoryLevelsView from '../components/InventoryLevelsView';
import InventoryCountManager from '../components/InventoryCountManager';
import ShopifyOrdersView from '../components/ShopifyOrdersView';
import CommerceReportsView from '../components/CommerceReportsView';
import CommerceSettingsView from '../components/CommerceSettingsView';
import ShopifyConnectModal from '../components/ShopifyConnectModal';

import { PageHeader } from '@/components/vowos/ui';
import { ShoppingBag, Package, Layers, MapPin, ClipboardList, FileText, BarChart3, Settings, AlertCircle, Link2 } from 'lucide-react';

export type ProperCommerceTab =
  | 'overview'
  | 'catalog'
  | 'imports'
  | 'inventory'
  | 'counts'
  | 'orders'
  | 'reports'
  | 'settings';

export default function OnlineStorePage() {
  const [tab, setTab] = useState<ProperCommerceTab>('overview');
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // Data States
  const [connection, setConnection] = useState<CommerceConnection | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [levels, setLevels] = useState<InventoryLevel[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sessions, setSessions] = useState<InventoryCountSession[]>([]);
  const [syncIssues, setSyncIssues] = useState<CommerceSyncIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [conn, prods, ords, lvls, movs, sess, issues] = await Promise.all([
        fetchCommerceConnection(),
        fetchCatalogProducts(),
        fetchCommerceOrders(),
        fetchInventoryLevels(),
        fetchInventoryMovements(),
        fetchCountSessions(),
        fetchSyncIssues(),
      ]);
      setConnection(conn);
      setProducts(prods);
      setOrders(ords);
      setLevels(lvls);
      setMovements(movs);
      setSessions(sess);
      setSyncIssues(issues);
    } catch (e) {
      console.error('Failed to load Proper Commerce data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!connection) return null;

  const tabs: { key: ProperCommerceTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: ShoppingBag },
    { key: 'catalog', label: 'Catalog', icon: Package },
    { key: 'imports', label: 'Vendor Imports', icon: Layers },
    { key: 'inventory', label: 'Inventory', icon: MapPin },
    { key: 'counts', label: 'Physical Counts', icon: ClipboardList },
    { key: 'orders', label: 'Orders & Fulfillment', icon: FileText },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Store — Proper & Co."
        subtitle="Shopify ecommerce product master, vendor catalog imports, location inventory, and order fulfillment."
        action={
          <button
            onClick={() => setConnectModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-colors"
          >
            <Link2 className="h-4 w-4 text-brand-primary" /> Shopify Settings
          </button>
        }
      />

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Contents */}
      {tab === 'overview' && (
        <OnlineStoreOverview
          connection={connection}
          products={products}
          orders={orders}
          syncIssues={syncIssues}
          onOpenConnectModal={() => setConnectModalOpen(true)}
          onNavigateTab={(t) => setTab(t as ProperCommerceTab)}
        />
      )}

      {tab === 'catalog' && <CatalogManager products={products} movements={movements} onUpdate={loadData} />}

      {tab === 'imports' && (
        <VendorImportWizard
          onImportComplete={() => {
            loadData();
            setTab('catalog');
          }}
        />
      )}

      {tab === 'inventory' && <InventoryLevelsView levels={levels} movements={movements} products={products} onUpdate={loadData} />}

      {tab === 'counts' && <InventoryCountManager sessions={sessions} onUpdate={loadData} />}

      {tab === 'orders' && <ShopifyOrdersView orders={orders} onUpdate={loadData} />}

      {tab === 'reports' && <CommerceReportsView products={products} orders={orders} />}

      {tab === 'settings' && (
        <CommerceSettingsView connection={connection} onOpenConnectModal={() => setConnectModalOpen(true)} />
      )}

      {/* Connect Modal */}
      <ShopifyConnectModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        connection={connection}
        onUpdate={loadData}
      />
    </div>
  );
}
