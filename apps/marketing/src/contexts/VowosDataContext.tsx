import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  Customer,
  Lead,
  LeadStage,
  LEAD_STAGES,
  Appointment,
  Invoice,
  PurchaseOrder,
  Gown,
  Transfer,
  LocationId,
  LocationFilter,
  locationById,
  gownStatusForStock,
} from '@/data/vowosData';
import { registerSiteOrigin } from '@/lib/messaging';
import { useActiveBusinessContext } from '@/lib/services/schedulingService';

// ─── UUID & Deterministic Location Mappings ───

export const DEMO_BUSINESS_ID = 'b0000000-0000-0000-0000-000000000000';

export const DEMO_LOCATION_MAP: Record<LocationId, string> = {
  'ido-br': 'c0000000-0000-0000-0000-000000000001',
  'ido-cov': 'c0000000-0000-0000-0000-000000000002',
  'pc-br': 'c0000000-0000-0000-0000-000000000003',
  'pc-cov': 'c0000000-0000-0000-0000-000000000004',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (val: string | null | undefined): boolean => {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val);
};

export const generateEntityId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const resolveLocationId = (loc?: string | null): string => {
  if (loc && isUuid(loc)) return loc;
  if (loc && loc in DEMO_LOCATION_MAP) return DEMO_LOCATION_MAP[loc as LocationId];
  return DEMO_LOCATION_MAP['ido-br'];
};

export const resolveLocationSlug = (locIdOrSlug?: string | null): LocationId => {
  if (!locIdOrSlug) return 'ido-br';
  if (locIdOrSlug in DEMO_LOCATION_MAP) return locIdOrSlug as LocationId;
  for (const [slug, uuid] of Object.entries(DEMO_LOCATION_MAP)) {
    if (uuid === locIdOrSlug) return slug as LocationId;
  }
  return 'ido-br';
};

// ─── Row mappers: database snake_case → app camelCase ───

const asDate = (v: any): string => (typeof v === 'string' ? v.slice(0, 10) : '');

export const DEMO_BRIDE_PHOTOS: Record<string, string> = {
  'c-101': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'c-102': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'c-103': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  'c-104': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
};

const getCachedBridePhoto = (id: string, dbPhoto?: string | null): string | undefined => {
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(`vowos_bride_photo_${id}`);
    if (cached !== null) return cached || undefined;
  }
  if (dbPhoto) return dbPhoto;
  return DEMO_BRIDE_PHOTOS[id] || undefined;
};

const mapBride = (r: any): Customer => ({
  id: r.id || '',
  name: r.name || '',
  email: r.email || '',
  phone: r.phone || '',
  weddingDate: r.wedding_date || '',
  stylist: r.stylist || '',
  status: r.status || '',
  spendCents: r.spend_cents || 0,
  location: resolveLocationSlug(r.location ?? r.location_id),
  portalToken: r.portal_token ?? '',
  profilePhotoUrl: getCachedBridePhoto(r.id, r.profile_photo_url),
  profilePhotoUpdatedAt: r.profile_photo_updated_at || new Date().toISOString(),
});

const mapLead = (r: any): Lead => ({
  id: r.id || '',
  name: r.name || '',
  email: r.email || '',
  source: r.source || '',
  budgetCents: r.budget_cents || 0,
  weddingDate: r.wedding_date || '',
  stage: r.stage || '',
  aiScore: r.ai_score ?? Math.floor(Math.random() * 40) + 50,
  aiInsight: r.ai_insight ?? 'Standard priority',
});

const mapAppointment = (r: any): Appointment => {
  let date = r.date || '';
  let time = r.time || '';
  if (!date && r.start_at) {
    try {
      const d = new Date(r.start_at);
      date = d.toISOString().slice(0, 10);
      time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      // fallback
    }
  }
  return {
    id: r.id || '',
    customer: r.customer || (r.customer_rel?.name ?? ''),
    type: r.type || 'First Bridal Consultation',
    date: date || todayIso(),
    time: time || '10:00 AM',
    stylist: r.stylist || (r.employee_rel?.name ?? ''),
    status: r.status || 'Confirmed',
    location: resolveLocationSlug(r.location ?? r.location_id),
    lookingFor: r.looking_for ?? '',
    budgetCents: r.budget_cents ?? 0,
    feePaid: r.fee_paid ?? false,
  };
};

const mapInvoice = (r: any): Invoice => ({
  id: r.id || '',
  customer: r.customer || (r.customer_rel?.name ?? ''),
  description: r.description || '',
  amountCents: r.amount_cents || 0,
  paidCents: r.paid_cents || 0,
  dueDate: r.due_date || '',
  status: r.status || 'Open',
  location: resolveLocationSlug(r.location ?? r.location_id),
  payToken: r.pay_token ?? '',
});

const mapPo = (r: any): PurchaseOrder => ({
  id: r.id || '',
  vendor: r.vendor || '',
  items: r.items || '',
  amountCents: r.amount_cents || 0,
  ordered: r.ordered || '',
  expectedDelivery: r.expected_delivery || '',
  status: r.status || 'Ordered',
  location: resolveLocationSlug(r.location ?? r.location_id),
  assignedStaff: r.assigned_staff ?? '',
  assignedCustomer: r.assigned_customer ?? '',
  notes: r.notes ?? '',
});

