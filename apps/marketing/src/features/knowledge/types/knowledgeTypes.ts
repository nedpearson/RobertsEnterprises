export type KnowledgeCategory =
  | 'GETTING_STARTED'
  | 'CUSTOMERS'
  | 'APPOINTMENTS'
  | 'BOOKING'
  | 'COMMUNICATIONS'
  | 'INVENTORY'
  | 'ORDERS'
  | 'SHOPIFY'
  | 'WEBSITES'
  | 'MARKETING'
  | 'REPORTS'
  | 'STAFF'
  | 'BILLING'
  | 'SECURITY'
  | 'TROUBLESHOOTING';

export type KnowledgeAudience = 'ADMIN' | 'EMPLOYEE' | 'PUBLIC';

export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category: KnowledgeCategory;
  audience: KnowledgeAudience;
  role?: string;
  status: KnowledgeStatus;
  created_at: string;
  updated_at: string;
}
