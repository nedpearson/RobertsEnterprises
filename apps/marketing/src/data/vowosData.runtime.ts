// Compatibility view-model for legacy VowOS presentation surfaces.
// Runtime values/constants/functions still come from the canonical data module;
// only interface shapes are widened here where older screens have not yet been
// migrated to the canonical field names.
export * from './vowosData';

import type {
  Customer as CanonicalCustomer,
  Invoice as CanonicalInvoice,
  Gown as CanonicalGown,
  Appointment as CanonicalAppointment,
  Transfer as CanonicalTransfer,
  PurchaseOrder as CanonicalPurchaseOrder,
} from './vowosData';

export interface Customer extends Omit<CanonicalCustomer, 'status'> {
  status: CanonicalCustomer['status'] | 'Completed' | 'Archived';
  purchasedGown?: string;
  /** Legacy display-only dollar amount; appointment budgetCents is canonical. */
  budget?: number;
}

export interface Invoice extends CanonicalInvoice {
  /** Legacy alias for amountCents. */
  totalCents?: number;
  /** Legacy derived alias for amountCents - paidCents. */
  balanceCents?: number;
  /** Legacy sales-date alias. */
  date?: string;
  /** Legacy alias for customer. */
  brideName?: string;
}

export interface Gown extends CanonicalGown {
  sampleSize?: string;
  retailCents?: number;
}

export interface Appointment extends CanonicalAppointment {
  room?: string;
  notes?: string;
}

export interface Transfer extends CanonicalTransfer {
  completed?: string | null;
}

export interface PurchaseOrder extends CanonicalPurchaseOrder {
  costCents?: number;
}
