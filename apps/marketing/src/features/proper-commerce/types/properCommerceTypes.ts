export type PurchaseMode =
  | 'buy_online'
  | 'reserve_in_store'
  | 'book_appointment'
  | 'inquire_stylist'
  | 'appointment_only'
  | 'do_not_publish';

export type SyncStatus = 'synced' | 'pending' | 'draft' | 'error' | 'unpublished';

export interface Vendor {
  id: string;
  name: string;
  vendorCode: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  defaultMarginPercent: number;
  active: boolean;
}

export interface CatalogVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  upc?: string;
  color: string;
  size: string;
  costCents: number;
  retailPriceCents: number;
  compareAtPriceCents?: number;
  mapPriceCents?: number;
  msrpCents?: number;
  weightGrams?: number;
  inventoryBatonRouge: number;
  inventoryCovington: number;
  active: boolean;
}

export interface CatalogProduct {
  id: string;
  brand: 'Proper & Company';
  vendorId: string;
  vendorName: string;
  itemNumber: string;
  styleNumber: string;
  title: string;
  subtitle?: string;
  description: string;
  designer: string;
  category: string;
  collection?: string;
  season?: string;
  purchaseMode: PurchaseMode;
  onlineEligible: boolean;
  publishStatus: 'published' | 'draft' | 'archived';
  tags: string[];
  primaryImageUrl?: string;
  mediaUrls: string[];
  variants: CatalogVariant[];
  shopifyProductId?: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLevel {
  variantId: string;
  sku: string;
  productTitle: string;
  locationId: 'pc-br' | 'pc-cov';
  locationName: string;
  onHand: number;
  reserved: number;
  committed: number;
  damaged: number;
  sample: number;
  inTransfer: number;
  available: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastCountedAt?: string;
}

export interface InventoryMovement {
  id: string;
  variantId: string;
  sku: string;
  productTitle: string;
  locationId: 'pc-br' | 'pc-cov';
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  movementType:
    | 'initial_import'
    | 'receiving'
    | 'sale'
    | 'return'
    | 'reservation'
    | 'transfer_out'
    | 'transfer_in'
    | 'damage'
    | 'sample_assignment'
    | 'count_adjustment'
    | 'shopify_reconciliation';
  reason: string;
  performedBy: string;
  occurredAt: string;
}

export interface CommerceConnection {
  brand: 'Proper & Company';
  shopDomain: string;
  shopName: string;
  status: 'connected' | 'disconnected' | 'reauth_required';
  grantedScopes: string[];
  installedAt?: string;
  lastVerifiedAt?: string;
  lastSyncAt?: string;
  health: 'Healthy' | 'Degraded' | 'Disconnected';
  locationMappings: {
    vowosLocationId: 'pc-br' | 'pc-cov';
    shopifyLocationId: string;
    shopifyLocationName: string;
  }[];
}

export interface CommerceOrderLine {
  id: string;
  productId?: string;
  variantId?: string;
  sku: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CommerceOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  locationId: 'pc-br' | 'pc-cov';
  totalCents: number;
  financialStatus: 'paid' | 'pending' | 'refunded';
  fulfillmentStatus: 'fulfilled' | 'unfulfilled' | 'partial';
  pickupStatus?: 'ready_for_pickup' | 'picked_up' | 'none';
  placedAt: string;
  lines: CommerceOrderLine[];
}

export interface CatalogImportBatch {
  id: string;
  vendorName: string;
  sourceFilename: string;
  status: 'completed' | 'processing' | 'draft' | 'failed';
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  importedBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface InventoryCountSession {
  id: string;
  locationId: 'pc-br' | 'pc-cov';
  locationName: string;
  scope: 'Full Store' | 'Category' | 'Vendor';
  blindCount: boolean;
  status: 'in_progress' | 'awaiting_approval' | 'approved' | 'rejected';
  startedBy: string;
  approvedBy?: string;
  startedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  scannedCount: number;
  totalExpected: number;
  totalVarianceUnits: number;
  totalVarianceCostCents: number;
  lines: {
    variantId: string;
    sku: string;
    productTitle: string;
    size: string;
    color: string;
    expectedQty: number;
    countedQty: number;
    varianceQty: number;
    costCents: number;
    reason?: string;
  }[];
}

export interface CommerceSyncIssue {
  id: string;
  entityType: 'Product' | 'Inventory' | 'Order' | 'Webhook';
  entityId: string;
  entityName: string;
  errorMessage: string;
  occurredAt: string;
  attempts: number;
  resolved: boolean;
}