const mapGown = (r: any): Gown => ({
  id: r.id || '',
  name: r.name || '',
  designer: r.designer || '',
  style: r.style || '',
  size: r.size || '',
  color: r.color || '',
  priceCents: r.price_cents || 0,
  stock: r.stock || 0,
  status: r.status || 'Active',
  image: r.image || '',
  location: resolveLocationSlug(r.location ?? r.location_id),
  sku: r.sku ?? '',
  costCents: r.cost_cents ?? 0,
  msrpCents: r.msrp_cents ?? 0,
  category: r.category ?? 'Bridal Gown',
  condition: r.condition ?? 'New',
  vendor: r.vendor ?? r.designer ?? '',
  reorderPoint: r.reorder_point ?? 1,
  notes: r.notes ?? '',
});

/** Full DB payload for a gown record (single source of truth for inserts/updates). */
const gownRow = (g: Gown, bId: string, locId: string) => ({
  id: g.id,
  business_id: bId,
  location_id: locId,
  location: g.location,
  name: g.name,
  designer: g.designer,
  style: g.style,
  size: g.size,
  color: g.color,
  price_cents: g.priceCents,
  stock: g.stock,
  status: g.status,
  image: g.image,
  sku: g.sku,
  cost_cents: g.costCents,
  msrp_cents: g.msrpCents,
  category: g.category,
  condition: g.condition,
  vendor: g.vendor,
  reorder_point: g.reorderPoint,
  notes: g.notes,
});

const mapTransfer = (r: any): Transfer => ({
  id: r.id || '',
  gownId: r.gown_id || '',
  gownName: r.gown_name || '',
  from: resolveLocationSlug(r.from_location ?? r.from_location_id),
  to: resolveLocationSlug(r.to_location ?? r.to_location_id),
  qty: r.qty || 0,
  status: r.status || '',
  requested: asDate(r.requested),
  received: r.received ? asDate(r.received) : null,
  note: r.note ?? '',
});

export interface NewBrideInput {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  stylist: string;
  location?: LocationId;
}

export interface NewInvoiceInput {
  stagedPaymentPlan?: boolean;
  customer: string;
  description: string;
  amountCents: number;
  depositCents: number;
  dueDate: string;
  location?: LocationId;
}

export interface NewAppointmentInput {
  customer: string;
  type: Appointment['type'];
  date: string;
  time: string;
  stylist: string;
  location?: LocationId;
  lookingFor?: string;
  budgetCents?: number;
  feePaid?: boolean;
}

export interface AppointmentUpdateInput {
  type: Appointment['type'];
  date: string;
  time: string;
  stylist: string;
  location: LocationId;
}

export interface GownInput {
  name: string;
  designer: string;
  style: string;
  size: string;
  color: string;
  priceCents: number;
  stock: number;
  image: string;
  location?: LocationId;
  sku?: string;
  costCents?: number;
  msrpCents?: number;
  category?: string;
  condition?: string;
  vendor?: string;
  reorderPoint?: number;
  notes?: string;
}

export interface NewTransferInput {
  gownId: string;
  to: LocationId;
  qty: number;
  note?: string;
}

