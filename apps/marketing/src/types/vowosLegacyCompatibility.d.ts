// Transitional view-model aliases used by older VowOS presentation components.
// Canonical persistence remains the snake_case Supabase schema mapped through
// VowosDataContext.  These fields are optional on purpose: screens must continue
// to fall back to canonical fields when a legacy alias was not materialized.
import '@/data/vowosData';

declare module '@/data/vowosData' {
  interface Customer {
    purchasedGown?: string;
    /** Legacy display-only dollar amount. Prefer appointment budgetCents. */
    budget?: number;
  }

  interface Invoice {
    /** Legacy alias for amountCents. */
    totalCents?: number;
    /** Legacy derived alias: amountCents - paidCents. */
    balanceCents?: number;
    /** Legacy sales-date alias. Prefer dueDate when no transaction date exists. */
    date?: string;
    /** Legacy alias for customer. */
    brideName?: string;
  }

  interface Gown {
    /** Legacy alias for size. */
    sampleSize?: string;
    /** Legacy alias for priceCents. */
    retailCents?: number;
  }

  interface Appointment {
    room?: string;
    notes?: string;
  }

  interface Transfer {
    /** Legacy completion timestamp; canonical transfer receipt is received. */
    completed?: string | null;
  }

  interface PurchaseOrder {
    /** Legacy aggregate cost field retained for historical test fixtures. */
    costCents?: number;
  }
}

export {};
