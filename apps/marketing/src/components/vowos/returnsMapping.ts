import { ReturnOrder } from './ReturnsView';

export const mapDbToReturn = (r: any): ReturnOrder => ({
  id: r.return_id,
  vendor: r.vendor,
  items: r.items,
  value: r.value_cents,
  status: r.status,
  date: r.date,
  reason: r.reason,
  gownId: r.gown_id || undefined,
  gownName: r.gown_name || undefined,
  invoiceId: r.invoice_id || undefined,
  trackingNumber: r.tracking_number || undefined,
  carrier: r.carrier || undefined,
  notes: r.notes || undefined,
});

export const mapReturnToDb = (newOrder: ReturnOrder, activeLocation: string) => ({
  return_id: newOrder.id,
  location_id: activeLocation === 'all' ? null : activeLocation,
  vendor: newOrder.vendor,
  items: newOrder.items,
  value_cents: newOrder.value,
  status: newOrder.status,
  date: newOrder.date,
  reason: newOrder.reason,
  gown_id: newOrder.gownId || null,
  gown_name: newOrder.gownName || null,
  invoice_id: newOrder.invoiceId || null,
  tracking_number: newOrder.trackingNumber || null,
  carrier: newOrder.carrier || null,
  notes: newOrder.notes || null,
});
