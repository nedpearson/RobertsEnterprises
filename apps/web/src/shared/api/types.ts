export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T, TContext = undefined> {
  data: T[];
  meta: PaginationMeta;
  context?: TContext;
}

export interface Boutique {
  id: number;
  name: string;
  brand?: string;
  city?: string;
  address?: string;
  phone?: string;
  hours?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  boutique_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'manager' | 'stylist';
  hourly_wage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: number;
  boutique_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: number;
  boutique_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: number;
  customer_id?: number;
  boutique_id?: number;
  appointment_id?: number;
  booking_type: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: number;
  customer_id: number;
  boutique_id: number;
  consultant_name?: string;
  room_name?: string;
  start_time: string;
  end_time: string;
  type: string;
  notes?: string;
  time_slot?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: number;
  boutique_id?: number;
  vendor_name: string;
  style_number: string;
  style_name: string;
  category: string;
  designer?: string;
  variants?: InventoryVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface InventoryVariant {
  id: number;
  item_id: number;
  sku: string;
  size: string;
  color: string;
  price_cents: number;
  stock_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: number;
  boutique_id?: number;
  customer_id: number;
  total_amount_cents: number;
  tax_amount_cents: number;
  discount_amount_cents: number;
  balance_due_cents: number;
  status: string;
  first_name?: string;
  last_name?: string;
  payments?: Payment[];
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount_cents: number;
  method: string;
  reference_number?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  id: number;
  boutique_id?: number;
  customer_id: number;
  vendor_name: string;
  style_number: string;
  size: string;
  color: string;
  qty: number;
  status: string;
  expected_delivery_date?: string;
  received_at?: string;
  created_at?: string;
}

export interface Transfer {
  id: number;
  from_boutique_id: number;
  to_boutique_id: number;
  inventory_variant_id: number;
  qty: number;
  status: 'In_Transit' | 'Received';
  notes?: string;
  received_at?: string;
  created_at?: string;
  from_location?: string;
  to_location?: string;
  sku?: string;
  size?: string;
  color?: string;
  vendor_name?: string;
  style_number?: string;
}

export interface Alteration {
  id: number;
  boutique_id: number;
  customer_id: number;
  item_description: string;
  status: string;
  due_date?: string;
  notes?: string;
  assigned_seamstress_id?: number;
  customer_name?: string;
  seamstress_name?: string;
}

export interface Timesheet {
  id: number;
  user_id: number;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  approved: boolean;
  status: 'Unpaid' | 'Paid';
  staff_name?: string;
}

export interface Paystub {
  id: number;
  user_id: number;
  boutique_id: number;
  period_start: string;
  period_end: string;
  total_hours: number;
  hourly_rate: number;
  base_pay: number;
  total_pay: number;
  staff_name?: string;
  created_at?: string;
}

export interface ChatChannel {
  id: number;
  name: string;
  boutique_id?: number;
  message_count?: number;
}

export interface ChatMessage {
  id: number;
  channel_id: number;
  author_id: number;
  body: string;
  created_at: string;
  author_name?: string;
}
