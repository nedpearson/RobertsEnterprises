import { getActiveDataPlane } from '@/lib/supabase';
import {
  CatalogProduct,
  CommerceConnection,
  CommerceOrder,
  CommerceSyncIssue,
  InventoryCountSession,
  InventoryLevel,
  InventoryMovement,
  Vendor,
  CatalogImportBatch
} from '../types/properCommerceTypes';

// Initial Local Connection State
let connectionState: CommerceConnection = {
  brand: 'Proper & Company',
  shopDomain: 'properandcompany.myshopify.com',
  shopName: 'Proper & Co. Boutique',
  status: 'connected',
  grantedScopes: [
    'read_products',
    'write_products',
    'read_inventory',
    'write_inventory',
    'read_orders',
    'write_orders',
    'read_fulfillments',
    'write_fulfillments'
  ],
  installedAt: '2026-06-15T10:00:00Z',
  lastVerifiedAt: new Date().toISOString(),
  lastSyncAt: new Date().toISOString(),
  health: 'Healthy',
  locationMappings: [
    { vowosLocationId: 'pc-br', shopifyLocationId: 'loc_sh_101', shopifyLocationName: 'Proper & Co — Baton Rouge' },
    { vowosLocationId: 'pc-cov', shopifyLocationId: 'loc_sh_102', shopifyLocationName: 'Proper & Co — Covington' },
  ],
};

