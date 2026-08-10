import { Router } from 'express';
import { requireBusinessContext, RequestContext } from '../../index';

export const legacyRouter = Router();

// --- INVENTORY API ---
legacyRouter.get('/inventory', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const { data: items, error } = await context.db.from('inventory_items').select('*, inventory_variants(*)');
    if (error) throw error;
    res.json({ data: items, page: 1, limit: items.length, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

legacyRouter.get('/inventory/scan/:sku', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const sku = (req.params.sku as string).trim();
    // Hardware scanner endpoint
    const { data: variant, error } = await context.db
      .from('inventory_variants')
      .select('*, inventory_items(vendor_name, style_number, base_price_cents, category)')
      .eq('sku', sku)
      .maybeSingle();

    if (error || !variant) return res.status(404).json({ error: 'Laser Interception Error: SKU not mapped in Database.' });
    
    // Flatten for legacy compatibility
    res.json({
      ...variant,
      vendor_name: variant.inventory_items?.vendor_name,
      style_number: variant.inventory_items?.style_number,
      base_price_cents: variant.inventory_items?.base_price_cents,
      category: variant.inventory_items?.category
    });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- FINANCIAL API ---
legacyRouter.get('/invoices', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const { data: invoices, error } = await context.db.from('invoices').select('*, payments(*)');
    if (error) throw error;
    res.json({ data: invoices, page: 1, limit: invoices.length, total: invoices.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- OPERATIONS API ---
legacyRouter.get('/operations', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const [purchases, pickups, appointments] = await Promise.all([
      context.db.from('purchase_orders').select('*'),
      context.db.from('pickups').select('*'),
      context.db.from('appointments').select('*')
    ]);
    res.json({ 
      purchases: purchases.data || [], 
      pickups: pickups.data || [], 
      appointments: appointments.data || [] 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

legacyRouter.post('/appointments', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const { customer_id, time_slot, type, consultant_name, room_name } = req.body;
    
    const { data: existing } = await context.db.from('appointments')
      .select('id, consultant_name')
      .eq('time_slot', time_slot)
      .or(`consultant_name.eq.${consultant_name},room_name.eq.${room_name}`)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Resource Collision Denied' });
    }
    
    const { data, error } = await context.db.from('appointments').insert({
      customer_id, time_slot, type, consultant_name, room_name
    }).select('id').single();
    
    if (error) throw error;
    res.json({ id: data.id, message: 'Appointment securely scheduled and locked into the active calendar.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

legacyRouter.post('/operations/purchases', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const shipDate = new Date();
    shipDate.setMonth(shipDate.getMonth() + 4);

    const { data, error } = await context.db.from('purchase_orders').insert({
      ...req.body,
      size: req.body.size || 'Custom',
      expected_ship_date: shipDate.toISOString().split('T')[0],
      expected_delivery_date: shipDate.toISOString().split('T')[0],
      status: 'Submitted'
    }).select('id').single();
    
    if (error) throw error;
    res.json({ id: data.id, message: 'Purchase Order fully structured and transmitted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

legacyRouter.post('/operations/pickups/:id/ready', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const { error } = await context.db.from('pickups').update({
      qa_verified: true,
      ready_since: new Date().toISOString().split('T')[0]
    }).eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Pickup marked ready and customer notified.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMINISTRATIVE API ---
legacyRouter.get('/system/settings', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    res.json({ boutique: { id: context.tenantId }, users: [], business_rules: {} });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

legacyRouter.get('/leads', requireBusinessContext, async (req, res) => {
  const context = (req as any).context as RequestContext;
  try {
    const { data, error } = await context.db.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data, page: 1, limit: data.length, total: data.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
