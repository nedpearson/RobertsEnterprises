export type SupportCategory = 
  | 'ACCOUNT' 
  | 'BOOKING' 
  | 'CUSTOMERS' 
  | 'COMMUNICATIONS' 
  | 'ORDERS' 
  | 'INVENTORY' 
  | 'SHOPIFY' 
  | 'WEBSITE' 
  | 'REPORTING' 
  | 'BILLING' 
  | 'TRAINING' 
  | 'OTHER';

export type SupportSeverity = 'Critical' | 'High' | 'Normal' | 'Question';

export type SupportStatus = 
  | 'NEW' 
  | 'TRIAGED' 
  | 'IN_PROGRESS' 
  | 'WAITING_ON_CUSTOMER' 
  | 'WAITING_ON_PROVIDER' 
  | 'RESOLVED' 
  | 'CLOSED';

export interface SupportTicket {
  id: string;
  organization_id: string;
  user_id?: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: SupportStatus;
  severity: SupportSeverity;
  app_version?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id?: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}