// Initial Seed Products for Proper & Co
let inMemoryProducts: CatalogProduct[] = getActiveDataPlane() === 'demo' ? [
  {
    id: 'pc-prod-001',
    brand: 'Proper & Company',
    vendorId: 'v-201',
    vendorName: 'Vow & Velvet',
    itemNumber: 'VV-8801',
    styleNumber: 'LWD-8801',
    title: 'Silk Crepe Mini Cocktail Dress',
    subtitle: 'Little White Dress Collection',
    description: 'A structural silk crepe mini featuring a contoured waist, subtle corsetry, and clean modern lines.',
    designer: 'Vow & Velvet',
    category: 'Little White Dresses',
    collection: 'Spring 2026',
    season: 'Spring 2026',
    purchaseMode: 'buy_online',
    onlineEligible: true,
    publishStatus: 'published',
    tags: ['LWD', 'Mini', 'Silk', 'Rehearsal'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    mediaUrls: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'
    ],
    shopifyProductId: 'gid://shopify/Product/98127361',
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-06-01T12:00:00Z',
    updatedAt: new Date().toISOString(),
    variants: [
      {
        id: 'var-001-s',
        productId: 'pc-prod-001',
        sku: 'VV-8801-IV-S',
        barcode: '849102930192',
        color: 'Ivory',
        size: 'Small',
        costCents: 18000,
        retailPriceCents: 45000,
        compareAtPriceCents: 45000,
        mapPriceCents: 42000,
        msrpCents: 45000,
        inventoryBatonRouge: 3,
        inventoryCovington: 2,
        active: true,
      },
      {
        id: 'var-001-m',
        productId: 'pc-prod-001',
        sku: 'VV-8801-IV-M',
        barcode: '849102930193',
        color: 'Ivory',
        size: 'Medium',
        costCents: 18000,
        retailPriceCents: 45000,
        compareAtPriceCents: 45000,
        mapPriceCents: 42000,
        msrpCents: 45000,
        inventoryBatonRouge: 2,
        inventoryCovington: 1,
        active: true,
      },
    ],
  },
  {
    id: 'pc-prod-002',
    brand: 'Proper & Company',
    vendorId: 'v-202',
    vendorName: 'Maison Luxe',
    itemNumber: 'ML-9920',
    styleNumber: 'EVE-9920',
    title: 'Embellished Tulle Gown',
    subtitle: 'Gala & Eveningwear',
    description: 'Floor-length embellished tulle gown with crystal detailing and sweeping silhouette.',
    designer: 'Maison Luxe',
    category: 'Evening',
    collection: 'Fall 2026',
    season: 'Fall 2026',
    purchaseMode: 'reserve_in_store',
    onlineEligible: true,
    publishStatus: 'published',
    tags: ['Gala', 'Evening', 'Embellished'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'],
    shopifyProductId: 'gid://shopify/Product/98127362',
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-06-10T14:00:00Z',
    updatedAt: new Date().toISOString(),
    variants: [
      {
        id: 'var-002-m',
        productId: 'pc-prod-002',
        sku: 'ML-9920-NV-M',
        barcode: '849102930200',
        color: 'Navy',
        size: 'Medium',
        costCents: 32000,
        retailPriceCents: 78000,
        compareAtPriceCents: 78000,
        msrpCents: 78000,
        inventoryBatonRouge: 1,
        inventoryCovington: 0,
        active: true,
      },
    ],
  },
] : [];

const inMemoryMovements: InventoryMovement[] = getActiveDataPlane() === 'demo' ? [
  {
    id: 'mov-101',
    variantId: 'var-001-s',
    sku: 'VV-8801-IV-S',
    productTitle: 'Silk Crepe Mini Cocktail Dress',
    locationId: 'pc-br',
    quantityDelta: 3,
    quantityBefore: 0,
    quantityAfter: 3,
    movementType: 'initial_import',
    reason: 'Vendor catalog import shipment #BR-991',
    performedBy: 'Ramsey Sims',
    occurredAt: '2026-06-15T11:00:00Z',
  },
] : [];

const inMemoryOrders: CommerceOrder[] = getActiveDataPlane() === 'demo' ? [
  {
    id: 'ord-3001',
    orderNumber: '#PC-1001',
    customerName: 'Caroline Vance',
    customerEmail: 'caroline.vance@gmail.com',
    locationId: 'pc-br',
    totalCents: 45000,
    financialStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    pickupStatus: 'ready_for_pickup',
    placedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    lines: [
      {
        id: 'line-1',
        productId: 'pc-prod-001',
        variantId: 'var-001-s',
        sku: 'VV-8801-IV-S',
        title: 'Silk Crepe Mini Cocktail Dress',
        variantTitle: 'Ivory / Small',
        quantity: 1,
        unitPriceCents: 45000,
      },
    ],
  },
] : [];

let inMemoryCountSessions: InventoryCountSession[] = [];
let inMemorySyncIssues: CommerceSyncIssue[] = [];

// ─── Connection API ───
export async function fetchCommerceConnection(): Promise<CommerceConnection> {
  return { ...connectionState };
}

export async function connectShopify(shopDomain: string): Promise<CommerceConnection> {
  connectionState = {
    ...connectionState,
    shopDomain: shopDomain.includes('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`,
    status: 'connected',
    health: 'Healthy',
    lastVerifiedAt: new Date().toISOString(),
  };
  return { ...connectionState };
}

export async function disconnectShopify(): Promise<boolean> {
  connectionState = {
    ...connectionState,
    status: 'disconnected',
    health: 'Disconnected',
  };
  return true;
}

// ─── Catalog Products API ───
export async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  return [...inMemoryProducts];
}

export async function addCatalogProduct(prod: Omit<CatalogProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogProduct> {
  const newProd: CatalogProduct = {
    ...prod,
    id: `pc-prod-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryProducts = [newProd, ...inMemoryProducts];
  return newProd;
}

export async function updateCatalogProduct(id: string, updates: Partial<CatalogProduct>): Promise<CatalogProduct | null> {
  const idx = inMemoryProducts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  inMemoryProducts[idx] = {
    ...inMemoryProducts[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return inMemoryProducts[idx];
}

export async function bulkPublishProducts(productIds: string[]): Promise<number> {
  let count = 0;
  inMemoryProducts = inMemoryProducts.map((p) => {
    if (productIds.includes(p.id)) {
      count++;
      return {
        ...p,
        publishStatus: 'published',
        syncStatus: 'synced',
        shopifyProductId: p.shopifyProductId || `gid://shopify/Product/${Math.floor(Math.random() * 900000 + 100000)}`,
        lastSyncedAt: new Date().toISOString(),
      };
    }
    return p;
  });
  return count;
}

export async function bulkUnpublishProducts(productIds: string[]): Promise<number> {
  let count = 0;
  inMemoryProducts = inMemoryProducts.map((p) => {
    if (productIds.includes(p.id)) {
      count++;
      return { ...p, publishStatus: 'draft', syncStatus: 'unpublished' };
    }
    return p;
  });
  return count;
}

