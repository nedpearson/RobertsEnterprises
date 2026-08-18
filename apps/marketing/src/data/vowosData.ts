// ─── VowOS by The Boutique — Shared Data Module ───
// Types, static catalog data, location directory, and formatting helpers.
// Business records (brides, leads, appointments, invoices, purchase orders,
// gowns, transfers) live in database tables and are loaded via VowosDataContext.

export const HERO_IMAGE =
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503896604_2a0f57cd.jpg';

export const GOWN_IMAGES = [
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503869512_b4807712.jpg',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503877855_0889809c.png',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503871967_2d2bb3f7.jpg',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503875934_d2041c7e.png',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503877190_65ca17a3.png',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503874335_c57ead2c.jpg',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503876513_c986a2b7.jpg',
  'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503880714_6e806d03.png',
];

// ─── Multi-Location Directory ───
// The Boutique operates two boutique brands, each with a Baton Rouge
// and a Covington, Louisiana storefront (owner: Ramsey Sims).

export type LocationId = 'ido-br' | 'ido-cov' | 'pc-br' | 'pc-cov';

export interface BoutiqueLocation {
  id: LocationId;
  business: 'I Do Bridal Couture' | 'Proper & Company';
  /** Compact label for chips, badges, and dropdowns. */
  short: string;
  city: 'Baton Rouge' | 'Covington';
  address: string;
  phone: string;
  hours: string;
  /** Brand accent: I Do Bridal Couture = rose, Proper & Company = violet. */
  accent: 'rose' | 'violet';
}

export const LOCATIONS: BoutiqueLocation[] = [
  {
    id: 'ido-br',
    business: 'I Do Bridal Couture',
    short: 'I Do · Baton Rouge',
    city: 'Baton Rouge',
    address: '4343 Perkins Rd, Baton Rouge, LA 70808',
    phone: '(225) 361-0377',
    hours: 'Tue–Sat · 10am–5pm',
    accent: 'rose',
  },
  {
    id: 'ido-cov',
    business: 'I Do Bridal Couture',
    short: 'I Do · Covington',
    city: 'Covington',
    address: '316 Lee Ln, Covington, LA 70433',
    phone: '(985) 327-5598',
    hours: 'Tue–Sat · 10am–4pm',
    accent: 'rose',
  },
  {
    id: 'pc-br',
    business: 'Proper & Company',
    short: 'Proper & Co · Baton Rouge',
    city: 'Baton Rouge',
    address: 'Perkins Rd, Baton Rouge, LA 70808',
    phone: '(225) 361-0377',
    hours: 'Tue–Sat · 10am–5pm',
    accent: 'violet',
  },
  {
    id: 'pc-cov',
    business: 'Proper & Company',
    short: 'Proper & Co · Covington',
    city: 'Covington',
    address: 'Downtown Covington, LA 70433',
    phone: '(985) 327-5598',
    hours: 'Tue–Sat · 10am–4pm',
    accent: 'violet',
  },
];

/** Look up a location by id, falling back to the first location. */
export function locationById(id: string | null | undefined): BoutiqueLocation {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

/** "All locations" filter value used across the app. */
export type LocationFilter = LocationId | 'all';

export type GownStatus = 'In Stock' | 'Low Stock' | 'On Order';

export interface Gown {
  id: string;
  name: string;
  designer: string;
  style: string;
  size: string;
  color: string;
  /** Retail selling price in cents. */
  priceCents: number;
  stock: number;
  status: GownStatus;
  image: string;
  location: LocationId;
  /** Internal stock-keeping unit / tag number. */
  sku: string;
  /** Wholesale cost from the vendor, in cents. */
  costCents: number;
  /** Manufacturer's suggested retail price, in cents (0 = not set). */
  msrpCents: number;
  /** Merchandise category (bridal gown, bridesmaids, veil, …). */
  category: string;
  inventoryType?: 'Sample' | 'Sellable' | 'Special Order';
  /** New / Sample / Consignment / Clearance. */
  condition: string;
  /** Ordering vendor (often, but not always, the designer). */
  vendor: string;
  /** Reorder when on-hand stock falls to this number or below. */
  reorderPoint: number;
  /** Free-form internal notes (fit runs small, discontinued fall '26, …). */
  notes: string;
}

/** Derive gown availability status from quantity on hand. */
export function gownStatusForStock(stock: number): GownStatus {
  if (stock <= 0) return 'On Order';
  if (stock === 1) return 'Low Stock';
  return 'In Stock';
}

export const GOWN_STYLES = ['A-Line', 'Mermaid', 'Ballgown', 'Sheath', 'Fit & Flare', 'Trumpet'];

/** Merchandise categories carried across the boutiques. */
export const GOWN_CATEGORIES = [
  'Bridal Gown',
  'Bridesmaids',
  'Mother of the Bride',
  'Veil',
  'Accessories',
  'Formal / Pageant',
  'Suit & Tux',
];

/** Stock condition types for bridal retail. */
export const GOWN_CONDITIONS = ['New', 'Sample', 'Consignment', 'Clearance'];

/** Gross margin percent from cost + retail (0 when either is missing). */
export function marginPct(costCents: number, priceCents: number): number {
  if (!priceCents || priceCents <= 0 || costCents < 0) return 0;
  return Math.round(((priceCents - costCents) / priceCents) * 100);
}

/** Markup multiple ("2.2×") from cost + retail, or null when cost is unset. */
export function markupLabel(costCents: number, priceCents: number): string | null {
  if (!costCents || costCents <= 0 || !priceCents) return null;
  return `${(priceCents / costCents).toFixed(1)}×`;
}


// ─── Inter-store Transfers ───

export type TransferStatus = 'In Transit' | 'Received';

export interface Transfer {
  id: string;
  gownId: string;
  gownName: string;
  from: LocationId;
  to: LocationId;
  qty: number;
  status: TransferStatus;
  requested: string; // ISO date
  received: string | null; // ISO date once marked received
  note: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  stylist: string;
  status: 'Active' | 'Purchased' | 'Alterations' | 'Picked Up' | 'Did Not Buy';

  spendCents: number;
  location: LocationId;
  /** Secret token that unlocks the bride's private /portal page. */
  portalToken: string;
  /** Centralized profile photo URL or data URI. */
  profilePhotoUrl?: string;
  /** Timestamp ISO string when profile photo was updated. */
  profilePhotoUpdatedAt?: string;
}

export type LeadStage = 'New' | 'Contacted' | 'Appointment Set' | 'Won';
export const LEAD_STAGES: LeadStage[] = ['New', 'Contacted', 'Appointment Set', 'Won'];

export interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  budgetCents: number;
  weddingDate: string;
  stage: LeadStage;
  aiScore?: number;
  aiInsight?: string;
}

