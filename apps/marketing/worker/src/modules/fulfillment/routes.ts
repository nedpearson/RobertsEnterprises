import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { growthDb } from '../growth/client';
import { canTransitionJourney, customerUpdateFor, inferCatalogMapping, mapCatalogRow, type CatalogField } from './catalog';

export const fulfillmentRouter = Router();
const db = () => growthDb();
const asString = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const asRows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object')).slice(0, 10_000) : [];

async function vendorFor(businessId: string, vendorId: string) {
  const { data, error } = await db().from('vendors').select('id,name').eq('business_id', businessId).eq('id', vendorId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Vendor was not found in this organization.');
  return data as { id: string; name: string };
}

function mappingFrom(body: Record<string, unknown>, rows: Record<string, unknown>[]): Record<string, CatalogField> {
  const supplied = body.mapping;
  if (supplied && typeof supplied === 'object' && !Array.isArray(supplied)) {
    const valid = new Set<CatalogField>(['style_number','name','description','category','brand','collection','color','size','vendor_sku','upc','cost_cents','msrp_cents','store_retail_cents','image_url','fabric','silhouette','neckline','length','train','size_range','lead_time_weeks']);
    return Object.fromEntries(Object.entries(supplied).filter(([header, field]) => typeof header === 'string' && typeof field === 'string' && valid.has(field as CatalogField))) as Record<string, CatalogField>;
  }
  return inferCatalogMapping(Object.keys(rows[0] ?? {}));
}

fulfillmentRouter.post('/catalog-imports/preview', requireGrowthAccess, async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const vendorId = asString(req.body?.vendorId);
    const rows = asRows(req.body?.rows);
    if (!vendorId || !rows.length) return res.status(400).json({ error: 'Choose a vendor and provide at least one catalog row.' });
    await vendorFor(businessId, vendorId);
    const mapping = mappingFrom(req.body ?? {}, rows);
    const preview = rows.slice(0, 100).map((row, index) => ({ rowNumber: index + 1, mapped: mapCatalogRow(row, mapping) }));
    const errors = preview.filter((row) => row.mapped.errors.length).length;
    const warnings = preview.filter((row) => row.mapped.warnings.length).length;
    return res.json({ mapping, totalRows: rows.length, preview, errors, warnings });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
});

