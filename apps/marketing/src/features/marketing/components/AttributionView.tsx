import { useState } from 'react';
import { MarketingAttributionTouch } from '../types/marketingTypes';
import { getAttributionTouches, getMarketingMetricsSummary } from '../api/marketingApi';
import { formatCents } from '@/data/vowosData';
import { TrendingUp, ShoppingBag, Store, ArrowRight, Filter } from 'lucide-react';

export default function AttributionView() {
  const [touches] = useState<MarketingAttributionTouch[]>(getAttributionTouches());
  const [attributionModel, setAttributionModel] = useState<'last_touch' | 'first_touch' | 'linear' | 'position_based'>('last_touch');
  const metrics = getMarketingMetricsSummary();

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Cross-Platform Funnel &amp; Revenue Attribution</h2>
          <p className="text-xs text-stone-500">Track paid &amp; organic marketing impact on fitting suite bookings, in-store sales &amp; Shopify ecommerce.</p>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-stone-500">Model:</span>
          <select
            value={attributionModel}
            onChange={(e) => setAttributionModel(e.target.value as any)}
            className="rounded-xl border border-stone-300 bg-white p-2 font-bold text-stone-900 focus:outline-none"
          >
            <option value="last_touch">Last Touch Attribution</option>
            <option value="first_touch">First Touch Attribution</option>
            <option value="linear">Linear Attribution (Equal Weight)</option>
            <option value="position_based">Position Based (40-20-40)</option>
          </select>
        </div>
      </div>

      {/* Breakdown Cards: In-Store vs Shopify */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>In-Store Boutique Attributed Revenue</span>
            <Store className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">{formatCents(metrics.inStoreRevenueCents)}</p>
          <p className="text-xs text-stone-500">Baton Rouge &amp; Covington fitting suite appointments converted to gown sales.</p>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Shopify Ecommerce Attributed Revenue</span>
            <ShoppingBag className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">{formatCents(metrics.shopifyRevenueCents)}</p>
          <p className="text-xs text-stone-500">Proper &amp; Co. online store orders &amp; ready-to-ship sales.</p>
        </div>
      </div>

      {/* Attribution Log Table */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-900 text-sm">Attributed Customer Touches</h3>
        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-500 uppercase">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Platform &amp; Campaign</th>
                <th className="py-3 px-4">UTM Source / Medium</th>
                <th className="py-3 px-4">Channel Type</th>
                <th className="py-3 px-4 text-right">Attributed Sale Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {touches.map((t) => (
                <tr key={t.id}>
                  <td className="py-3.5 px-4 font-bold text-stone-900">{t.customerName}</td>
                  <td className="py-3.5 px-4 font-bold text-stone-800 capitalize">{t.provider} — {t.campaignName}</td>
                  <td className="py-3.5 px-4 text-stone-500">{t.utmSource} / {t.utmMedium}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                      {t.channelType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-600">{formatCents(t.saleAmountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
