import type { Customer, Gown, Invoice } from '@/data/vowosData';
import type { DetailedSaleItem } from './components/ItemizedSalesDetailModal';

/**
 * Builds the itemized-sale detail from what the tenant actually has on record:
 * the invoice, the bride it belongs to, and -- when the description names a
 * gown in inventory -- that gown's designer, style, size, colour, SKU and
 * wholesale cost. Anything not on record is left empty and renders as "—".
 *
 * The previous callers invented every one of these fields (SKU-881029384912,
 * 'Bridal Size 10 (Bust 34"…)', cost = 40% of the invoice, stylist 'Ramsey
 * Roberts', wedding date 2026-11-14) for every invoice on every tenant.
 */
export function buildSaleItemFromInvoice(inv: Invoice, brides: Customer[], gowns: Gown[]): DetailedSaleItem {
  const bride = brides.find((b) => b.name.trim().toLowerCase() === (inv.customer || '').trim().toLowerCase());
  const desc = (inv.description || '').toLowerCase();
  const gown = desc
    ? gowns.find((g) => {
        const name = g.name.toLowerCase();
        const style = (g.style || '').toLowerCase();
        return (name && desc.includes(name)) || (style && desc.includes(style)) || (g.sku && desc.includes(g.sku.toLowerCase()));
      })
    : undefined;

  return {
    id: `item-${inv.id}`,
    invoiceId: inv.id,
    customerName: inv.customer,
    weddingDate: bride?.weddingDate || '',
    designer: gown?.designer || '',
    gownName: gown?.name || inv.description || '',
    styleNumber: gown?.style || '',
    sku: gown?.sku || '',
    gownType: '',
    size: gown?.size || '',
    color: gown?.color || '',
    fabric: '',
    condition: '',
    wholesaleCostCents: gown?.costCents ?? null,
    retailPriceCents: inv.amountCents,
    paidCents: inv.paidCents,
    locationId: inv.location,
    stylist: bride?.stylist || '',
    saleDate: inv.dueDate || '',
    matchedGownId: gown?.id ?? null,
  };
}
