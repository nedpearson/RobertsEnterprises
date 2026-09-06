/**
 * Shopify location → VowOS location mapping.
 *
 * The prior implementation read connection metadata.locationMappings, a key
 * that no code path ever wrote. Every Shopify order therefore landed with
 * location_id = NULL and Baton Rouge could not be told apart from Covington.
 * A unit test passed the whole time by injecting the metadata by hand.
 *
 * This module replaces that with a real table, a real write path, and an
 * explicit default for online orders — Shopify sends location_id = null on
 * every non-POS order, so a fallback is not optional.
 */
import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { adminClientForConnection } from './admin';
import { normalizeShopDomain } from './oauth';

export interface LocationResolution {
  locationId: string | null;
  source: 'SHOPIFY_LOCATION' | 'DEFAULT' | 'STORE_KEY' | 'UNMAPPED';
}

export interface ShopifyLocationMappingRow {
  id: string;
  business_id: string;
  connection_id: string;
  shopify_location_id: string | null;
  shopify_location_name: string | null;
  location_id: string;
  is_default: boolean;
}

/**
 * Resolves the VowOS location for a webhook payload.
 *
 * Precedence: the exact Shopify location (POS orders) → the connection default
 * (online orders) → unmapped. Unmapped is reported, never silently guessed.
 */
export async function resolveMappedLocation(
  db: SupabaseClient | any,
  input: { businessId: string; connectionId: string; shopifyLocationId?: string | null },
): Promise<LocationResolution> {
  const { data, error } = await db
    .from('shopify_location_mappings')
    .select('shopify_location_id,location_id,is_default')
    .eq('business_id', input.businessId)
    .eq('connection_id', input.connectionId);

  if (error) throw new Error(`Could not read Shopify location mappings: ${error.message}`);
  const rows = (data ?? []) as Array<Pick<ShopifyLocationMappingRow, 'shopify_location_id' | 'location_id' | 'is_default'>>;
  if (!rows.length) return { locationId: null, source: 'UNMAPPED' };

  const shopifyLocationId = input.shopifyLocationId ? String(input.shopifyLocationId).trim() : '';
  if (shopifyLocationId) {
    const exact = rows.find((row) => row.shopify_location_id === shopifyLocationId);
    if (exact) return { locationId: exact.location_id, source: 'SHOPIFY_LOCATION' };
  }

  const fallback = rows.find((row) => row.is_default);
  if (fallback) return { locationId: fallback.location_id, source: 'DEFAULT' };

  return { locationId: null, source: 'UNMAPPED' };
}

/** Locations as Shopify reports them, for the mapping UI to bind against. */
export async function fetchShopifyLocations(
  db: SupabaseClient | any,
  connection: { id: string; shopDomain: string },
): Promise<Array<{ id: string; name: string; active: boolean; city: string | null }>> {
  const admin = await adminClientForConnection(db, connection);
  const rows = await admin.paginate<any>('/locations.json', 'locations', { limit: 250 }, 5);
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? '').trim() || `Location ${row.id}`,
    active: row.active !== false,
    city: typeof row.city === 'string' && row.city.trim() ? row.city.trim() : null,
  }));
}

async function connectionForBusiness(
  db: SupabaseClient | any,
  businessId: string,
  shop?: string | null,
): Promise<{ id: string; shopDomain: string } | null> {
  let query = db
    .from('growth_provider_connections')
    .select('id,metadata,status')
    .eq('business_id', businessId)
    .eq('provider', 'shopify');

  const normalized = shop ? normalizeShopDomain(shop) : null;
  if (normalized) query = query.ilike('metadata->>shopDomain', normalized);

  const { data, error } = await query.limit(2);
  if (error) throw new Error(`Could not resolve Shopify connection: ${error.message}`);

  const rows = (data ?? []) as Array<{ id: string; metadata: any }>;
  if (rows.length !== 1) return null;

  const shopDomain = typeof rows[0].metadata?.shopDomain === 'string' ? rows[0].metadata.shopDomain : '';
  if (!shopDomain) return null;
  return { id: rows[0].id, shopDomain };
}

