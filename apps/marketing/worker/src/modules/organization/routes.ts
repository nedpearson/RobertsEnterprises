import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { growthDb } from '../growth/client';
import { customersRouter } from '../customers/routes';
import { salesRouter } from '../sales/routes';
import { communicationAutomationRouter } from '../communications/automationRoutes';
import { organizationCommunicationsRouter } from './communicationsRoutes';
import { SERVER_MODULE_CATALOG, SERVER_MODULE_KEYS } from './moduleCatalog';

export const organizationRouter = Router();

// Domain APIs are mounted under the authenticated organization namespace so
// they inherit the existing /api/organization production routing while each
// router enforces its own canonical workspace permission.
organizationRouter.use('/customers', customersRouter);
organizationRouter.use('/sales', salesRouter);
organizationRouter.use('/communications/automations', communicationAutomationRouter);
organizationRouter.use('/communications', organizationCommunicationsRouter);

const text = (value: unknown, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const optionalText = (value: unknown, max = 240) => text(value, max) || null;
const validUrl = (value: unknown) => {
  const candidate = optionalText(value, 500);
  if (!candidate) return null;
  try {
    const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().replace(/\/$/, '') : null;
  } catch { return null; }
};
const validDomain = (value: unknown) => {
  const candidate = text(value, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(candidate) ? candidate : null;
};
const id = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null;

organizationRouter.get('/structure', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = growthDb();
  const [business, brands, locations, sites] = await Promise.all([
    db.from('businesses').select('id,name,legal_name,website,support_email,timezone,currency,industry').eq('id', businessId).maybeSingle(),
    db.from('business_brands').select('id,name,description,logo_url').eq('business_id', businessId).order('name'),
    db.from('locations').select('id,name,address,phone,email,timezone,hours,is_active,brand_id').eq('business_id', businessId).order('name'),
    db.from('business_sites').select('id,name,domain,site_type,provider,status,is_primary,inquiry_enabled,booking_enabled,ecommerce_enabled,brand_id,location_id,notification_email').eq('business_id', businessId).order('name'),
  ]);
  const error = business.error || brands.error || locations.error || sites.error;
  if (error || !business.data) return res.status(500).json({ error: error?.message || 'Organization was not found.' });
  res.json({ organization: business.data, brands: brands.data ?? [], locations: locations.data ?? [], sites: sites.data ?? [] });
});

/** Saves only records owned by the JWT-derived organization. No cross-tenant ids are accepted. */
organizationRouter.put('/structure', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = growthDb();
  const body = req.body ?? {};
  const organization = body.organization ?? {};
  const brands = Array.isArray(body.brands) ? body.brands : [];
  const locations = Array.isArray(body.locations) ? body.locations : [];
  const sites = Array.isArray(body.sites) ? body.sites : [];

  const organizationName = text(organization.name);
  if (!organizationName) return res.status(400).json({ error: 'Organization name is required.' });
  if (organization.website && !validUrl(organization.website)) return res.status(400).json({ error: 'Organization website must be a valid URL.' });

  const [knownBrands, knownLocations, knownSites] = await Promise.all([
    db.from('business_brands').select('id').eq('business_id', businessId),
    db.from('locations').select('id,brand_id').eq('business_id', businessId),
    db.from('business_sites').select('id').eq('business_id', businessId),
  ]);
  if (knownBrands.error || knownLocations.error || knownSites.error) return res.status(500).json({ error: 'Could not validate organization structure.' });
  const brandIds = new Set((knownBrands.data ?? []).map((row: any) => row.id));
  const locationIds = new Set((knownLocations.data ?? []).map((row: any) => row.id));
  const siteIds = new Set((knownSites.data ?? []).map((row: any) => row.id));

  for (const brand of brands) if (id(brand.id) && !brandIds.has(brand.id)) return res.status(403).json({ error: 'A brand does not belong to this organization.' });
  for (const location of locations) {
    if (id(location.id) && !locationIds.has(location.id)) return res.status(403).json({ error: 'A location does not belong to this organization.' });
    if (location.brand_id && !brandIds.has(location.brand_id)) return res.status(400).json({ error: 'Save a new brand before assigning it to a location.' });
  }
  for (const site of sites) {
    if (id(site.id) && !siteIds.has(site.id)) return res.status(403).json({ error: 'A website does not belong to this organization.' });
    if (!validDomain(site.domain)) return res.status(400).json({ error: 'Each website needs a valid domain.' });
    if (!brandIds.has(site.brand_id) || !locationIds.has(site.location_id)) return res.status(400).json({ error: 'Save the assigned brand and location before configuring its website.' });
    const location = (knownLocations.data ?? []).find((row: any) => row.id === site.location_id);
    if (location?.brand_id && location.brand_id !== site.brand_id) return res.status(400).json({ error: 'A website location must belong to its selected brand.' });
  }

  const businessUpdate = await db.from('businesses').update({
    name: organizationName, legal_name: optionalText(organization.legal_name), website: validUrl(organization.website),
    support_email: optionalText(organization.support_email), timezone: optionalText(organization.timezone, 80),
    currency: optionalText(organization.currency, 8), industry: optionalText(organization.industry, 80),
  }).eq('id', businessId);
  if (businessUpdate.error) return res.status(500).json({ error: businessUpdate.error.message });

  for (const brand of brands) {
    const payload = { business_id: businessId, name: text(brand.name), description: optionalText(brand.description, 2000), logo_url: validUrl(brand.logo_url) };
    if (!payload.name) return res.status(400).json({ error: 'Every brand needs a name.' });
    const result = id(brand.id) ? await db.from('business_brands').update(payload).eq('id', brand.id).eq('business_id', businessId) : await db.from('business_brands').insert(payload);
    if (result.error) return res.status(500).json({ error: result.error.message });
  }
  for (const location of locations) {
    const payload = { business_id: businessId, name: text(location.name), address: optionalText(location.address, 1000), phone: optionalText(location.phone, 80), email: optionalText(location.email), timezone: optionalText(location.timezone, 80), hours: location.hours && typeof location.hours === 'object' ? location.hours : null, is_active: location.is_active !== false, brand_id: location.brand_id || null };
    if (!payload.name) return res.status(400).json({ error: 'Every location needs a name.' });
    const result = id(location.id) ? await db.from('locations').update(payload).eq('id', location.id).eq('business_id', businessId) : await db.from('locations').insert(payload);
    if (result.error) return res.status(500).json({ error: result.error.message });
  }
  for (const site of sites) {
    const bookingEnabled = site.booking_enabled === true;
    const payload = { business_id: businessId, name: text(site.name) || validDomain(site.domain)!, domain: validDomain(site.domain)!, site_type: text(site.site_type, 40) || 'BRAND', provider: text(site.provider, 40) || 'CUSTOM', status: site.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE', is_primary: site.is_primary === true, inquiry_enabled: site.inquiry_enabled !== false, booking_enabled: bookingEnabled, ecommerce_enabled: site.ecommerce_enabled === true, brand_id: site.brand_id, location_id: site.location_id, notification_email: optionalText(site.notification_email) };
    const result = id(site.id) ? await db.from('business_sites').update(payload).eq('id', site.id).eq('business_id', businessId) : await db.from('business_sites').insert(payload);
    if (result.error) return res.status(500).json({ error: result.error.message });
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Workspace module preferences. These writes are authoritative, tenant-scoped,
// validated against the server module contract, dependency-aware, and audited.
// ---------------------------------------------------------------------------
organizationRouter.get('/modules', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = growthDb();
  const { data, error } = await db
    .from('organization_module_preferences')
    .select('module_id,is_enabled,updated_at,updated_by')
    .eq('business_id', businessId)
    .order('module_id');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ preferences: data ?? [], moduleKeys: SERVER_MODULE_KEYS });
});

organizationRouter.put('/modules/:moduleId', requireGrowthAccess, async (req, res) => {
  const { businessId, userId } = growthContextOf(req);
  const db = growthDb();
  const moduleId = text(req.params.moduleId, 120);
  const definition = SERVER_MODULE_CATALOG[moduleId];
  if (!definition) return res.status(404).json({ error: 'Unknown workspace module.' });
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean.' });
  if (definition.core && req.body.enabled === false) return res.status(409).json({ error: 'Core VowOS modules cannot be disabled.' });

  const { data: before, error: beforeError } = await db
    .from('organization_module_preferences')
    .select('module_id,is_enabled,updated_at,updated_by')
    .eq('business_id', businessId)
    .eq('module_id', moduleId)
    .maybeSingle();
  if (beforeError) return res.status(500).json({ error: beforeError.message });

  if (req.body.enabled) {
    for (const dependency of definition.dependencies) {
      const dependencyDefinition = SERVER_MODULE_CATALOG[dependency];
      if (!dependencyDefinition) return res.status(500).json({ error: `Module catalog dependency is invalid: ${dependency}` });
      const dependencyWrite = await db.from('organization_module_preferences').upsert({
        business_id: businessId,
        organization_id: businessId,
        module_id: dependency,
        is_enabled: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,module_id' });
      if (dependencyWrite.error) return res.status(500).json({ error: dependencyWrite.error.message });
    }
  }

  const { data, error } = await db
    .from('organization_module_preferences')
    .upsert({
      business_id: businessId,
      organization_id: businessId,
      module_id: moduleId,
      is_enabled: req.body.enabled,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,module_id' })
    .select('module_id,is_enabled,updated_at,updated_by')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const { error: auditError } = await db.from('audit_logs').insert({
    entity_type: 'workspace_module',
    entity_id: moduleId,
    action: 'WORKSPACE_MODULE_SETTING_CHANGED',
    user_id: userId,
    before_value: before ?? null,
    after_value: data,
    reason: req.body.enabled ? 'Workspace module enabled by organization administrator.' : 'Workspace module disabled by organization administrator.',
  });
  if (auditError) console.warn('[organization/modules] audit log failed:', auditError.message);

  const { data: preferences, error: listError } = await db
    .from('organization_module_preferences')
    .select('module_id,is_enabled,updated_at,updated_by')
    .eq('business_id', businessId)
    .order('module_id');
  if (listError) return res.status(500).json({ error: listError.message });

  return res.json({ preference: data, preferences: preferences ?? [] });
});
