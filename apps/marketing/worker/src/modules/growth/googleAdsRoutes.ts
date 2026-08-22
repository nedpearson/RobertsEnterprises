import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from './auth';
import { db, getAccessToken } from './store';
import {
  listAccessibleGoogleAdsCustomers,
  readGoogleAdsConfig,
  GOOGLE_ADS_PROVIDER_VERSION,
} from './googleAdsProvider';
import { syncGoogleAdsForBusiness } from './googleAdsSync';

export const googleAdsRouter = Router();
googleAdsRouter.use(requireGrowthAccess);

interface ConnectionRow {
  id: string;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
}

async function connectionFor(businessId: string): Promise<ConnectionRow | null> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('id,external_account_id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'google_ads')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ConnectionRow | null;
}

/** Accounts visible to the authorized Google user plus existing VowOS mappings. */
googleAdsRouter.get('/google-ads/accounts', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const config = readGoogleAdsConfig();
    if (!config) {
      return res.status(503).json({
        error: 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.',
        required: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
      });
    }
    const connection = await connectionFor(businessId);
    if (!connection) return res.status(400).json({ error: 'Google Ads is not connected for this business.' });
    const token = await getAccessToken(connection.id);
    const customerIds = await listAccessibleGoogleAdsCustomers(token, config);
    const { data: mappings, error } = await db()
      .from('growth_provider_account_mappings')
      .select('id,external_account_id,display_name,location_id,is_primary,status,last_sync_at,last_sync_status,last_error,metadata')
      .eq('business_id', businessId)
      .eq('connection_id', connection.id)
      .eq('provider', 'google_ads')
      .order('is_primary', { ascending: false });
    if (error) throw new Error(error.message);
    return res.json({ apiVersion: GOOGLE_ADS_PROVIDER_VERSION, customerIds, mappings: mappings ?? [] });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * Map an external Google Ads customer to this VowOS business/location. The
 * mapping is explicit so multi-location organizations cannot cross-contaminate
 * campaign data merely because one Google login can see several accounts.
 */
googleAdsRouter.post('/google-ads/select-account', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const customerId = String(req.body?.customerId ?? '').replace(/\D/g, '');
    const loginCustomerId = String(req.body?.loginCustomerId ?? '').replace(/\D/g, '') || null;
    const locationId = typeof req.body?.locationId === 'string' && req.body.locationId.trim()
      ? req.body.locationId.trim()
      : null;
    const displayName = typeof req.body?.displayName === 'string' && req.body.displayName.trim()
      ? req.body.displayName.trim()
      : `Google Ads ${customerId}`;
    const isPrimary = req.body?.isPrimary !== false;
    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });

    const config = readGoogleAdsConfig();
    if (!config) return res.status(503).json({ error: 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.' });
    const connection = await connectionFor(businessId);
    if (!connection) return res.status(400).json({ error: 'Google Ads is not connected for this business.' });

    // Verify the user can at least see the selected account directly or the
    // manager account through which the client is being addressed. The first
    // searchStream sync then verifies actual access to the client customer.
    const token = await getAccessToken(connection.id);
    const accessible = await listAccessibleGoogleAdsCustomers(token, config);
    if (!accessible.includes(customerId) && (!loginCustomerId || !accessible.includes(loginCustomerId))) {
      return res.status(403).json({ error: 'The selected customer or manager account is not accessible to this Google user.' });
    }

    if (locationId) {
      const { data: location, error: locationError } = await db()
        .from('locations')
        .select('id')
        .eq('business_id', businessId)
        .eq('id', locationId)
        .maybeSingle();
      if (locationError) throw new Error(locationError.message);
      if (!location) return res.status(400).json({ error: 'The selected VowOS location does not belong to this business.' });
    }

    if (isPrimary) {
      const { error } = await db()
        .from('growth_provider_account_mappings')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('business_id', businessId)
        .eq('connection_id', connection.id)
        .eq('provider', 'google_ads')
        .eq('is_primary', true);
      if (error) throw new Error(error.message);
    }

    let existingQuery = db()
      .from('growth_provider_account_mappings')
      .select('id')
      .eq('business_id', businessId)
      .eq('connection_id', connection.id)
      .eq('provider', 'google_ads')
      .eq('external_account_id', customerId);
    existingQuery = locationId ? existingQuery.eq('location_id', locationId) : existingQuery.is('location_id', null);
    const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    const mappingPayload = {
      business_id: businessId,
      connection_id: connection.id,
      provider: 'google_ads',
      external_account_id: customerId,
      display_name: displayName,
      account_type: loginCustomerId ? 'client_account' : 'direct_account',
      location_id: locationId,
      is_primary: isPrimary,
      status: 'active',
      metadata: { loginCustomerId, apiVersion: GOOGLE_ADS_PROVIDER_VERSION },
      updated_at: new Date().toISOString(),
    };
    const mappingResult = existing?.id
      ? await db().from('growth_provider_account_mappings').update(mappingPayload).eq('id', existing.id)
      : await db().from('growth_provider_account_mappings').insert(mappingPayload);
    if (mappingResult.error) throw new Error(mappingResult.error.message);

    const metadata = {
      ...(connection.metadata ?? {}),
      ...(isPrimary ? { selectedCustomerId: customerId } : {}),
      ...(loginCustomerId && isPrimary ? { loginCustomerId } : {}),
      adsApiVersion: GOOGLE_ADS_PROVIDER_VERSION,
    };
    const connectionPatch: Record<string, unknown> = { metadata, updated_at: new Date().toISOString() };
    if (isPrimary) {
      connectionPatch.external_account_id = customerId;
      connectionPatch.display_name = displayName;
    }
    const { error } = await db()
      .from('growth_provider_connections')
      .update(connectionPatch)
      .eq('business_id', businessId)
      .eq('id', connection.id);
    if (error) throw new Error(error.message);

    return res.json({ ok: true, customerId, loginCustomerId, locationId, isPrimary });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

googleAdsRouter.post('/sync/google-ads', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const requestedCustomerId = String(req.body?.customerId ?? '').replace(/\D/g, '') || undefined;
    const loginCustomerId = String(req.body?.loginCustomerId ?? '').replace(/\D/g, '') || undefined;
    const days = Math.max(1, Math.min(90, Number(req.body?.days ?? 30)));
    const result = await syncGoogleAdsForBusiness(businessId, {
      customerId: requestedCustomerId,
      loginCustomerId,
      days,
    });
    return res.json({
      ok: true,
      apiVersion: GOOGLE_ADS_PROVIDER_VERSION,
      ...result,
      campaigns: result.results.reduce((sum, item) => sum + item.campaigns, 0),
      metricRows: result.results.reduce((sum, item) => sum + item.metricRows, 0),
      note: 'Platform conversions are stored separately. VowOS-verified sales/revenue are preserved during provider resync and populated by reconciliation.',
    });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