interface VowosDataContextType {
  brides: Customer[];
  leads: Lead[];
  appointments: Appointment[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  gowns: Gown[];
  transfers: Transfer[];
  allGowns: Gown[];
  allBrides: Customer[];
  allAppointments: Appointment[];
  allInvoices: Invoice[];
  allPurchaseOrders: PurchaseOrder[];
  allTransfers: Transfer[];
  activeLocation: LocationFilter;
  setActiveLocation: (loc: LocationFilter) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  addBride: (input: NewBrideInput) => Promise<boolean>;
  advanceLead: (id: string) => Promise<void>;
  setAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  addAppointment: (input: NewAppointmentInput) => Promise<boolean>;
  updateAppointment: (id: string, input: AppointmentUpdateInput) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  addInvoice: (input: NewInvoiceInput) => Promise<boolean>;
  recordPayment: (id: string, paymentCents: number) => Promise<boolean>;
  markPoDelivered: (id: string) => Promise<void>;
  updatePoStatus: (id: string, newStatus: PurchaseOrder['status']) => Promise<boolean>;
  updatePurchaseOrder: (id: string, input: Partial<PurchaseOrder>) => Promise<boolean>;
  deletePurchaseOrder: (id: string) => Promise<boolean>;
  addPurchaseOrder: (input: { vendor: string; items: string; amountCents: number; expectedDelivery: string; location?: LocationId; assignedStaff?: string; assignedCustomer?: string; notes?: string }) => Promise<boolean>;
  addGown: (input: GownInput) => Promise<boolean>;
  updateGown: (id: string, input: GownInput) => Promise<boolean>;
  adjustGownStock: (id: string, newStock: number) => Promise<boolean>;
  adjustGownPrice: (id: string, newPriceCents: number) => Promise<boolean>;
  addTransfer: (input: NewTransferInput) => Promise<boolean>;
  receiveTransfer: (id: string) => Promise<boolean>;
  updateBridePhoto: (id: string, photoUrl: string | null) => Promise<boolean>;
}

const VowosDataContext = createContext<VowosDataContextType>({
  brides: [],
  leads: [],
  appointments: [],
  invoices: [],
  purchaseOrders: [],
  gowns: [],
  transfers: [],
  allGowns: [],
  allBrides: [],
  allAppointments: [],
  allInvoices: [],
  allPurchaseOrders: [],
  allTransfers: [],
  activeLocation: 'all',
  setActiveLocation: () => {},
  loading: true,
  refresh: async () => {},
  addBride: async () => false,
  advanceLead: async () => {},
  setAppointmentStatus: async () => {},
  addAppointment: async () => false,
  updateAppointment: async () => false,
  deleteAppointment: async () => false,
  addInvoice: async () => false,
  recordPayment: async () => false,
  markPoDelivered: async () => {},
  updatePoStatus: async () => false,
  updatePurchaseOrder: async () => false,
  deletePurchaseOrder: async () => false,
  addPurchaseOrder: async () => false,
  addGown: async () => false,
  updateGown: async () => false,
  adjustGownStock: async () => false,
  adjustGownPrice: async () => false,
  addTransfer: async () => false,
  receiveTransfer: async () => false,
  updateBridePhoto: async () => false,
});

export const useVowosData = () => useContext(VowosDataContext);

function dbErrorToast(action: string, message?: string) {
  toast({
    title: `Could not ${action}`,
    description: message || 'Please make sure you are signed in and try again.',
    variant: 'destructive',
  });
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Convert "1:30 PM" style times to ISO start and end strings. */
const timeToIsoRange = (dateStr: string, timeStr: string): { startAt: string; endAt: string } => {
  try {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeStr || '10:00 AM').trim());
    let h = 10;
    let min = 0;
    if (m) {
      h = parseInt(m[1], 10) % 12;
      if (m[3].toUpperCase() === 'PM') h += 12;
      min = parseInt(m[2], 10);
    }
    const d = new Date(dateStr || todayIso());
    d.setHours(h, min, 0, 0);
    const startAt = d.toISOString();
    const endAt = new Date(d.getTime() + 90 * 60 * 1000).toISOString();
    return { startAt, endAt };
  } catch {
    const now = new Date().toISOString();
    return { startAt: now, endAt: now };
  }
};

/** Convert "1:30 PM" style times to minutes-since-midnight for schedule sorting. */
const timeToMinutes = (t: string): number => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((t || '').trim());
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
};

