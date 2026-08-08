import { CatalogProduct, CommerceOrder } from '../types/properCommerceTypes';
import { formatCents } from '@/data/vowosData';
import { Download, BarChart3, TrendingUp, DollarSign, PieChart, Layers } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CommerceReportsViewProps {
  products: CatalogProduct[];
  orders: CommerceOrder[];
}

export default function CommerceReportsView({ products, orders }: CommerceReportsViewProps) {
  const totalRetailValuationCents = products.reduce((acc, p) => {
    return (
      acc +
      p.variants.reduce((vs, v) => vs + (v.inventoryBatonRouge + v.inventoryCovington) * v.retailPriceCents, 0)
    );
  }, 0);

  const totalCostValuationCents = products.reduce((acc, p) => {
    return (
      acc +
      p.variants.reduce((vs, v) => vs + (v.inventoryBatonRouge + v.inventoryCovington) * v.costCents, 0)
    );
  }, 0);

  const totalSalesCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const potentialMarginPct =
    totalRetailValuationCents > 0
      ? Math.round(((totalRetailValuationCents - totalCostValuationCents) / totalRetailValuationCents) * 100)
      : 0;

  const handleExportCSV = () => {
    let csv = 'Product Title,Style Number,Vendor,Category,Cost Price,Retail Price,BR Stock,Cov Stock,Retail Valuation\n';
    products.forEach((p) => {
      p.variants.forEach((v) => {
        const brStock = v.inventoryBatonRouge;
        const covStock = v.inventoryCovington;
        const totalVal = (brStock + covStock) * (v.retailPriceCents / 100);
        csv += `"${p.title}","${p.styleNumber}","${p.vendorName}","${p.category}",${(v.costCents / 100).toFixed(
          2
        )},${(v.retailPriceCents / 100).toFixed(2)},${brStock},${covStock},${totalVal.toFixed(2)}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Proper_Commerce_Inventory_Valuation_Report.csv';
    a.click();
    toast({ title: 'Report Exported', description: 'Saved Proper_Commerce_Inventory_Valuation_Report.csv' });
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h3 className="font-bold text-stone-900 text-sm">Proper &amp; Co. Financial &amp; Inventory Reports</h3>
          <p className="text-xs text-stone-500">
            Valuation, margin analysis, and sales reports for Proper &amp; Co ecommerce.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-600 transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV Report
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500">Total Retail Inventory Valuation</p>
          <p className="text-xl font-bold text-stone-900">{formatCents(totalRetailValuationCents)}</p>
          <p className="text-[11px] text-stone-400">At current retail prices</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500">Total Cost Valuation</p>
          <p className="text-xl font-bold text-stone-900">{formatCents(totalCostValuationCents)}</p>
          <p className="text-[11px] text-stone-400">Wholesale cost basis</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500">Potential Gross Margin</p>
          <p className="text-xl font-bold text-emerald-600">{potentialMarginPct}%</p>
          <p className="text-[11px] text-stone-400">Potential profit dollars: {formatCents(totalRetailValuationCents - totalCostValuationCents)}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500">Today Ecommerce Sales</p>
          <p className="text-xl font-bold text-rose-600">{formatCents(totalSalesCents)}</p>
          <p className="text-[11px] text-stone-400">{orders.length} order(s) placed</p>
        </div>
      </div>
    </div>
  );
}
