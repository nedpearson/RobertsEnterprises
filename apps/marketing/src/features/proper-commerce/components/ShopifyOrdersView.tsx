import { useState } from 'react';
import { CommerceOrder } from '../types/properCommerceTypes';
import { fulfillCommerceOrder } from '../api/properCommerceApi';
import { formatCents, formatDate } from '@/data/vowosData';
import { StatusBadge } from '@/components/vowos/ui';
import { ShoppingBag, PackageCheck, Truck, ExternalLink, Check, Clock, User } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface ShopifyOrdersViewProps {
  orders: CommerceOrder[];
  onUpdate: () => void;
}

export default function ShopifyOrdersView({ orders, onUpdate }: ShopifyOrdersViewProps) {
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const handleFulfill = async (orderId: string) => {
    setFulfillingId(orderId);
    await fulfillCommerceOrder(orderId);
    toast({ title: 'Order Fulfilled', description: `Marked ${orderId} as fulfilled and notified Shopify.` });
    onUpdate();
    setFulfillingId(null);
  };

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h3 className="font-bold text-stone-900 text-sm">Shopify Mirrored Orders</h3>
          <p className="text-xs text-stone-500">
            Real-time ecommerce orders placed on Proper &amp; Co. storefront.
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          {orders.length} Active Orders
        </span>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Fulfillment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-brand-primary" />
                      <div>
                        <p className="font-bold text-stone-900">{o.orderNumber}</p>
                        <p className="text-[11px] text-stone-400">{formatDate(o.placedAt.slice(0, 10))}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-stone-900">{o.customerName}</p>
                    <p className="text-[11px] text-stone-400">{o.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {o.lines.map((l) => (
                      <p key={l.id} className="text-stone-800">
                        {l.quantity}x {l.title} ({l.variantTitle})
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-stone-700">
                    {o.locationId === 'pc-br' ? 'Proper Baton Rouge' : 'Proper Covington'}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-stone-900">{formatCents(o.totalCents)}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                      Paid
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {o.fulfillmentStatus === 'fulfilled' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-status-success">
                        <Check className="h-3.5 w-3.5" /> Fulfilled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleFulfill(o.id)}
                        disabled={fulfillingId === o.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-colors"
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Mark Ready / Fulfill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    No online orders placed yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