export interface Invoice {
  id: string;
  customer: string;
  description: string;
  amountCents: number;
  paidCents: number;
  dueDate: string;
  status: 'Paid' | 'Partial' | 'Open' | 'Overdue';
  location: LocationId;
  /** Secret token that unlocks the public /pay/:id payment page. */
  payToken: string;
}

/** Month key ("YYYY-MM") for sales-goal tracking. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Human label for a "YYYY-MM" month key. */
export function monthLabel(key: string): string {
  const d = new Date(`${key}-15T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


export interface Appointment {
  id: string;
  customer: string;
  type: 'Bridal Consultation' | 'Fitting' | 'Alterations' | 'Pickup' | 'Accessories';
  date: string;
  time: string;
  stylist: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  location: LocationId;
  /** What the bride is shopping for (gown, bridesmaids, accessories, …). */
  lookingFor: string;
  /** Bride's stated gown budget in cents (0 = not shared). */
  budgetCents: number;
  /** Whether the $75 booking fee has been collected. */
  feePaid: boolean;
}

/** Shared appointment type list — used by staff booking and the public bride booking page. */
export const APPOINTMENT_TYPES: Appointment['type'][] = [
  'Bridal Consultation',
  'Fitting',
  'Alterations',
  'Pickup',
  'Accessories',
];

// ─── Booking fee + intake questions (shared by staff + public booking) ───

/** Every booking carries a flat $75 reservation fee, credited toward her purchase. */
export const BOOKING_FEE_CENTS = 7500;

/** "What are you looking for?" options asked on every booking. */
export const LOOKING_FOR_OPTIONS = [
  'Wedding Gown',
  'Bridesmaids',
  'Mother of the Bride',
  'Veil & Accessories',
  'Formal / Pageant',
  'Suit & Tux',
  'Not Sure Yet',
] as const;

/** Budget ranges asked on every booking (value stored in cents). */
export const BUDGET_RANGES: { label: string; cents: number }[] = [
  { label: 'Under $1,500', cents: 150000 },
  { label: '$1,500 – $2,500', cents: 250000 },
  { label: '$2,500 – $3,500', cents: 350000 },
  { label: '$3,500 – $5,000', cents: 500000 },
  { label: '$5,000+', cents: 750000 },
];

/** Human label for a stored budget amount ("$2,500 – $3,500"), or "—" when unset. */
export function budgetLabel(cents: number): string {
  if (!cents || cents <= 0) return '—';
  const match = BUDGET_RANGES.find((b) => b.cents === cents);
  return match ? match.label : formatCents(cents);
}

/** Public booking page URL + QR image (brides scan this in-store or on print collateral). */
export function bookingPageUrl(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/book` : '/book';
}

export function qrImageUrl(data: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`;
}

/** Salon hours: 9:00 AM – 5:30 PM in 30-minute slots, matching "1:30 PM" formatting. */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let mins = 9 * 60; mins <= 17 * 60 + 30; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}:${String(m).padStart(2, '0')} ${period}`);
  }
  return slots;
})();


/** Hosted CRM booking page for virtual/video consultations (opens in a new tab). */
export const VIRTUAL_CONSULT_BOOKING_URL =
  'https://famous.ai/api/crm/6a5d5dc9d84ad34d886e72c1/calendar/public?calendarId=9daa261f-6b15-4ab3-8346-aef10a0a0e54&view=booking';


export interface PurchaseOrder {
  id: string;
  vendor: string;
  items: string;
  amountCents: number;
  ordered: string;
  expectedDelivery: string;
  status: 'Ordered' | 'In Transit' | 'Delivered' | 'Delayed' | 'Archived';
  location: LocationId;
  assignedStaff?: string;
  assignedCustomer?: string;
  notes?: string;
}

export const revenueByMonth = [
  { month: 'Feb', revenue: 42300 },
  { month: 'Mar', revenue: 51800 },
  { month: 'Apr', revenue: 47600 },
  { month: 'May', revenue: 63200 },
  { month: 'Jun', revenue: 58900 },
  { month: 'Jul', revenue: 71400 },
];

export const teamMembers = ['Dana R.', 'Priya K.', 'Marcus T.'];

export function formatCents(cents?: number | null): string {
  if (cents == null || isNaN(Number(cents))) return '$0.00';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatDate(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return '—';
  try {
    const clean = iso.slice(0, 10);
    if (!clean) return '—';
    const d = new Date(clean + 'T12:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return String(iso ?? '—');
  }
}

