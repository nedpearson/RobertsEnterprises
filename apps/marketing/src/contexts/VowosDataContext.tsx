import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
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
  location: (r.location ?? 'ido-br') as LocationId,
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

const mapAppointment = (r: any): Appointment => ({
  id: r.id || '',
  customer: r.customer || '',
  type: r.type || '',
  date: r.date || '',
  time: r.time || '',
  stylist: r.stylist || '',
  status: r.status || '',
  location: (r.location ?? 'ido-br') as LocationId,
  lookingFor: r.looking_for ?? '',
  budgetCents: r.budget_cents ?? 0,
  feePaid: r.fee_paid ?? false,
});


const mapInvoice = (r: any): Invoice => ({
  id: r.id || '',
  customer: r.customer || '',
  description: r.description || '',
  amountCents: r.amount_cents || 0,
  paidCents: r.paid_cents || 0,
  dueDate: r.due_date || '',
  status: r.status || '',
  location: (r.location ?? 'ido-br') as LocationId,
  payToken: r.pay_token ?? '',
});


const mapPo = (r: any): PurchaseOrder => ({
  id: r.id || '',
  vendor: r.vendor || '',
  items: r.items || '',
  amountCents: r.amount_cents || 0,
  ordered: r.ordered || '',
  expectedDelivery: r.expected_delivery || '',
  status: r.status || '',
  location: (r.location ?? 'ido-br') as LocationId,
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
  status: r.status || '',
  image: r.image || '',
  location: (r.location ?? 'ido-br') as LocationId,
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
const gownRow = (g: Gown) => ({
  id: g.id,
  name: g.name,
  designer: g.designer,
  style: g.style,
  size: g.size,
  color: g.color,
  price_cents: g.priceCents,
  stock: g.stock,
  status: g.status,
  image: g.image,
  location: g.location,
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
  from: r.from_location as LocationId,
  to: r.to_location as LocationId,
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
  /** What she's shopping for (from LOOKING_FOR_OPTIONS). */
  lookingFor?: string;
  /** Stated budget in cents (from BUDGET_RANGES). */
  budgetCents?: number;
  /** Whether the $75 booking fee was collected at booking time. */
  feePaid?: boolean;
}


/** Fields staff can change when rescheduling an existing appointment. */
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
  /** SKU / tag number — auto-generated from the id when blank. */
  sku?: string;
  /** Wholesale cost in cents. */
  costCents?: number;
  /** MSRP in cents (0 = not tracked). */
  msrpCents?: number;
  category?: string;
  condition?: string;
  /** Ordering vendor — defaults to the designer when blank. */
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
  /** Records scoped to the active location ('all' shows everything). */
  brides: Customer[];
  leads: Lead[];
  appointments: Appointment[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  gowns: Gown[];
  transfers: Transfer[];
  /** Complete, unscoped gown catalog across every store (for transfer pickers). */
  allGowns: Gown[];
  /** Unscoped datasets for cross-location reporting and alerts. */
  allBrides: Customer[];
  allAppointments: Appointment[];
  allInvoices: Invoice[];
  allPurchaseOrders: PurchaseOrder[];
  allTransfers: Transfer[];
  /** Active location filter shared by every view. */
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
  /** Change a gown's retail price on the fly (persists immediately). */
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

export const VowosDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Full, unscoped datasets — location scoping is applied on the way out.
  const [brides, setBrides] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [gowns, setGowns] = useState<Gown[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<LocationFilter>('all');

  /** Location a new record belongs to when a form doesn't specify one. */
  const defaultLocation: LocationId = activeLocation === 'all' ? 'ido-br' : activeLocation;

  const refresh = useCallback(async () => {
    const [bridesRes, leadsRes, apptsRes, invRes, poRes, gownsRes, transfersRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: true }),
      supabase.from('appointments').select('*').order('date', { ascending: true }),
      supabase.from('invoices').select('*').order('due_date', { ascending: true }),
      supabase.from('purchase_orders').select('*').order('expected_delivery', { ascending: true }),
      supabase.from('gowns').select('*').order('id', { ascending: true }),
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
    // Publish this deployment's origin so server-side automations (overdue
    // auto-chase) can build working /pay/:id payment links in their messages.
    registerSiteOrigin();
    // Keep data fresh across staff sessions: refetch when the tab regains focus
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);


  // ─── Mutations (optimistic UI + database persistence) ───

  const addBride = useCallback(
    async (input: NewBrideInput): Promise<boolean> => {
      const maxNum = brides.reduce((max, b) => {
        const m = /^C-(\d+)$/.exec(b.id);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 2000);
      const portalToken =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newBride: Customer = {
        id: `C-${maxNum + 1}`,
        name: input.name,
        email: input.email,
        phone: input.phone || '—',
        weddingDate: input.weddingDate || '2027-06-01',
        stylist: input.stylist,
        status: 'Active',
        spendCents: 0,
        location: input.location ?? defaultLocation,
        portalToken,
      };
      const { error } = await supabase.from('customers').insert({
        id: newBride.id,
        name: newBride.name,
        email: newBride.email,
        phone: newBride.phone,
        wedding_date: newBride.weddingDate,
        stylist: newBride.stylist,
        status: newBride.status,
        spend_cents: newBride.spendCents,
        location: newBride.location,
        portal_token: portalToken,
      });
      if (error) {
        dbErrorToast('add bride', error.message);
        return false;
      }
      setBrides((prev) => [newBride, ...prev]);
      return true;
    },
    [brides, defaultLocation],
  );

  const updateBridePhoto = useCallback(
    async (id: string, photoUrl: string | null): Promise<boolean> => {
      const updatedAt = new Date().toISOString();

      // Update local React state immediately across all views
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

      // Cache in localStorage as fallback
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

      // Persist to Supabase
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

  /** Convert "1:30 PM" style times to minutes-since-midnight for schedule sorting. */
  const timeToMinutes = (t: string): number => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
    if (!m) return 0;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + parseInt(m[2], 10);
  };

  const addAppointment = useCallback(
    async (input: NewAppointmentInput): Promise<boolean> => {
      const maxNum = appointments.reduce((max, a) => {
        const m = /(\d+)$/.exec(a.id);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 5000);
      const newAppt: Appointment = {
        id: `A-${maxNum + 1}`,
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
        id: newAppt.id,
        customer: newAppt.customer,
        type: newAppt.type,
        date: newAppt.date,
        time: newAppt.time,
        stylist: newAppt.stylist,
        status: newAppt.status,
        location: newAppt.location,
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
    [appointments, defaultLocation],
  );


  const updateAppointment = useCallback(
    async (id: string, input: AppointmentUpdateInput): Promise<boolean> => {
      const prevAppt = appointments.find((a) => a.id === id);
      if (!prevAppt) return false;
      const updated: Appointment = { ...prevAppt, ...input };
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
          stylist: updated.stylist,
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
      if (!bride) return; // invoice customer isn't a tracked bride — skip silently
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
      const maxNum = invoices.reduce((max, i) => {
        const m = /(\d+)$/.exec(i.id);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 5000);
      const deposit = Math.max(0, Math.min(input.depositCents, input.amountCents));
      const status: Invoice['status'] =
        deposit >= input.amountCents ? 'Paid' : deposit > 0 ? 'Partial' : 'Open';
      const newInvoice: Invoice = {
        id: `INV-${maxNum + 1}`,
        customer: input.customer,
        description: input.description,
        amountCents: input.amountCents,
        paidCents: deposit,
        dueDate: input.dueDate,
        status,
        location: input.location ?? defaultLocation,
        payToken:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      const { error } = await supabase.from('invoices').insert({
        id: newInvoice.id,
        customer: newInvoice.customer,
        description: newInvoice.description,
        amount_cents: newInvoice.amountCents,
        paid_cents: newInvoice.paidCents,
        due_date: newInvoice.dueDate,
        status: newInvoice.status,
        location: newInvoice.location,
        pay_token: newInvoice.payToken,
      });

      if (error) {
        dbErrorToast('create invoice', error.message);
        return false;
      }
      setInvoices((prev) =>
        [...prev, newInvoice].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      );
      if (deposit > 0) await bumpBrideSpend(newInvoice.customer, deposit);
      return true;
    },
    [invoices, bumpBrideSpend, defaultLocation],
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
      if (input.location !== undefined) dbUpdate.location = input.location;
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
      const nextNum = 7106 + purchaseOrders.length;
      const newPo: PurchaseOrder = {
        id: `PO-${nextNum}`,
        vendor: input.vendor,
        items: input.items,
        amountCents: input.amountCents,
        ordered: new Date().toISOString().slice(0, 10),
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
        vendor: newPo.vendor,
        items: newPo.items,
        amount_cents: newPo.amountCents,
        ordered: newPo.ordered,
        expected_delivery: newPo.expectedDelivery,
        status: newPo.status,
        location: newPo.location,
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
    [purchaseOrders, defaultLocation],
  );

  // ─── Gown inventory mutations ───

  const nextGownId = useCallback(() => {
    const maxNum = gowns.reduce((max, g) => {
      const m = /^G-(\d+)$/.exec(g.id);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 1000);
    return `G-${maxNum + 1}`;
  }, [gowns]);

  const addGown = useCallback(
    async (input: GownInput): Promise<boolean> => {
      const id = nextGownId();
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
        sku: input.sku?.trim() || id.replace('G-', 'IDB-'),
        costCents: input.costCents ?? 0,
        msrpCents: input.msrpCents ?? 0,
        category: input.category || 'Bridal Gown',
        condition: input.condition || 'New',
        vendor: input.vendor?.trim() || input.designer,
        reorderPoint: input.reorderPoint ?? 1,
        notes: input.notes ?? '',
      };
      const { error } = await supabase.from('gowns').insert(gownRow(newGown));
      if (error) {
        dbErrorToast('add gown', error.message);
        return false;
      }
      setGowns((prev) => [...prev, newGown].sort((a, b) => a.id.localeCompare(b.id)));
      return true;
    },
    [nextGownId, defaultLocation],
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
      const { id: _ignored, ...payload } = gownRow(updated);
      const { error } = await supabase.from('gowns').update(payload).eq('id', id);
      if (error) {
        dbErrorToast('update gown', error.message);
        setGowns((prev) => prev.map((g) => (g.id === id ? prevGown : g)));
        return false;
      }
      return true;
    },
    [gowns],
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


  /** Change the retail price on the fly (quick repricing from the sales floor). */
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
      const maxNum = transfers.reduce((max, t) => {
        const m = /^T-(\d+)$/.exec(t.id);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 8000);
      const newTransfer: Transfer = {
        id: `T-${maxNum + 1}`,
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
      // Pull stock out of the source store immediately so it can't be double-sold.
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
        gown_id: newTransfer.gownId,
        gown_name: newTransfer.gownName,
        from_location: newTransfer.from,
        to_location: newTransfer.to,
        qty: newTransfer.qty,
        status: newTransfer.status,
        requested: newTransfer.requested,
        received: null,
        note: newTransfer.note,
      });
      if (error) {
        // Roll the stock back so nothing is lost in limbo.
        dbErrorToast('start transfer', error.message);
        await supabase.from('gowns').update({ stock: source.stock, status: source.status }).eq('id', source.id);
        setGowns((prev) => prev.map((g) => (g.id === source.id ? source : g)));
        setTransfers((prev) => prev.filter((t) => t.id !== newTransfer.id));
        return false;
      }
      return true;
    },
    [gowns, transfers],
  );

  const receiveTransfer = useCallback(
    async (id: string): Promise<boolean> => {
      const transfer = transfers.find((t) => t.id === id);
      if (!transfer || transfer.status !== 'In Transit') return false;
      const sourceGown = gowns.find((g) => g.id === transfer.gownId);

      // Find (or create) the matching gown record at the destination store.
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
        const newGown: Gown = {
          ...sourceGown,
          id: nextGownId(),
          stock: transfer.qty,
          status: gownStatusForStock(transfer.qty),
          location: transfer.to,
        };
        const { error } = await supabase.from('gowns').insert(gownRow(newGown));

        if (error) {
          dbErrorToast('receive transfer', error.message);
          return false;
        }
        setGowns((prev) => [...prev, newGown].sort((a, b) => a.id.localeCompare(b.id)));
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
        await refresh(); // stock already moved — resync everything
        return false;
      }
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Received' as const, received: receivedDate } : t)),
      );
      return true;
    },
    [transfers, gowns, nextGownId, refresh],
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