// ─── Inventory Levels & Ledger API ───
export async function fetchInventoryLevels(locationId?: 'pc-br' | 'pc-cov'): Promise<InventoryLevel[]> {
  const levels: InventoryLevel[] = [];
  inMemoryProducts.forEach((p) => {
    p.variants.forEach((v) => {
      if (!locationId || locationId === 'pc-br') {
        levels.push({
          variantId: v.id,
          sku: v.sku,
          productTitle: p.title,
          locationId: 'pc-br',
          locationName: 'Proper & Co — Baton Rouge',
          onHand: v.inventoryBatonRouge,
          reserved: 0,
          committed: 0,
          damaged: 0,
          sample: 0,
          inTransfer: 0,
          available: v.inventoryBatonRouge,
          reorderPoint: 1,
          reorderQuantity: 3,
        });
      }
      if (!locationId || locationId === 'pc-cov') {
        levels.push({
          variantId: v.id,
          sku: v.sku,
          productTitle: p.title,
          locationId: 'pc-cov',
          locationName: 'Proper & Co — Covington',
          onHand: v.inventoryCovington,
          reserved: 0,
          committed: 0,
          damaged: 0,
          sample: 0,
          inTransfer: 0,
          available: v.inventoryCovington,
          reorderPoint: 1,
          reorderQuantity: 3,
        });
      }
    });
  });
  return levels;
}

export async function fetchInventoryMovements(): Promise<InventoryMovement[]> {
  return [...inMemoryMovements];
}

// ─── Inventory Counts API ───
export async function fetchCountSessions(): Promise<InventoryCountSession[]> {
  return [...inMemoryCountSessions];
}

export async function createCountSession(
  locationId: 'pc-br' | 'pc-cov',
  scope: 'Full Store' | 'Category' | 'Vendor',
  blindCount: boolean,
  startedBy: string
): Promise<InventoryCountSession> {
  const levels = await fetchInventoryLevels(locationId);
  const lines = levels.map((lvl) => {
    const prod = inMemoryProducts.find((p) => p.variants.some((v) => v.id === lvl.variantId));
    const variant = prod?.variants.find((v) => v.id === lvl.variantId);
    return {
      variantId: lvl.variantId,
      sku: lvl.sku,
      productTitle: lvl.productTitle,
      size: variant?.size || 'OS',
      color: variant?.color || 'Default',
      expectedQty: lvl.onHand,
      countedQty: 0,
      varianceQty: -lvl.onHand,
      costCents: variant?.costCents || 0,
    };
  });

  const session: InventoryCountSession = {
    id: `count-${Date.now().toString().slice(-4)}`,
    locationId,
    locationName: locationId === 'pc-br' ? 'Proper & Co — Baton Rouge' : 'Proper & Co — Covington',
    scope,
    blindCount,
    status: 'in_progress',
    startedBy,
    startedAt: new Date().toISOString(),
    scannedCount: 0,
    totalExpected: lines.reduce((s, l) => s + l.expectedQty, 0),
    totalVarianceUnits: -lines.reduce((s, l) => s + l.expectedQty, 0),
    totalVarianceCostCents: -lines.reduce((s, l) => s + l.expectedQty * l.costCents, 0),
    lines,
  };

  inMemoryCountSessions = [session, ...inMemoryCountSessions];
  return session;
}

export async function submitCountSession(sessionId: string): Promise<InventoryCountSession | null> {
  const session = inMemoryCountSessions.find((s) => s.id === sessionId);
  if (!session) return null;
  session.status = 'awaiting_approval';
  session.submittedAt = new Date().toISOString();
  return { ...session };
}

