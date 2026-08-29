import { CommerceConnection, CatalogProduct, CommerceOrder, CommerceSyncIssue } from '../types/properCommerceTypes';
import { formatCents } from '@/data/vowosData';
import { StatCard } from '@/components/vowos/ui';
import { ShoppingBag, Package, TrendingUp, AlertCircle, CheckCircle2, Clock, ArrowRight, ClipboardList, RefreshCw, Layers, Store, Globe } from 'lucide-react';

interface OnlineStoreOverviewProps {
  connections: CommerceConnection[];
  products: CatalogProduct[];
  orders: CommerceOrder[];
  syncIssues: CommerceSyncIssue[];
  onOpenConnectModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function OnlineStoreOverview({
  connections,
  products,
  orders,
  syncIssues,
  onOpenConnectModal,
  onNavigateTab,
}: OnlineStoreOverviewProps) {
  const publishedCount = products.filter((p) => p.publishStatus === 'published').length;
  const draftCount = products.filter((p) => p.publishStatus === 'draft').length;
  const unfulfilledOrders = orders.filter((o) => o.fulfillmentStatus !== 'fulfilled');
  const todayRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);

  const batonRougeTotalStock = products.reduce(
    (acc, p) => acc + p.variants.reduce((vs, v) => vs + v.inventoryBatonRouge, 0),
    0
  );
  const covingtonTotalStock = products.reduce(
    (acc, p) => acc + p.variants.reduce((vs, v) => vs + v.inventoryCovington, 0),
    0
  );

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner: Omnichannel Connection Health */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-semibold text-rose-300 ring-1 ring-inset ring-focus-ring/40 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" /> Proper &amp; Co. Omnichannel
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                connections.some(c => c.status === 'connected') 
                  ? 'bg-status-success/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/40'
              }`}>
                <CheckCircle2 className={`h-3.5 w-3.5 ${connections.some(c => c.status === 'connected') ? 'text-emerald-400' : 'text-amber-400'}`} /> 
                {connections.filter(c => c.status === 'connected').length} Stores Connected
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
              Online Store Operations
            </h1>
            <p className="text-xs text-stone-300 max-w-xl">
              Centralized product master, multi-location inventory, vendor catalog imports, and order fulfillment for Proper &amp; Co. storefront.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('settings')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-stone-900 shadow-md hover:bg-brand-soft transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-brand-primary" /> Manage Integrations
            </button>
            <button
              onClick={() => onNavigateTab('catalog')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover transition-colors"
            >
              <Package className="h-4 w-4" /> Open Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Sync Issues Alert Banner */}
      {syncIssues.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 mt-0.5">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-stone-900">Sync Diagnostics Alert</h3>
            <p className="text-xs text-rose-800 mt-1 max-w-3xl">
              There {syncIssues.length === 1 ? 'is' : 'are'} <strong>{syncIssues.length} unresolved synchronization issue{syncIssues.length !== 1 ? 's' : ''}</strong> across your channels. Review the queue to maintain accurate catalog and inventory alignment.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('sync-issues')}
            className="shrink-0 rounded-xl bg-white border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-colors"
          >
            Review Issues
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => onNavigateTab('catalog')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Published Products"
            value={String(publishedCount)}
            sub={`${draftCount} draft(s) awaiting review`}
            icon={<Globe className="h-5 w-5" />}
          />
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Unfulfilled Orders"
            value={String(unfulfilledOrders.length)}
            sub={`Total Sales: ${formatCents(todayRevenueCents)}`}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
        </div>

        <div
          onClick={() => onNavigateTab('inventory')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Baton Rouge Stock"
            value={`${batonRougeTotalStock} units`}
            sub="Location: Proper BR"
            icon={<Store className="h-5 w-5" />}
          />
        </div>

        <div
          onClick={() => onNavigateTab('inventory')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Covington Stock"
            value={`${covingtonTotalStock} units`}
            sub="Location: Proper Covington"
            icon={<Package className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Actionable Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateTab('imports')}
          className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
        >
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 group-hover:text-brand-primary transition-colors">Vendor Catalog Import</h3>
              <p className="text-xs text-stone-500 mt-1">
                Upload CSV or Excel catalogs from wholesale vendors. Auto-detect columns, validate cost/margins, and publish to Shopify.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-brand-primary pt-4">
            Start Import Wizard <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('counts')}
          className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
        >
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors shadow-2xs">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 group-hover:text-violet-600 transition-colors">Physical Inventory Counts</h3>
              <p className="text-xs text-stone-500 mt-1">
                Conduct blind or assisted physical inventory counts for Proper Baton Rouge or Covington. Scan barcodes and submit variance reports.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 pt-4">
            Start New Count <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
        >
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-status-success group-hover:bg-status-success group-hover:text-white transition-colors shadow-2xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 group-hover:text-status-success transition-colors">Order Fulfillments</h3>
              <p className="text-xs text-stone-500 mt-1">
                View mirrored Shopify orders, process local pickup preparations, trigger shipping fulfillments, and sync return statuses.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-status-success pt-4">
            View Orders ({unfulfilledOrders.length}) <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