export const VowosDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brides, setBrides] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [gowns, setGowns] = useState<Gown[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<LocationFilter>('all');

  const { locationId, businessId } = useActiveBusinessContext();
  const activeBizId = businessId || DEMO_BUSINESS_ID;
  const defaultLocation: LocationId = (locationId && locationId !== 'all') ? locationId as LocationId : (activeLocation === 'all' ? 'ido-br' : activeLocation);

  const refresh = useCallback(async () => {
    const [bridesRes, leadsRes, apptsRes, invRes, poRes, gownsRes, transfersRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: true }),
      supabase.from('appointments').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('due_date', { ascending: true }),
      supabase.from('purchase_orders').select('*').order('expected_delivery', { ascending: true }),
      supabase.from('gowns').select('*').order('name', { ascending: true }),
      supabase.from('transfers').select('*').order('requested', { ascending: false }),
    ]);
    if (!bridesRes.error && bridesRes.data) setBrides(bridesRes.data.map(mapBride));
    if (!leadsRes.error && leadsRes.data) setLeads(leadsRes.data.map(mapLead));
    if (!apptsRes.error && apptsRes.data) setAppointments(apptsRes.data.map(mapAppointment));
    if (!invRes.error && invRes.data) setInvoices(invRes.data.map(mapInvoice));
    if (!poRes.error && poRes.data) setPurchaseOrders(poRes.data.map(mapPo));
    if (!gownsRes.error && gownsRes.data) setGowns(gownsRes.data.map(mapGown));
    if (!transfersRes.error && transfersRes.data) setTransfers(transfersRes.data.map(mapTransfer));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    registerSiteOrigin();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // ─── Mutations (optimistic UI + database persistence) ───

  const addBride = useCallback(
    async (input: NewBrideInput): Promise<boolean> => {
      const bId = activeBizId;
      const locId = resolveLocationId(input.location ?? defaultLocation);
      const id = generateEntityId();
      const portalToken = generateEntityId();

      const newBride: Customer = {
        id,
        name: input.name,
        email: input.email,
        phone: input.phone || '—',
        weddingDate: input.weddingDate || '2027-06-01',
        stylist: input.stylist,
        status: 'Active',
        spendCents: 0,
        location: input.location ?? defaultLocation,
        portalToken,
        profilePhotoUrl: undefined,
        profilePhotoUpdatedAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('customers').insert({
        id: newBride.id,
        business_id: bId,
        location_id: locId,
        location: newBride.location,
        name: newBride.name,
        email: newBride.email,
        phone: newBride.phone,
        wedding_date: newBride.weddingDate,
        stylist: newBride.stylist,
        status: newBride.status,
        spend_cents: newBride.spendCents,
        portal_token: portalToken,
      });

      if (error) {
        dbErrorToast('add bride', error.message);
        return false;
      }
      setBrides((prev) => [newBride, ...prev]);
      return true;
    },
    [activeBizId, defaultLocation],
  );

  const updateBridePhoto = useCallback(
    async (id: string, photoUrl: string | null): Promise<boolean> => {
      const updatedAt = new Date().toISOString();

      setBrides((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                profilePhotoUrl: photoUrl || undefined,
                profilePhotoUpdatedAt: updatedAt,
              }
            : b,
        ),
      );

      try {
        if (photoUrl) {
          localStorage.setItem(`vowos_bride_photo_${id}`, photoUrl);
          localStorage.setItem(`vowos_bride_photo_updated_${id}`, updatedAt);
        } else {
          localStorage.removeItem(`vowos_bride_photo_${id}`);
          localStorage.removeItem(`vowos_bride_photo_updated_${id}`);
        }
      } catch (e) {
        console.error('Failed to cache bride photo in localStorage:', e);
      }

      const { error } = await supabase
        .from('customers')
        .update({ profile_photo_url: photoUrl, profile_photo_updated_at: updatedAt })
        .eq('id', id);

      if (error) {
        console.warn('Supabase update notification for profile_photo_url:', error.message);
      }

      return true;
    },
    [],
  );

  const advanceLead = useCallback(
    async (id: string) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) return;
      const idx = LEAD_STAGES.indexOf(lead.stage);
      if (idx >= LEAD_STAGES.length - 1) return;
      const nextStage: LeadStage = LEAD_STAGES[idx + 1];
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: nextStage } : l)));
      const { error } = await supabase.from('leads').update({ stage: nextStage }).eq('id', id);
      if (error) {
        dbErrorToast('advance lead', error.message);
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: lead.stage } : l)));
      }
    },
    [leads],
  );

  const setAppointmentStatus = useCallback(
    async (id: string, status: Appointment['status']) => {
      const prevAppt = appointments.find((a) => a.id === id);
      if (!prevAppt) return;
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) {
        dbErrorToast('update appointment', error.message);
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: prevAppt.status } : a)));
      }
    },
    [appointments],
  );

  const addAppointment = useCallback(
    async (input: NewAppointmentInput): Promise<boolean> => {
      const bId = activeBizId;
      const locId = resolveLocationId(input.location ?? defaultLocation);
      const id = generateEntityId();

      const matchingBride = brides.find((b) => b.name === input.customer || b.id === input.customer);
      const customerId = matchingBride && isUuid(matchingBride.id) ? matchingBride.id : null;

      const { startAt, endAt } = timeToIsoRange(input.date, input.time);

      const newAppt: Appointment = {
        id,
        customer: input.customer,
        type: input.type,
        date: input.date,
        time: input.time,
        stylist: input.stylist,
        status: 'Confirmed',
        location: input.location ?? defaultLocation,
        lookingFor: input.lookingFor ?? '',
        budgetCents: input.budgetCents ?? 0,
        feePaid: input.feePaid ?? false,
      };

      const { error } = await supabase.from('appointments').insert({
        id,
        business_id: bId,
        location_id: locId,
        location: newAppt.location,
        customer_id: customerId,
        customer: newAppt.customer,
        type: newAppt.type,
        date: newAppt.date,
        time: newAppt.time,
        start_at: startAt,
        end_at: endAt,
        stylist: newAppt.stylist,
        status: newAppt.status,
        confirmation_status: 'Confirmed',
        intake_source: 'In-Person',
        looking_for: newAppt.lookingFor,
        budget_cents: newAppt.budgetCents,
        fee_paid: newAppt.feePaid,
      });

      if (error) {
        dbErrorToast('book appointment', error.message);
        return false;
      }
      setAppointments((prev) =>
        [...prev, newAppt].sort(
          (a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time),
        ),
      );
      return true;
    },
    [activeBizId, brides, defaultLocation],
  );

  const updateAppointment = useCallback(
    async (id: string, input: AppointmentUpdateInput): Promise<boolean> => {
      const prevAppt = appointments.find((a) => a.id === id);
      if (!prevAppt) return false;
      const updated: Appointment = { ...prevAppt, ...input };
      const locId = resolveLocationId(input.location);
      const { startAt, endAt } = timeToIsoRange(input.date, input.time);

      setAppointments((prev) =>
        prev
          .map((a) => (a.id === id ? updated : a))
          .sort(
            (a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time),
          ),
      );

      const { error } = await supabase
        .from('appointments')
        .update({
          type: updated.type,
          date: updated.date,
          time: updated.time,
          start_at: startAt,
          end_at: endAt,
          stylist: updated.stylist,
          location_id: locId,
          location: updated.location,
        })
        .eq('id', id);

      if (error) {
        dbErrorToast('update appointment', error.message);
        setAppointments((prev) =>
          prev
            .map((a) => (a.id === id ? prevAppt : a))
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time),
            ),
        );
        return false;
      }
      return true;
    },
    [appointments],
  );

  const deleteAppointment = useCallback(
    async (id: string): Promise<boolean> => {
      const prevAppt = appointments.find((a) => a.id === id);
      if (!prevAppt) return false;
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) {
        dbErrorToast('cancel appointment', error.message);
        setAppointments((prev) =>
          [...prev, prevAppt].sort(
            (a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time),
          ),
        );
        return false;
      }
      return true;
    },
    [appointments],
  );

  /** Add a payment amount to the matching bride's lifetime spend (by name). */
  const bumpBrideSpend = useCallback(
    async (customerName: string, deltaCents: number) => {
      if (deltaCents <= 0) return;
      const bride = brides.find((b) => b.name === customerName);
      if (!bride) return;
      const newSpend = bride.spendCents + deltaCents;
      setBrides((prev) => prev.map((b) => (b.id === bride.id ? { ...b, spendCents: newSpend } : b)));
      const { error } = await supabase.from('customers').update({ spend_cents: newSpend }).eq('id', bride.id);
      if (error) {
        setBrides((prev) =>
          prev.map((b) => (b.id === bride.id ? { ...b, spendCents: bride.spendCents } : b)),
        );
        dbErrorToast("update bride's spend total", error.message);
      }
    },
    [brides],
  );

  const addInvoice = useCallback(
    async (input: NewInvoiceInput): Promise<boolean> => {
      const bId = activeBizId;
      const locId = resolveLocationId(input.location ?? defaultLocation);
      const id = generateEntityId();
      const payToken = generateEntityId();

      const matchingCustomer = brides.find((b) => b.name === input.customer || b.id === input.customer);
      const customerId = matchingCustomer && isUuid(matchingCustomer.id) ? matchingCustomer.id : null;

      const deposit = Math.max(0, Math.min(input.depositCents, input.amountCents));
      const status: Invoice['status'] =
        deposit >= input.amountCents ? 'Paid' : deposit > 0 ? 'Partial' : 'Open';

      const newInvoice: Invoice = {
        id,
        customer: input.customer,
        description: input.description,
        amountCents: input.amountCents,
        paidCents: deposit,
        dueDate: input.dueDate,
        status,
        location: input.location ?? defaultLocation,
        payToken,
      };

      const { data: dbInvoice, error } = await supabase
        .from('invoices')
        .insert({
          id,
          business_id: bId,
          location_id: locId,
          location: newInvoice.location,
          customer_id: customerId,
          customer: newInvoice.customer,
          description: newInvoice.description,
          amount_cents: newInvoice.amountCents,
          paid_cents: newInvoice.paidCents,
          due_date: newInvoice.dueDate,
          status: newInvoice.status,
          pay_token: newInvoice.payToken,
        })
        .select()
        .single();

      if (error) {
        dbErrorToast('create invoice', error.message);
        return false;
      }

      setInvoices((prev) =>
        [...prev, newInvoice].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      );
      if (deposit > 0) await bumpBrideSpend(newInvoice.customer, deposit);

      if (input.stagedPaymentPlan) {
        const invId = dbInvoice?.id || id;
        await supabase.from('payment_schedules').insert([
          {
            business_id: bId,
            invoice_id: invId,
            stage_name: 'Deposit (50%)',
            amount_cents: Math.round(input.amountCents * 0.5),
            due_date: input.dueDate,
            paid_cents: deposit >= Math.round(input.amountCents * 0.5) ? Math.round(input.amountCents * 0.5) : deposit,
            status: deposit >= Math.round(input.amountCents * 0.5) ? 'Paid' : 'Pending',
          },
          {
            business_id: bId,
            invoice_id: invId,
            stage_name: 'On Delivery (25%)',
            amount_cents: Math.round(input.amountCents * 0.25),
            due_date: input.dueDate,
            paid_cents: 0,
            status: 'Pending',
          },
          {
            business_id: bId,
            invoice_id: invId,
            stage_name: 'Final Fitting (25%)',
            amount_cents: Math.round(input.amountCents * 0.25),
            due_date: input.dueDate,
            paid_cents: 0,
            status: 'Pending',
          },
        ]);
      }

      return true;
    },
    [activeBizId, brides, bumpBrideSpend, defaultLocation],
  );

  const recordPayment = useCallback(
    async (id: string, paymentCents: number): Promise<boolean> => {
      const prevInv = invoices.find((i) => i.id === id);
      if (!prevInv || paymentCents <= 0) return false;
      const balance = prevInv.amountCents - prevInv.paidCents;
      const payment = Math.min(paymentCents, balance);
      const newPaid = prevInv.paidCents + payment;
      const newStatus: Invoice['status'] = newPaid >= prevInv.amountCents ? 'Paid' : 'Partial';
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, paidCents: newPaid, status: newStatus } : i)),
      );
      const { error } = await supabase
        .from('invoices')
        .update({ paid_cents: newPaid, status: newStatus })
        .eq('id', id);
      if (error) {
        dbErrorToast('record payment', error.message);
        setInvoices((prev) => prev.map((i) => (i.id === id ? prevInv : i)));
        return false;
      }
      await bumpBrideSpend(prevInv.customer, payment);
      return true;
    },
    [invoices, bumpBrideSpend],
  );

  const markPoDelivered = useCallback(
    async (id: string) => {
      const prevPo = purchaseOrders.find((p) => p.id === id);
      if (!prevPo) return;
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Delivered' as const } : p)),
      );
      const { error } = await supabase.from('purchase_orders').update({ status: 'Delivered' }).eq('id', id);
      if (error) {
        dbErrorToast('mark delivered', error.message);
        setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? prevPo : p)));
      }
    },
    [purchaseOrders],
  );

  const updatePoStatus = useCallback(
    async (id: string, newStatus: PurchaseOrder['status']): Promise<boolean> => {
      const prevPo = purchaseOrders.find((p) => p.id === id);
      if (!prevPo) return false;
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
      );
      const { error } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', id);
      if (error) {
        dbErrorToast('update status', error.message);
        setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? prevPo : p)));
        return false;
      }
      return true;
    },
    [purchaseOrders],
  );

  const updatePurchaseOrder = useCallback(
    async (id: string, input: Partial<PurchaseOrder>): Promise<boolean> => {
      const prevPo = purchaseOrders.find((p) => p.id === id);
      if (!prevPo) return false;

      const updatedPo = { ...prevPo, ...input };
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === id ? updatedPo : p)),
      );

      const dbUpdate: Record<string, any> = {};
      if (input.vendor !== undefined) dbUpdate.vendor = input.vendor;
      if (input.items !== undefined) dbUpdate.items = input.items;
      if (input.amountCents !== undefined) dbUpdate.amount_cents = input.amountCents;
      if (input.expectedDelivery !== undefined) dbUpdate.expected_delivery = input.expectedDelivery;
      if (input.status !== undefined) dbUpdate.status = input.status;
      if (input.location !== undefined) {
        dbUpdate.location = input.location;
        dbUpdate.location_id = resolveLocationId(input.location);
      }
      if (input.assignedStaff !== undefined) dbUpdate.assigned_staff = input.assignedStaff;
      if (input.assignedCustomer !== undefined) dbUpdate.assigned_customer = input.assignedCustomer;
      if (input.notes !== undefined) dbUpdate.notes = input.notes;

      const { error } = await supabase.from('purchase_orders').update(dbUpdate).eq('id', id);
      if (error) {
        dbErrorToast('update purchase order', error.message);
        setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? prevPo : p)));
        return false;
      }
      return true;
    },
    [purchaseOrders],
  );

  const deletePurchaseOrder = useCallback(
    async (id: string): Promise<boolean> => {
      const prevPo = purchaseOrders.find((p) => p.id === id);
      if (!prevPo) return false;
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) {
        dbErrorToast('delete purchase order', error.message);
        setPurchaseOrders((prev) => [...prev, prevPo]);
        return false;
      }
      return true;
    },
    [purchaseOrders],
  );

  const addPurchaseOrder = useCallback(
    async (input: { vendor: string; items: string; amountCents: number; expectedDelivery: string; location?: LocationId; assignedStaff?: string; assignedCustomer?: string; notes?: string }): Promise<boolean> => {
      const bId = activeBizId;
      const locId = resolveLocationId(input.location ?? defaultLocation);
      const id = generateEntityId();

      const newPo: PurchaseOrder = {
        id,
        vendor: input.vendor,
        items: input.items,
        amountCents: input.amountCents,
        ordered: todayIso(),
        expectedDelivery: input.expectedDelivery,
        status: 'Ordered',
        location: input.location ?? defaultLocation,
        assignedStaff: input.assignedStaff ?? '',
        assignedCustomer: input.assignedCustomer ?? '',
        notes: input.notes ?? '',
      };

      setPurchaseOrders((prev) => [newPo, ...prev]);

      const { error } = await supabase.from('purchase_orders').insert({
        id: newPo.id,
        business_id: bId,
        location_id: locId,
        location: newPo.location,
        vendor: newPo.vendor,
        items: newPo.items,
        amount_cents: newPo.amountCents,
        ordered: newPo.ordered,
        expected_delivery: newPo.expectedDelivery,
        status: newPo.status,
        assigned_staff: newPo.assignedStaff,
        assigned_customer: newPo.assignedCustomer,
        notes: newPo.notes,
      });

      if (error) {
        dbErrorToast('create purchase order', error.message);
        setPurchaseOrders((prev) => prev.filter((p) => p.id !== newPo.id));
        return false;
      }
      return true;
    },
    [activeBizId, defaultLocation],
  );

  // ─── Gown inventory mutations ───

  const addGown = useCallback(
    async (input: GownInput): Promise<boolean> => {
      const bId = activeBizId;
      const locId = resolveLocationId(input.location ?? defaultLocation);
      const id = generateEntityId();

      const newGown: Gown = {
        id,
        name: input.name,
        designer: input.designer,
        style: input.style,
        size: input.size,
        color: input.color,
        priceCents: input.priceCents,
        stock: input.stock,
        status: gownStatusForStock(input.stock),
        image: input.image,
        location: input.location ?? defaultLocation,
        sku: input.sku?.trim() || `IDB-${id.slice(0, 8).toUpperCase()}`,
        costCents: input.costCents ?? 0,
        msrpCents: input.msrpCents ?? 0,
        category: input.category || 'Bridal Gown',
        condition: input.condition || 'New',
        vendor: input.vendor?.trim() || input.designer,
        reorderPoint: input.reorderPoint ?? 1,
        notes: input.notes ?? '',
      };
      const { error } = await supabase.from('gowns').insert(gownRow(newGown, bId, locId));
      if (error) {
        dbErrorToast('add gown', error.message);
        return false;
      }
      setGowns((prev) => [...prev, newGown].sort((a, b) => a.name.localeCompare(b.name)));
      return true;
    },
    [activeBizId, defaultLocation],
  );

  const updateGown = useCallback(
    async (id: string, input: GownInput): Promise<boolean> => {
      const prevGown = gowns.find((g) => g.id === id);
      if (!prevGown) return false;
      const updated: Gown = {
        ...prevGown,
        ...input,
        location: input.location ?? prevGown.location,
        status: gownStatusForStock(input.stock),
      };
      setGowns((prev) => prev.map((g) => (g.id === id ? updated : g)));
      const locId = resolveLocationId(updated.location);
      const { id: _ignored, ...payload } = gownRow(updated, activeBizId, locId);
      const { error } = await supabase.from('gowns').update(payload).eq('id', id);
      if (error) {
        dbErrorToast('update gown', error.message);
        setGowns((prev) => prev.map((g) => (g.id === id ? prevGown : g)));
        return false;
      }
      return true;
    },
    [activeBizId, gowns],
  );

  const adjustGownStock = useCallback(
    async (id: string, newStock: number): Promise<boolean> => {
      const prevGown = gowns.find((g) => g.id === id);
      if (!prevGown) return false;
      const stock = Math.max(0, Math.round(newStock));
      const status = gownStatusForStock(stock);
      setGowns((prev) => prev.map((g) => (g.id === id ? { ...g, stock, status } : g)));
      const { error } = await supabase.from('gowns').update({ stock, status }).eq('id', id);
      if (error) {
        dbErrorToast('adjust stock', error.message);
        setGowns((prev) => prev.map((g) => (g.id === id ? prevGown : g)));
        return false;
      }
      return true;
    },
    [gowns],
  );

  const adjustGownPrice = useCallback(
    async (id: string, newPriceCents: number): Promise<boolean> => {
      const prevGown = gowns.find((g) => g.id === id);
      if (!prevGown) return false;
      const priceCents = Math.max(0, Math.round(newPriceCents));
      setGowns((prev) => prev.map((g) => (g.id === id ? { ...g, priceCents } : g)));
      const { error } = await supabase.from('gowns').update({ price_cents: priceCents }).eq('id', id);
      if (error) {
        dbErrorToast('change price', error.message);
        setGowns((prev) => prev.map((g) => (g.id === id ? prevGown : g)));
        return false;
      }
      return true;
    },
    [gowns],
  );

  // ─── Inter-store transfer mutations ───

  const addTransfer = useCallback(
    async (input: NewTransferInput): Promise<boolean> => {
      const source = gowns.find((g) => g.id === input.gownId);
      if (!source) {
        dbErrorToast('start transfer', 'Gown not found.');
        return false;
      }
      const qty = Math.max(1, Math.round(input.qty));
      if (qty > source.stock) {
        dbErrorToast('start transfer', `Only ${source.stock} piece(s) available at ${locationById(source.location).short}.`);
        return false;
      }
      if (input.to === source.location) {
        dbErrorToast('start transfer', 'Destination must be a different store.');
        return false;
      }

      const bId = activeBizId;
      const fromLocId = resolveLocationId(source.location);
      const toLocId = resolveLocationId(input.to);
      const id = generateEntityId();

      const newTransfer: Transfer = {
        id,
        gownId: source.id,
        gownName: source.name,
        from: source.location,
        to: input.to,
        qty,
        status: 'In Transit',
        requested: todayIso(),
        received: null,
        note: input.note?.trim() ?? '',
      };

      const newStock = source.stock - qty;
      const newStatus = gownStatusForStock(newStock);
      setGowns((prev) =>
        prev.map((g) => (g.id === source.id ? { ...g, stock: newStock, status: newStatus } : g)),
      );
      setTransfers((prev) => [newTransfer, ...prev]);

      const { error: stockErr } = await supabase
        .from('gowns')
        .update({ stock: newStock, status: newStatus })
        .eq('id', source.id);
      if (stockErr) {
        dbErrorToast('start transfer', stockErr.message);
        setGowns((prev) => prev.map((g) => (g.id === source.id ? source : g)));
        setTransfers((prev) => prev.filter((t) => t.id !== newTransfer.id));
        return false;
      }

      const { error } = await supabase.from('transfers').insert({
        id: newTransfer.id,
        business_id: bId,
        location_id: fromLocId,
        from_location_id: fromLocId,
        to_location_id: toLocId,
        from_location: newTransfer.from,
        to_location: newTransfer.to,
        gown_id: isUuid(newTransfer.gownId) ? newTransfer.gownId : null,
        gown_name: newTransfer.gownName,
        qty: newTransfer.qty,
        status: newTransfer.status,
        requested: newTransfer.requested,
        received: null,
        note: newTransfer.note,
      });

      if (error) {
        dbErrorToast('start transfer', error.message);
        await supabase.from('gowns').update({ stock: source.stock, status: source.status }).eq('id', source.id);
        setGowns((prev) => prev.map((g) => (g.id === source.id ? source : g)));
        setTransfers((prev) => prev.filter((t) => t.id !== newTransfer.id));
        return false;
      }
      return true;
    },
    [activeBizId, gowns],
  );

  const receiveTransfer = useCallback(
    async (id: string): Promise<boolean> => {
      const transfer = transfers.find((t) => t.id === id);
      if (!transfer || transfer.status !== 'In Transit') return false;
      const sourceGown = gowns.find((g) => g.id === transfer.gownId);

      const destGown = gowns.find(
        (g) =>
          g.location === transfer.to &&
          (sourceGown
            ? g.name === sourceGown.name &&
              g.designer === sourceGown.designer &&
              g.size === sourceGown.size &&
              g.color === sourceGown.color
            : g.name === transfer.gownName),
      );

      const receivedDate = todayIso();

      if (destGown) {
        const newStock = destGown.stock + transfer.qty;
        const newStatus = gownStatusForStock(newStock);
        const { error } = await supabase
          .from('gowns')
          .update({ stock: newStock, status: newStatus })
          .eq('id', destGown.id);
        if (error) {
          dbErrorToast('receive transfer', error.message);
          return false;
        }
        setGowns((prev) =>
          prev.map((g) => (g.id === destGown.id ? { ...g, stock: newStock, status: newStatus } : g)),
        );
      } else if (sourceGown) {
        const newGownId = generateEntityId();
        const toLocId = resolveLocationId(transfer.to);
        const newGown: Gown = {
          ...sourceGown,
          id: newGownId,
          stock: transfer.qty,
          status: gownStatusForStock(transfer.qty),
          location: transfer.to,
        };
        const { error } = await supabase.from('gowns').insert(gownRow(newGown, activeBizId, toLocId));

        if (error) {
          dbErrorToast('receive transfer', error.message);
          return false;
        }
        setGowns((prev) => [...prev, newGown].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        dbErrorToast('receive transfer', 'The original gown record no longer exists.');
        return false;
      }

      const { error: tErr } = await supabase
        .from('transfers')
        .update({ status: 'Received', received: receivedDate })
        .eq('id', id);
      if (tErr) {
        dbErrorToast('receive transfer', tErr.message);
        await refresh();
        return false;
      }
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Received' as const, received: receivedDate } : t)),
      );
      return true;
    },
    [activeBizId, transfers, gowns, refresh],
  );

  // ─── Location scoping: every view sees only the active store's records ───

  const scoped = useMemo(() => {
    if (activeLocation === 'all') {
      return { brides, appointments, invoices, purchaseOrders, gowns, transfers };
    }
    return {
      brides: brides.filter((b) => b.location === activeLocation),
      appointments: appointments.filter((a) => a.location === activeLocation),
      invoices: invoices.filter((i) => i.location === activeLocation),
      purchaseOrders: purchaseOrders.filter((p) => p.location === activeLocation),
      gowns: gowns.filter((g) => g.location === activeLocation),
      transfers: transfers.filter((t) => t.from === activeLocation || t.to === activeLocation),
    };
  }, [activeLocation, brides, appointments, invoices, purchaseOrders, gowns, transfers]);

  return (
    <VowosDataContext.Provider
      value={{
        brides: scoped.brides,
        leads,
        appointments: scoped.appointments,
        invoices: scoped.invoices,
        purchaseOrders: scoped.purchaseOrders,
        gowns: scoped.gowns,
        transfers: scoped.transfers,
        allGowns: gowns,
        allBrides: brides,
        allAppointments: appointments,
        allInvoices: invoices,
        allPurchaseOrders: purchaseOrders,
        allTransfers: transfers,
        activeLocation,
        setActiveLocation,
        loading,
        refresh,
        addBride,
        advanceLead,
        setAppointmentStatus,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addInvoice,
        recordPayment,
        markPoDelivered,
        updatePoStatus,
        updatePurchaseOrder,
        deletePurchaseOrder,
        addPurchaseOrder,
        addGown,
        updateGown,
        adjustGownStock,
        adjustGownPrice,
        addTransfer,
        receiveTransfer,
        updateBridePhoto,
      }}
    >
      {children}
    </VowosDataContext.Provider>
  );
};
