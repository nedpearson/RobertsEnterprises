import { useState, useEffect } from 'react';
import {
  fetchCommerceConnections,
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
import CommerceSyncDiagnosticsView from '../components/CommerceSyncDiagnosticsView';
import ShopifyConnectModal from '../components/ShopifyConnectModal';
import GoDaddyConnectModal from '../components/GoDaddyConnectModal';
import SquareConnectModal from '../components/SquareConnectModal';

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
  | 'sync-issues'
  | 'settings';

export default function OnlineStorePage() {
  const [tab, setTab] = useState<ProperCommerceTab>('overview');
  const [shopifyModalOpen, setShopifyModalOpen] = useState(false);
  const [godaddyModalOpen, setGoDaddyModalOpen] = useState(false);
  const [squareModalOpen, setSquareModalOpen] = useState(false);

  // Data States
  const [connections, setConnections] = useState<CommerceConnection[] | null>(null);
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
      const [conns, prods, ords, lvls, movs, sess, issues] = await Promise.all([
        fetchCommerceConnections(),
        fetchCatalogProducts(),
        fetchCommerceOrders(),
        fetchInventoryLevels(),
        fetchInventoryMovements(),
        fetchCountSessions(),
        fetchSyncIssues(),
      ]);
      setConnections(conns);
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

  if (!connections) return null;

  const tabs: { key: ProperCommerceTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: ShoppingBag },
    { key: 'catalog', label: 'Catalog', icon: Package },
    { key: 'imports', label: 'Vendor Imports', icon: Layers },
    { key: 'inventory', label: 'Inventory', icon: MapPin },
    { key: 'counts', label: 'Physical Counts', icon: ClipboardList },
    { key: 'orders', label: 'Orders & Fulfillment', icon: FileText },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'sync-issues', label: 'Sync Diagnostics', icon: AlertCircle },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Store — Proper & Co."
        subtitle="Shopify ecommerce product master, vendor catalog imports, location inventory, and order fulfillment."
        action={
          <button
            onClick={() => setTab('settings')}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-colors"
          >
            <Link2 className="h-4 w-4 text-brand-primary" /> Manage Integrations
          </button>
        }
      />

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold ${
              tab === t.key
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            <t.icon className={`h-4 w-4 ${t.key === 'sync-issues' && syncIssues.length > 0 && tab !== 'sync-issues' ? 'text-rose-500' : ''}`} />
            {t.label}
            {t.key === 'sync-issues' && syncIssues.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
                {syncIssues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-Tab Contents */}
      {tab === 'overview' && (
        <OnlineStoreOverview
          connections={connections}
          products={products}
          orders={orders}
          syncIssues={syncIssues}
          onOpenConnectModal={() => setShopifyModalOpen(true)}
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

      {tab === 'sync-issues' && <CommerceSyncDiagnosticsView issues={syncIssues} onRefresh={loadData} />}

      {tab === 'settings' && (
        <CommerceSettingsView 
          connections={connections} 
          onOpenShopifyModal={() => setShopifyModalOpen(true)} 
          onOpenGoDaddyModal={() => setGoDaddyModalOpen(true)} 
          onOpenSquareModal={() => setSquareModalOpen(true)}
        />
      )}

      {/* Connect Modals */}
      <ShopifyConnectModal
        open={shopifyModalOpen}
        onClose={() => setShopifyModalOpen(false)}
        connection={connections.find(c => c.provider === 'shopify')}
        onUpdate={loadData}
      />
      
      <GoDaddyConnectModal
        open={godaddyModalOpen}
        onClose={() => setGoDaddyModalOpen(false)}
        connection={connections.find(c => c.provider === 'godaddy')}
        onUpdate={loadData}
      />

      <SquareConnectModal
        open={squareModalOpen}
        onClose={() => setSquareModalOpen(false)}
        connection={connections.find(c => c.provider === 'square')}
        onUpdate={loadData}
      />
    </div>
  );
}