export function createLocationMappingRouter(getDb: () => SupabaseClient): Router {
  const router = Router();

  /** Everything the mapping UI needs in one call: Shopify's side, ours, and the current bindings. */
  router.get('/locations', requireGrowthAccess, async (req, res) => {
    const { businessId } = growthContextOf(req);
    const db = getDb();

    try {
      const connection = await connectionForBusiness(db, businessId, req.query.shop as string | undefined);
      if (!connection) {
        return res.status(409).json({
          code: 'SHOPIFY_CONNECTION_REQUIRED',
          error: 'Connect exactly one Shopify store before mapping locations, or name the store domain.',
        });
      }

      const [{ data: vowosLocations, error: locationsError }, { data: mappings, error: mappingsError }] =
        await Promise.all([
          db.from('locations').select('id,name,brand_id').eq('business_id', businessId).order('name'),
          db
            .from('shopify_location_mappings')
            .select('id,shopify_location_id,shopify_location_name,location_id,is_default')
            .eq('business_id', businessId)
            .eq('connection_id', connection.id),
        ]);

      if (locationsError) throw new Error(`Could not load VowOS locations: ${locationsError.message}`);
      if (mappingsError) throw new Error(`Could not load current mappings: ${mappingsError.message}`);

      let shopifyLocations: Array<{ id: string; name: string; active: boolean; city: string | null }> = [];
      let shopifyLocationsError: string | null = null;
      try {
        shopifyLocations = await fetchShopifyLocations(db, connection);
      } catch (error) {
        // read_locations may not be granted on a store installed before the
        // scope was added. Report it rather than showing an empty list.
        shopifyLocationsError = error instanceof Error ? error.message : String(error);
      }

      return res.json({
        connectionId: connection.id,
        shop: connection.shopDomain,
        shopifyLocations,
        shopifyLocationsError,
        vowosLocations: vowosLocations ?? [],
        mappings: mappings ?? [],
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * Replaces the full mapping set for a connection.
   *
   * Whole-set replacement rather than per-row edits: a partial write is how a
   * connection ends up with two defaults or an orphaned binding.
   */
  router.put('/locations', requireGrowthAccess, async (req, res) => {
    const { businessId } = growthContextOf(req);
    const db = getDb();

    const submitted = Array.isArray(req.body?.mappings) ? req.body.mappings : null;
    if (!submitted) {
      return res.status(400).json({ error: 'Provide a "mappings" array.' });
    }

    try {
      const connection = await connectionForBusiness(db, businessId, req.body?.shop);
      if (!connection) {
        return res.status(409).json({
          code: 'SHOPIFY_CONNECTION_REQUIRED',
          error: 'Connect exactly one Shopify store before mapping locations, or name the store domain.',
        });
      }

      const { data: ownedLocations, error: ownedError } = await db
        .from('locations')
        .select('id')
        .eq('business_id', businessId);
      if (ownedError) throw new Error(`Could not verify location ownership: ${ownedError.message}`);
      const ownedIds = new Set((ownedLocations ?? []).map((row: any) => row.id));

      const rows: Array<Record<string, unknown>> = [];
      let defaults = 0;

      for (const entry of submitted) {
        const locationId = typeof entry?.locationId === 'string' ? entry.locationId.trim() : '';
        if (!locationId) return res.status(400).json({ error: 'Every mapping needs a locationId.' });
        if (!ownedIds.has(locationId)) {
          return res.status(403).json({
            code: 'LOCATION_NOT_IN_ORGANIZATION',
            error: 'A submitted location does not belong to this organization.',
          });
        }

        const shopifyLocationId =
          typeof entry?.shopifyLocationId === 'string' && entry.shopifyLocationId.trim()
            ? entry.shopifyLocationId.trim()
            : null;
        const isDefault = entry?.isDefault === true;
        if (isDefault) defaults += 1;
        if (!shopifyLocationId && !isDefault) {
          return res.status(400).json({
            error: 'A mapping must either name a Shopify location or be marked as the default for online orders.',
          });
        }

        rows.push({
          business_id: businessId,
          connection_id: connection.id,
          shopify_location_id: shopifyLocationId,
          shopify_location_name:
            typeof entry?.shopifyLocationName === 'string' ? entry.shopifyLocationName.trim().slice(0, 256) : null,
          location_id: locationId,
          is_default: isDefault,
          updated_at: new Date().toISOString(),
        });
      }

      if (defaults > 1) {
        return res.status(400).json({
          error: 'Exactly one location may be the default for online orders.',
        });
      }
      if (rows.length && defaults === 0) {
        return res.status(400).json({
          code: 'DEFAULT_LOCATION_REQUIRED',
          error:
            'Choose a default location. Shopify sends no location on online orders, so without a default that revenue cannot be attributed to a boutique.',
        });
      }

      const clear = await db
        .from('shopify_location_mappings')
        .delete()
        .eq('business_id', businessId)
        .eq('connection_id', connection.id);
      if (clear.error) throw new Error(`Could not clear existing mappings: ${clear.error.message}`);

      if (rows.length) {
        const insert = await db.from('shopify_location_mappings').insert(rows);
        if (insert.error) throw new Error(`Could not save mappings: ${insert.error.message}`);
      }

      return res.json({ success: true, saved: rows.length, connectionId: connection.id });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * Backfills location_id on Shopify orders already stored without one, using
   * the mappings just saved. Without this, every order received before the
   * mapping existed stays permanently unattributed.
   */
  router.post('/locations/backfill', requireGrowthAccess, async (req, res) => {
    const { businessId } = growthContextOf(req);
    const db = getDb();

    try {
      const connection = await connectionForBusiness(db, businessId, req.body?.shop);
      if (!connection) {
        return res.status(409).json({ code: 'SHOPIFY_CONNECTION_REQUIRED', error: 'No single Shopify connection resolved.' });
      }

      const { data: orders, error: ordersError } = await db
        .from('orders')
        .select('id,raw_payload')
        .eq('business_id', businessId)
        .eq('source_type', 'SHOPIFY')
        .is('location_id', null)
        .limit(1000);
      if (ordersError) throw new Error(`Could not load unattributed orders: ${ordersError.message}`);

      let updated = 0;
      let stillUnmapped = 0;

      for (const order of (orders ?? []) as Array<{ id: string; raw_payload: any }>) {
        const shopifyLocationId = order.raw_payload?.location_id
          ? String(order.raw_payload.location_id)
          : null;
        const resolution = await resolveMappedLocation(db, {
          businessId,
          connectionId: connection.id,
          shopifyLocationId,
        });
        if (!resolution.locationId) {
          stillUnmapped += 1;
          continue;
        }
        const { error } = await db
          .from('orders')
          .update({ location_id: resolution.locationId, updated_at: new Date().toISOString() })
          .eq('id', order.id);
        if (!error) updated += 1;
      }

      return res.json({ success: true, updated, stillUnmapped, scanned: (orders ?? []).length });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
}
