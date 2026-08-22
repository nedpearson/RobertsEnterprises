export type CatalogRow = Record<string, unknown>;

export const CATALOG_FIELDS = [
  'style_number', 'name', 'description', 'category', 'brand', 'collection',
  'color', 'size', 'vendor_sku', 'upc', 'cost_cents', 'msrp_cents',
  'store_retail_cents', 'image_url', 'fabric', 'silhouette', 'neckline',
  'length', 'train', 'size_range', 'lead_time_weeks',
] as const;

export type CatalogField = typeof CATALOG_FIELDS[number];
export type MappedCatalogRow = Record<CatalogField, string | number | null> & { warnings: string[]; errors: string[] };

const ALIASES: Record<CatalogField, string[]> = {
  style_number: ['style', 'style number', 'style no', 'style #', 'style id', 'model'],
  name: ['name', 'product name', 'style name', 'item name'],
  description: ['description', 'full description', 'details'],
  category: ['category', 'product type', 'type'],
  brand: ['brand', 'designer', 'label'],
  collection: ['collection', 'season', 'line'],
  color: ['color', 'colour', 'color name'],
  size: ['size', 'bridal size'],
  vendor_sku: ['sku', 'vendor sku', 'item sku'],
  upc: ['upc', 'barcode', 'ean'],
  cost_cents: ['cost', 'wholesale', 'wholesale price', 'cost price'],
  msrp_cents: ['msrp', 'suggested retail', 'rrp'],
  store_retail_cents: ['retail', 'retail price', 'price', 'selling price'],
  image_url: ['image', 'image url', 'photo', 'photo url'],
  fabric: ['fabric', 'material'], silhouette: ['silhouette', 'shape'], neckline: ['neckline'],
  length: ['length'], train: ['train'], size_range: ['size range', 'sizes'], lead_time_weeks: ['lead time', 'lead time weeks', 'production weeks'],
};

function cleanHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function cleanValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export function moneyToCents(value: unknown): number | null {
  const raw = cleanValue(value);
  if (!raw) return null;
  const numeric = Number(raw.replace(/[$,\s]/g, ''));
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) : null;
}

export function inferCatalogMapping(headers: string[]): Record<string, CatalogField> {
  const inferred: Record<string, CatalogField> = {};
  for (const header of headers) {
    const normalized = cleanHeader(header);
    const field = CATALOG_FIELDS.find((candidate) => ALIASES[candidate].includes(normalized));
    if (field) inferred[header] = field;
  }
  return inferred;
}

export function mapCatalogRow(row: CatalogRow, mapping: Record<string, CatalogField>): MappedCatalogRow {
  const mapped = Object.fromEntries(CATALOG_FIELDS.map((field) => [field, null])) as Record<CatalogField, string | number | null>;
  for (const [header, field] of Object.entries(mapping)) {
    const value = row[header];
    if (field === 'cost_cents' || field === 'msrp_cents' || field === 'store_retail_cents') mapped[field] = moneyToCents(value);
    else if (field === 'lead_time_weeks') {
      const parsed = Number(cleanValue(value));
      mapped[field] = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    } else mapped[field] = cleanValue(value);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  if (!mapped.style_number) errors.push('A style number is required.');
  if (!mapped.name) warnings.push('No product name supplied; VowOS will use the style number.');
  if (!mapped.color && !mapped.size && !mapped.vendor_sku) warnings.push('No variant discriminator supplied; this will be imported as the base style only.');
  if (mapped.cost_cents !== null && mapped.store_retail_cents !== null && Number(mapped.cost_cents) > Number(mapped.store_retail_cents)) {
    warnings.push('Wholesale cost is higher than store retail price.');
  }
  return { ...mapped, warnings, errors };
}

export const JOURNEY_TRANSITIONS: Record<string, string[]> = {
  appointment_booked: ['appointment_completed', 'cancelled'],
  appointment_completed: ['style_selected', 'cancelled'],
  style_selected: ['measurements_captured', 'order_draft', 'cancelled'],
  measurements_captured: ['order_draft', 'cancelled'],
  order_draft: ['order_submitted', 'cancelled'],
  order_submitted: ['vendor_confirmed', 'cancelled'],
  vendor_confirmed: ['in_production', 'shipped', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['received', 'cancelled'],
  received: ['alterations', 'ready_for_pickup'],
  alterations: ['ready_for_pickup'],
  ready_for_pickup: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionJourney(current: string, next: string): boolean {
  return JOURNEY_TRANSITIONS[current]?.includes(next) ?? false;
}

export function customerUpdateFor(status: string): { title: string; detail: string } {
  const updates: Record<string, { title: string; detail: string }> = {
    appointment_booked: { title: 'Your appointment is booked', detail: 'We look forward to seeing you and will be ready for your visit.' },
    appointment_completed: { title: 'Your appointment is complete', detail: 'Your stylist is preparing the next steps from your visit.' },
    style_selected: { title: 'Your style has been selected', detail: 'We have saved your selection and are preparing your order details.' },
    measurements_captured: { title: 'Your measurements are complete', detail: 'Your order can now move into final review.' },
    order_submitted: { title: 'Your order was submitted', detail: 'We sent your order to the designer and will update you when they confirm it.' },
    vendor_confirmed: { title: 'Your designer confirmed the order', detail: 'Your order is now on the production schedule.' },
    in_production: { title: 'Your order is in production', detail: 'We are monitoring the designer timeline for you.' },
    shipped: { title: 'Your order has shipped', detail: 'We will let you know as soon as it arrives at the boutique.' },
    received: { title: 'Your order has arrived', detail: 'Your stylist will guide you through the next fitting or pickup step.' },
    alterations: { title: 'Your alterations are underway', detail: 'We are preparing your look for the final fitting.' },
    ready_for_pickup: { title: 'Your order is ready', detail: 'Your boutique will coordinate pickup or your final appointment.' },
    completed: { title: 'Your order journey is complete', detail: 'Thank you for trusting us with this special moment.' },
  };
  return updates[status] ?? { title: 'Your order has been updated', detail: 'Your boutique has updated the next step in your journey.' };
}