fulfillmentRouter.post('/catalog-imports/commit', requireGrowthAccess, async (req, res) => {
  const { businessId, userId } = growthContextOf(req);
  const vendorId = asString(req.body?.vendorId);
  const fileName = asString(req.body?.fileName) ?? 'catalog-import.csv';
  const rows = asRows(req.body?.rows);
  if (!vendorId || !rows.length) return res.status(400).json({ error: 'Choose a vendor and provide catalog rows.' });
  try {
    await vendorFor(businessId, vendorId);
    const mapping = mappingFrom(req.body ?? {}, rows);
    const mappedRows = rows.map((row) => mapCatalogRow(row, mapping));
    const { data: batch, error: batchError } = await db().from('catalog_import_batches').insert({
      business_id: businessId, vendor_id: vendorId, file_name: fileName, column_mapping: mapping,
      status: 'importing', total_rows: rows.length, warning_rows: mappedRows.filter((row) => row.warnings.length).length,
      error_rows: mappedRows.filter((row) => row.errors.length).length, created_by: userId,
    }).select('id').single();
    if (batchError || !batch) throw new Error(batchError?.message ?? 'Could not start catalog import.');

    let imported = 0;
    const staging: Record<string, unknown>[] = [];
    const brandIds = new Map<string, string>();
    const collectionIds = new Map<string, string>();
    for (let index = 0; index < mappedRows.length; index += 1) {
      const mapped = mappedRows[index];
      const validationStatus = mapped.errors.length ? 'error' : mapped.warnings.length ? 'warning' : 'valid';
      let productId: string | null = null;
      let variantId: string | null = null;
      if (!mapped.errors.length) {
        let brandId: string | null = null;
        if (typeof mapped.brand === 'string') {
          const key = mapped.brand.toLowerCase();
          brandId = brandIds.get(key) ?? null;
          if (!brandId) {
            const found = await db().from('brands').select('id').eq('business_id', businessId).eq('vendor_id', vendorId).ilike('name', mapped.brand).maybeSingle();
            brandId = found.data?.id ?? (await db().from('brands').insert({ business_id: businessId, vendor_id: vendorId, name: mapped.brand }).select('id').single()).data?.id ?? null;
            if (brandId) brandIds.set(key, brandId);
          }
        }
        let collectionId: string | null = null;
        if (brandId && typeof mapped.collection === 'string') {
          const key = `${brandId}:${mapped.collection.toLowerCase()}`;
          collectionId = collectionIds.get(key) ?? null;
          if (!collectionId) {
            const found = await db().from('collections').select('id').eq('business_id', businessId).eq('brand_id', brandId).ilike('name', mapped.collection).maybeSingle();
            collectionId = found.data?.id ?? (await db().from('collections').insert({ business_id: businessId, brand_id: brandId, name: mapped.collection }).select('id').single()).data?.id ?? null;
            if (collectionId) collectionIds.set(key, collectionId);
          }
        }
        const style = String(mapped.style_number);
        const existing = await db().from('products').select('id').eq('business_id', businessId).eq('vendor_id', vendorId).eq('style_number', style).limit(1).maybeSingle();
        const productPayload = {
          business_id: businessId, vendor_id: vendorId, brand_id: brandId, collection_id: collectionId, style_number: style,
          name: typeof mapped.name === 'string' ? mapped.name : `Style ${style}`,
          description: typeof mapped.description === 'string' ? mapped.description : null,
          category: typeof mapped.category === 'string' ? mapped.category : 'Bridal Gown',
          primary_image: typeof mapped.image_url === 'string' ? mapped.image_url : null,
          attributes: Object.fromEntries(['fabric','silhouette','neckline','length','train','size_range','lead_time_weeks'].filter((key) => mapped[key as CatalogField] !== null).map((key) => [key, mapped[key as CatalogField]])),
        };
        const productResult = existing.data?.id
          ? await db().from('products').update(productPayload).eq('id', existing.data.id).select('id').single()
          : await db().from('products').insert(productPayload).select('id').single();
        if (productResult.error || !productResult.data) throw new Error(productResult.error?.message ?? `Could not save style ${style}.`);
        productId = productResult.data.id;
        if (mapped.color || mapped.size || mapped.vendor_sku || mapped.upc) {
          let existingVariant = db().from('product_variants').select('id').eq('business_id', businessId).eq('product_id', productId).limit(1);
          if (mapped.vendor_sku) existingVariant = existingVariant.eq('vendor_sku', String(mapped.vendor_sku));
          else { existingVariant = existingVariant.eq('color', String(mapped.color ?? '')).eq('size', String(mapped.size ?? '')); }
          const variant = await existingVariant.maybeSingle();
          const variantPayload = { business_id: businessId, product_id: productId, vendor_sku: mapped.vendor_sku, upc: mapped.upc, color: mapped.color, size: mapped.size, cost_cents: mapped.cost_cents, msrp_cents: mapped.msrp_cents, store_retail_cents: mapped.store_retail_cents, active: true };
          const variantResult = variant.data?.id ? await db().from('product_variants').update(variantPayload).eq('id', variant.data.id).select('id').single() : await db().from('product_variants').insert(variantPayload).select('id').single();
          if (variantResult.error || !variantResult.data) throw new Error(variantResult.error?.message ?? `Could not save variant for ${style}.`);
          variantId = variantResult.data.id;
        }
        imported += 1;
      }
      staging.push({ batch_id: batch.id, business_id: businessId, row_number: index + 1, raw_data: rows[index], mapped_data: mapped, validation_status: productId ? 'imported' : validationStatus, validation_errors: [...mapped.errors, ...mapped.warnings], product_id: productId, variant_id: variantId });
    }
    const { error: rowsError } = await db().from('catalog_import_rows').insert(staging);
    if (rowsError) throw new Error(rowsError.message);
    await db().from('catalog_import_batches').update({ status: 'completed', imported_rows: imported, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', batch.id);
    return res.status(201).json({ batchId: batch.id, imported, warnings: mappedRows.filter((row) => row.warnings.length).length, errors: mappedRows.filter((row) => row.errors.length).length });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
});

async function recordJourneyEvent(businessId: string, journeyId: string, userId: string, status: string, detail?: string) {
  const copy = customerUpdateFor(status);
  const { data: event, error } = await db().from('customer_journey_events').insert({ business_id: businessId, journey_id: journeyId, event_type: status, title: copy.title, detail: detail ?? copy.detail, customer_visible: true, actor_user_id: userId }).select('id').single();
  if (error || !event) throw new Error(error?.message ?? 'Could not record customer journey event.');
  const journey = await db().from('customer_order_journeys').select('customer_id, customers(email,name)').eq('id', journeyId).eq('business_id', businessId).single();
  const customer = (journey.data as any)?.customers;
  if (customer?.email) await db().from('customer_journey_notification_outbox').insert({ business_id: businessId, journey_id: journeyId, journey_event_id: event.id, recipient: customer.email, payload: { subject: copy.title, body: `Hi ${customer.name || ''},\n\n${detail ?? copy.detail}\n\nYour VowOS boutique team` } }).select().maybeSingle();
}

fulfillmentRouter.post('/journeys', requireGrowthAccess, async (req, res) => {
  const { businessId, userId } = growthContextOf(req);
  const appointmentId = asString(req.body?.appointmentId);
  if (!appointmentId) return res.status(400).json({ error: 'An appointment is required to start the customer journey.' });
  try {
    const appointment = await db().from('appointments').select('id,customer_id,location_id,date').eq('business_id', businessId).eq('id', appointmentId).maybeSingle();
    if (!appointment.data?.customer_id) return res.status(400).json({ error: 'Appointment was not found or is not linked to a customer.' });
    const { data: journey, error } = await db().from('customer_order_journeys').insert({ business_id: businessId, location_id: appointment.data.location_id, customer_id: appointment.data.customer_id, appointment_id: appointmentId, product_variant_id: asString(req.body?.productVariantId), purchase_order_id: asString(req.body?.purchaseOrderId), vendor_id: asString(req.body?.vendorId), wedding_date: asString(req.body?.weddingDate), created_by: userId }).select('id,status').single();
    if (error || !journey) throw new Error(error?.message ?? 'Could not start customer journey.');
    await recordJourneyEvent(businessId, journey.id, userId, journey.status);
    return res.status(201).json({ journey });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
});

fulfillmentRouter.post('/journeys/:journeyId/advance', requireGrowthAccess, async (req, res) => {
  const { businessId, userId } = growthContextOf(req);
  const nextStatus = asString(req.body?.status);
  if (!nextStatus) return res.status(400).json({ error: 'A journey status is required.' });
  try {
    const { data: journey, error } = await db().from('customer_order_journeys').select('id,status').eq('id', req.params.journeyId).eq('business_id', businessId).maybeSingle();
    if (error || !journey) return res.status(404).json({ error: 'Customer journey not found.' });
    if (!canTransitionJourney(journey.status, nextStatus)) return res.status(409).json({ error: `Cannot move a journey from ${journey.status} to ${nextStatus}.` });
    const { error: updateError } = await db().from('customer_order_journeys').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', journey.id);
    if (updateError) throw new Error(updateError.message);
    await recordJourneyEvent(businessId, journey.id, userId, nextStatus, asString(req.body?.detail) ?? undefined);
    return res.json({ ok: true, status: nextStatus });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
});

fulfillmentRouter.post('/journeys/:journeyId/vendor-confirmations', requireGrowthAccess, async (req, res) => {
  const { businessId, userId } = growthContextOf(req);
  const confirmationNumber = asString(req.body?.confirmationNumber);
  if (!confirmationNumber) return res.status(400).json({ error: 'Vendor confirmation number is required.' });
  try {
    const { data: journey, error } = await db().from('customer_order_journeys').select('id,status,vendor_id').eq('id', req.params.journeyId).eq('business_id', businessId).maybeSingle();
    if (error || !journey?.vendor_id) return res.status(400).json({ error: 'Journey must have a vendor before a confirmation can be recorded.' });
    if (!canTransitionJourney(journey.status, 'vendor_confirmed')) return res.status(409).json({ error: 'This journey is not awaiting a vendor confirmation.' });
    const existingConfirmation = await db().from('vendor_order_confirmations').select('journey_id')
      .eq('business_id', businessId).eq('vendor_id', journey.vendor_id).eq('confirmation_number', confirmationNumber).maybeSingle();
    if (existingConfirmation.data && existingConfirmation.data.journey_id !== journey.id) {
      return res.status(409).json({ error: 'This vendor confirmation is already attached to another customer journey.' });
    }
    const { error: confirmationError } = await db().from('vendor_order_confirmations').upsert({ business_id: businessId, journey_id: journey.id, vendor_id: journey.vendor_id, confirmation_number: confirmationNumber, vendor_status: asString(req.body?.vendorStatus), expected_ship_at: asString(req.body?.expectedShipAt), expected_delivery_at: asString(req.body?.expectedDeliveryAt), raw_confirmation: req.body?.rawConfirmation && typeof req.body.rawConfirmation === 'object' ? req.body.rawConfirmation : {} }, { onConflict: 'business_id,vendor_id,confirmation_number' });
    if (confirmationError) throw new Error(confirmationError.message);
    await db().from('customer_order_journeys').update({ status: 'vendor_confirmed', promised_at: asString(req.body?.expectedDeliveryAt), updated_at: new Date().toISOString() }).eq('id', journey.id);
    await recordJourneyEvent(businessId, journey.id, userId, 'vendor_confirmed', `Your designer confirmed order ${confirmationNumber}.`);
    return res.json({ ok: true, status: 'vendor_confirmed' });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
});

export async function deliverCustomerJourneyNotifications(): Promise<void> {
  const { data, error } = await db().from('customer_journey_notification_outbox').select('id,attempts,recipient,payload,channel').eq('status', 'pending').lte('next_attempt_at', new Date().toISOString()).limit(25);
  if (error) return console.error('[fulfillment] notification queue read failed:', error.message);
  for (const item of data ?? []) {
    const attempts = Number(item.attempts) + 1;
    try {
      const { error: deliveryError } = await db().functions.invoke('send-message', { body: { channel: item.channel, to: item.recipient, subject: (item.payload as any)?.subject, body: (item.payload as any)?.body } });
      if (deliveryError) throw deliveryError;
      await db().from('customer_journey_notification_outbox').update({ status: 'delivered', attempts, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', item.id);
    } catch (error) {
      const failed = attempts >= 8;
      await db().from('customer_journey_notification_outbox').update({ status: failed ? 'failed' : 'pending', attempts, next_attempt_at: new Date(Date.now() + Math.min(360, 5 * 2 ** Math.min(attempts - 1, 6)) * 60_000).toISOString(), last_error: error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed', updated_at: new Date().toISOString() }).eq('id', item.id);
    }
  }
}

export function startCustomerJourneyNotificationScheduler(): void {
  const interval = setInterval(() => void deliverCustomerJourneyNotifications(), 60_000);
  interval.unref?.();
}