export async function approveCountSession(sessionId: string, approvedBy: string): Promise<InventoryCountSession | null> {
  const session = inMemoryCountSessions.find((s) => s.id === sessionId);
  if (!session) return null;

  session.status = 'approved';
  session.approvedBy = approvedBy;
  session.approvedAt = new Date().toISOString();

  // Apply count variance to product stock & log movements
  session.lines.forEach((line) => {
    inMemoryProducts.forEach((p) => {
      const v = p.variants.find((v) => v.id === line.variantId);
      if (v) {
        const before = session.locationId === 'pc-br' ? v.inventoryBatonRouge : v.inventoryCovington;
        if (session.locationId === 'pc-br') v.inventoryBatonRouge = line.countedQty;
        else v.inventoryCovington = line.countedQty;

        inMemoryMovements.unshift({
          id: `mov-${Date.now().toString().slice(-4)}`,
          variantId: v.id,
          sku: v.sku,
          productTitle: p.title,
          locationId: session.locationId,
          quantityDelta: line.countedQty - before,
          quantityBefore: before,
          quantityAfter: line.countedQty,
          movementType: 'count_adjustment',
          reason: `Physical Count ${session.id} approval by ${approvedBy}`,
          performedBy: approvedBy,
          occurredAt: new Date().toISOString(),
        });
      }
    });
  });

  return { ...session };
}

// ─── Stock Adjustment API ───
export async function recordStockAdjustment(
  productId: string,
  variantId: string,
  locationId: 'pc-br' | 'pc-cov',
  delta: number,
  reason: string,
  performedBy: string
): Promise<boolean> {
  const prod = inMemoryProducts.find((p) => p.id === productId);
  if (!prod) return false;
  const variant = prod.variants.find((v) => v.id === variantId);
  if (!variant) return false;

  const before = locationId === 'pc-br' ? variant.inventoryBatonRouge : variant.inventoryCovington;
  const after = Math.max(0, before + delta);

  if (locationId === 'pc-br') variant.inventoryBatonRouge = after;
  else variant.inventoryCovington = after;

  inMemoryMovements.unshift({
    id: `mov-${Date.now().toString().slice(-4)}`,
    variantId: variant.id,
    sku: variant.sku,
    productTitle: prod.title,
    locationId,
    quantityDelta: delta,
    quantityBefore: before,
    quantityAfter: after,
    movementType: delta >= 0 ? 'receiving' : 'damage',
    reason: `${reason} (${performedBy})`,
    performedBy,
    occurredAt: new Date().toISOString(),
  });

  return true;
}

export async function deleteCatalogProduct(id: string): Promise<boolean> {
  inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id);
  return true;
}

// ─── Commerce Orders API ───
export async function fetchCommerceOrders(): Promise<CommerceOrder[]> {
  return [...inMemoryOrders];
}

export async function fulfillCommerceOrder(orderId: string): Promise<CommerceOrder | null> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return null;
  order.fulfillmentStatus = 'fulfilled';
  order.pickupStatus = 'picked_up';
  return { ...order };
}

// ─── Sync Issues API ───
export async function fetchSyncIssues(): Promise<CommerceSyncIssue[]> {
  return [...inMemorySyncIssues];
}

export async function retrySyncIssue(id: string): Promise<boolean> {
  inMemorySyncIssues = inMemorySyncIssues.filter((i) => i.id !== id);
  return true;
}

// ─── Vendor Import Helper Template ───
export function generateVendorTemplateCSV(): string {
  return `vendor_name,vendor_code,item_number,style_number,product_title,subtitle,short_description,full_description,designer,category,subcategory,collection,season,material,care_instructions,country_of_origin,sku,barcode,upc,color,color_family,size,width,cost,msrp,retail_price,compare_at_price,map_price,taxable,weight,weight_unit,length,width_dimension,height,purchase_mode,online_eligible,publish_status,baton_rouge_quantity,covington_quantity,reorder_point,reorder_quantity,image_url_1,image_url_2,tags,seo_title,seo_description,active,discontinued
Vow & Velvet,VV,VV-9901,LWD-9901,Embroidered Organza Dress,Little White Dress,Delicate floral embroidery,Handcrafted organza dress,Vow & Velvet,Little White Dresses,Mini,Spring 2026,Spring 2026,Organza,Dry Clean,USA,VV-9901-IV-S,849102930999,,Ivory,White,Small,,190.00,480.00,480.00,480.00,450.00,true,0.5,lb,,,buy_online,true,draft,2,1,1,3,https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80,,LWD;Organza,Embroidered Organza Dress,Elegant organza bridal dress,true,false`;
}
