require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_vowos_key');
const twilio = require('twilio');
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
      : null;
const { EventEmitter } = require('events');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('./knexfile')[environment];
const knex = require('knex')(knexConfig);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (environment === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required in production');
}
const PORT = process.env.PORT || 4000;

// --- BACKGROUND JOB QUEUE (Events) ---
const automationQueue = new EventEmitter();
automationQueue.on('pickup_ready', async (pickupId) => {
  try {
    const pickup = await knex('pickups')
      .join('customers', 'pickups.customer_id', '=', 'customers.id')
      .where('pickups.id', pickupId)
      .select('pickups.item_description', 'customers.first_name', 'customers.phone')
      .first();
      
    if (pickup) { // Emulating Twilio Execution safely
      setTimeout(() => {
        console.log(`\n=================================`);
        console.log(`🔔 [Twilio SMS Dispatcher] >> Sending to ${pickup.phone || 'Default File SMS'}`);
        console.log(`MSG: "Hi ${pickup.first_name}! Great news, your ${pickup.item_description} has safely arrived at BridalLive Boutique and is QA verified! Please call us to schedule your pickup/fitting."`);
        console.log(`=================================\n`);
      }, 2000); // Simulate network latency
    }
  } catch(e) { console.error('Background Job failed:', e); }
});

const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:5173,https://robertsenterprises.bridgebox.ai').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));
app.use(express.json());

// Add artificial latency to simulate production DB queries (optional but good for UX testing)
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'VowOS Backend is running' });
});

// --- MVP SEED DATA ENDPOINT ---
app.post('/api/seed', async (req, res) => {
  try {
    // Check if boutique exists
    let boutique = await knex('boutiques').first();
    if (!boutique) {
      const [inserted] = await knex('boutiques').insert({ name: 'BridalLive Boutique Default' }).returning('id');
      const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
      boutique = { id };
    }
    
    // Check if users exist (Update to include Auth Roles)
    let user = await knex('users').where({ role: 'owner' }).first();
    if (!user) {
      // Create Owner
      await knex('users').insert({
        boutique_id: boutique.id,
        first_name: 'Owner',
        last_name: 'Admin',
        email: 'admin@vowos.test',
        role: 'owner',
        password_hash: 'password123' // MVP mock
      });
      // Create Consultant
      await knex('users').insert({
        boutique_id: boutique.id,
        first_name: 'Jessica',
        last_name: 'Stylist',
        email: 'jessica@vowos.test',
        role: 'consultant',
        password_hash: 'password123'
      });
    }

    res.json({ message: 'Database Seeded Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- DEMO MODE ENDPOINT ---
app.post('/api/demo-login', async (req, res) => {
  try {
    const { seedDemoData } = require('./utils/demoSeeder');
    const demoOwner = await seedDemoData(knex);
    
    if (!demoOwner) {
      throw new Error('Failed to create demo owner');
    }

    const token = jwt.sign(
      { id: demoOwner.id, name: demoOwner.first_name, role: demoOwner.role, boutique_id: demoOwner.boutique_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: demoOwner.id, name: demoOwner.first_name, role: demoOwner.role } });
  } catch (error) {
    console.error('Demo Login Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- AUTHENTICATION API ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await knex('users').where({ email }).first();
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials. Password or Email is incorrect.' });
    }
    
    const token = jwt.sign(
      { id: user.id, name: user.first_name, role: user.role, boutique_id: user.boutique_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.first_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVENTORY API ---
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await knex('inventory_items').select('*');
    for (let item of items) {
      item.variants = await knex('inventory_variants').where({ item_id: item.id });
    }
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/seed', async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    const existing = await knex('inventory_items').first();
    if (!existing) {
      const [id1] = await knex('inventory_items').insert({ boutique_id: boutique.id, vendor_name: 'Maggie Sottero', style_number: 'MS-891', category: 'Bridal Gown', base_price_cents: 180000 });
      await knex('inventory_variants').insert([
        { item_id: id1, size: '8', color: 'Ivory', sku: 'MS-891-8-IVY', stock_quantity: 1 },
        { item_id: id1, size: '12', color: 'Ivory', sku: 'MS-891-12-IVY', stock_quantity: 1 }
      ]);
      const [id2] = await knex('inventory_items').insert({ boutique_id: boutique.id, vendor_name: 'Vera Wang', style_number: 'VW-LUNA', category: 'Bridal Gown', base_price_cents: 450000 });
      await knex('inventory_variants').insert([
        { item_id: id2, size: '10', color: 'Diamond White', sku: 'VW-LUNA-10-DW', stock_quantity: 2 }
      ]);
    }
    res.json({ message: 'Inventory Seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- HARDWARE BARCODE ENGINE ---
app.get('/api/inventory/scan/:sku', async (req, res) => {
  try {
    const sku = req.params.sku.trim();
    const variant = await knex('inventory_variants')
      .join('inventory_items', 'inventory_variants.item_id', '=', 'inventory_items.id')
      .select('inventory_variants.*', 'inventory_items.vendor_name', 'inventory_items.style_number', 'inventory_items.base_price_cents', 'inventory_items.category')
      .where('inventory_variants.sku', sku)
      .first();

    if (!variant) return res.status(404).json({ error: 'Laser Interception Error: SKU not mapped in Database.' });
    
    res.json(variant);
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FINANCIAL API ---
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await knex('invoices')
      .join('customers', 'invoices.customer_id', '=', 'customers.id')
      .select('invoices.*', 'customers.first_name', 'customers.last_name');
    
    for (let inv of invoices) {
      inv.payments = await knex('payments').where({ invoice_id: inv.id });
    }
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices/:id/checkout', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await knex('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.balance_due_cents <= 0) return res.status(400).json({ error: 'Invoice fully paid' });

    // Generate Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `VowOS Invoice #${id} - BridalLive Boutique` },
          unit_amount: invoice.balance_due_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      client_reference_id: id.toString(),
      success_url: `http://localhost:5173/?payment=success&invoice=${id}`,
      cancel_url: `http://localhost:5173/?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/webhooks/stripe', async (req, res) => {
  try {
    const event = req.body; // In production use strict Stripe signature validation
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoice_id = parseInt(session.client_reference_id);
      const amount_cents = session.amount_total;
      
      await knex('payments').insert({
        invoice_id, amount_cents, method: 'stripe', reference_number: session.payment_intent || 'pi_mock_123'
      });

      const payments = await knex('payments').where({ invoice_id });
      const total_paid = payments.reduce((sum, p) => sum + p.amount_cents, 0);
      
      const invoice = await knex('invoices').where({ id: invoice_id }).first();
      const balance_due = invoice.total_amount_cents - total_paid;
      const status = balance_due <= 0 ? 'paid' : (total_paid > 0 ? 'partial' : 'unpaid');

      await knex('invoices').where({ id: invoice_id }).update({
        total_paid_cents: total_paid,
        balance_due_cents: balance_due < 0 ? 0 : balance_due,
        status
      });
      console.log(`[Stripe Webhook] Invoice ${invoice_id} successfully credited for ${(amount_cents/100)} USD.`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { invoice_id, amount_cents, method, reference_number } = req.body;
    
    await knex('payments').insert({ invoice_id, amount_cents, method, reference_number });
    
    const payments = await knex('payments').where({ invoice_id });
    const total_paid = payments.reduce((sum, p) => sum + p.amount_cents, 0);
    
    const invoice = await knex('invoices').where({ id: invoice_id }).first();
    const balance_due = invoice.total_amount_cents - total_paid;
    const status = balance_due <= 0 ? 'paid' : (total_paid > 0 ? 'partial' : 'unpaid');

    await knex('invoices').where({ id: invoice_id }).update({
      total_paid_cents: total_paid,
      balance_due_cents: balance_due < 0 ? 0 : balance_due,
      status
    });

    res.json({ message: 'Payment successfully processed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices/seed', async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    const customer = await knex('customers').first();
    
    if (customer) {
      const existing = await knex('invoices').first();
      if (!existing) {
        await knex('invoices').insert({ 
          boutique_id: boutique.id, 
          customer_id: customer.id, 
          total_amount_cents: 450000, 
          total_paid_cents: 0, 
          balance_due_cents: 450000,
          status: 'unpaid'
        });
      }
    }
    res.json({ message: 'Financials Seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- OPERATIONS API ---
app.get('/api/operations', async (req, res) => {
  try {
    const purchases = await knex('purchase_orders')
      .join('customers', 'purchase_orders.customer_id', '=', 'customers.id')
      .select('purchase_orders.*', 'customers.first_name', 'customers.last_name');
    
    const pickups = await knex('pickups')
      .join('customers', 'pickups.customer_id', '=', 'customers.id')
      .select('pickups.*', 'customers.first_name', 'customers.last_name');

    const appointments = await knex('appointments')
      .join('customers', 'appointments.customer_id', '=', 'customers.id')
      .select('appointments.*', 'customers.first_name', 'customers.last_name');

    res.json({ purchases, pickups, appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { customer_id, time_slot, type, consultant_name, room_name } = req.body;
    let boutique_id = 1; // MVP Auth Scoping Context

    // Strict Collision Evaluation
    const existing = await knex('appointments')
      .where({ boutique_id, time_slot })
      .andWhere(function() {
        this.where({ consultant_name }).orWhere({ room_name });
      }).first();

    if (existing) {
      const conflictMsg = existing.consultant_name === consultant_name 
        ? `Double Booking Denied: ${consultant_name} is already booked at ${time_slot}.`
        : `Resource Collision Denied: ${room_name} is already occupied at ${time_slot}.`;
      return res.status(409).json({ error: conflictMsg });
    }

    const boutique = await knex('boutiques').first();
    boutique_id = boutique ? boutique.id : 1;
    const rows = await knex('appointments').insert({
      boutique_id, customer_id, time_slot, type, consultant_name, room_name
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);

    res.json({ id, message: 'Appointment securely scheduled and locked into the active calendar.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/operations/purchases', async (req, res) => {
  try {
    const { 
      customer_id, vendor_name, style_number, size, 
      size_category, split_bust, split_waist, split_hips, 
      hollow_to_hem, custom_notes 
    } = req.body;
    
    // In strict production, this is extracted from the JWT token
    const boutique_id = 1; 
    const boutique = await knex('boutiques').first();

    // Auto-calculate expected ship date (+4 months standard lead time)
    const shipDate = new Date();
    shipDate.setMonth(shipDate.getMonth() + 4);

    const rows = await knex('purchase_orders').insert({
      boutique_id: boutique.id,
      customer_id,
      vendor_name,
      style_number,
      size: size || 'Custom',
      size_category: size_category || 'Standard',
      split_bust: split_bust || null,
      split_waist: split_waist || null,
      split_hips: split_hips || null,
      hollow_to_hem: hollow_to_hem || null,
      custom_notes: custom_notes || null,
      expected_ship_date: shipDate.toISOString().split('T')[0],
      status: 'Submitted'
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);
    
    res.json({ id, message: 'Purchase Order fully structured and transmitted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/operations/pickups/:id/ready', async (req, res) => {
  try {
    const { id } = req.params;
    await knex('pickups').where({ id }).update({
      qa_verified: true,
      ready_since: new Date().toISOString().split('T')[0]
    });
    
    // Dispatch to background queue asynchronously
    automationQueue.emit('pickup_ready', id);
    
    res.json({ message: 'Pickup marked ready and customer notified.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/operations/seed', async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    const customer = await knex('customers').first();
    
    if (customer) {
      const existing = await knex('purchase_orders').first();
      if (!existing) {
        await knex('purchase_orders').insert({
          boutique_id: boutique.id, customer_id: customer.id, vendor_name: 'Vera Wang', style_number: 'VW-Luna', size: '10', expected_ship_date: '2026-03-10', status: 'Late'
        });
        await knex('pickups').insert({
          boutique_id: boutique.id, customer_id: customer.id, item_description: 'Maggie Sottero (Altered)', qa_verified: true, ready_since: '2026-03-18'
        });
        await knex('appointments').insert({
          boutique_id: boutique.id, customer_id: customer.id, time_slot: '10:00 AM', type: 'First View', consultant_name: 'Jessica M.', room_name: 'Suite A'
        });
      }
    }
    res.json({ message: 'Operations Seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMINISTRATIVE API ---
let globalBusinessRules = {
  taxRate: 8.25,
  depositPercent: 50,
  returnDays: 14,
  apptDurationFitting: 90,
  apptDurationAlt: 60,
  lowStockThreshold: 3,
  smsAlerts: true,
  emailReceipts: true
};

app.get('/api/system/settings', async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    const users = await knex('users').select('id', 'first_name', 'last_name', 'email', 'role', 'created_at', knex.raw("(first_name || ' ' || last_name) as name")).orderBy('created_at', 'desc');
    res.json({ boutique, users, business_rules: globalBusinessRules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/settings/rules', async (req, res) => {
  try {
    globalBusinessRules = { ...globalBusinessRules, ...req.body };
    res.json({ message: 'Rules Synced', rules: globalBusinessRules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/users', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const boutique = await knex('boutiques').first();

    const _parts = (name || '').trim().split(/\s+/);
    const first_name = _parts.shift() || '';
    const last_name = _parts.join(' ');
    // NOTE: login compares plaintext; store consistently so created users can sign in.
    const rows = await knex('users').insert({
      boutique_id: boutique.id,
      first_name,
      last_name,
      email,
      password_hash: password,
      role
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);

    res.status(201).json({ id, message: 'Employee successfully provisioned within VowOS architecture.' });
  } catch(err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Identical Email already maps to an active Employee.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- LEADS API ---
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await knex('leads').select('*').orderBy('created_at', 'desc');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;
    const boutique = await knex('boutiques').first(); // Default to first tenant
    
    if (!boutique) {
        return res.status(400).json({ error: 'No boutique configured yet. Call /api/seed.' });
    }

    // Check if email already exists in customers
    const existingCust = await knex('customers').where({ email }).first();
    if (existingCust) {
        return res.status(409).json({ error: 'Email already exists as a booked Customer.'});
    }

    const rows = await knex('leads').insert({
      boutique_id: boutique.id,
      first_name,
      last_name,
      email,
      status: 'new'
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);

    res.status(201).json({ id, message: 'Lead captured successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS API ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await knex('customers').select('*').orderBy('created_at', 'desc');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
    try {
      const { first_name, last_name, email, phone } = req.body;
      const boutique = await knex('boutiques').first();
      
      const rows = await knex('customers').insert({
        boutique_id: boutique?.id,
        first_name,
        last_name,
        email,
        phone
      }).returning('id');
      const id = rows[0] && (rows[0].id ?? rows[0]);
  
      res.status(201).json({ id, message: 'Customer created successfully' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
         return res.status(409).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  });

// --- TWILIO COMMUNICATIONS API ---
app.post('/api/communications/sms', async (req, res) => {
  try {
     const { phone, message } = req.body;
     if (!phone || !message) return res.status(400).json({error: 'Phone and message required.'});
     
     if (twilioClient) {
        const msg = await twilioClient.messages.create({
           body: message,
           from: process.env.TWILIO_PHONE_NUMBER,
           to: phone
        });
        return res.json({ success: true, sid: msg.sid });
     } else {
        // Mock fallback bridging until Production env vars are set
        console.log(`\n=================================`);
        console.log(`📱 [TWILIO SMS MOCK] TO: ${phone}`);
        console.log(`TEXT: ${message}`);
        console.log(`=================================\n`);
        return res.json({ success: true, mock: true });
     }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- STRIPE CHECKOUT INTEGRATION ---
app.post('/api/invoices/:id/checkout', async (req, res) => {
  try {
    const invoice = await knex('invoices').where({ id: req.params.id }).first();
    if (!invoice) return res.status(404).json({error: 'Invoice not found'});
    
    // Create actual physical Stripe Checkrun Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `VowOS Outstanding Invoice #${invoice.id}` },
          unit_amount: invoice.balance_due_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:5173/dashboard?payment=success`,
      cancel_url: `http://localhost:5173/dashboard?payment=cancelled`,
    });
    
    res.json({ url: session.url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- PREDICTIVE AI ANALYTICS ---
app.get('/api/analytics/insights', async (req, res) => {
  try {
    const rawInvoices = await knex('invoices').select('*');
    const rawAppointments = await knex('appointments').select('*');
    const rawInventory = await knex('inventory_items').select('*');
    
    // 1. Stylist Conversion Volume
    const stylistCounts = rawAppointments.reduce((acc, curr) => {
      acc[curr.consultant_name] = (acc[curr.consultant_name] || 0) + 1;
      return acc;
    }, {});
    const topStylist = Object.keys(stylistCounts).length > 0 ? Object.keys(stylistCounts).reduce((a, b) => stylistCounts[a] > stylistCounts[b] ? a : b, 'None') : 'None';
    
    // 2. Financial Velocity
    const openInvoices = rawInvoices.filter(i => i.balance_due_cents > 0);
    const totalAgedReceivables = openInvoices.reduce((sum, i) => sum + i.balance_due_cents, 0);

    // 3. Fast-Moving Inventory (Supply Chain prediction)
    const lowStock = rawInventory.filter(item => item.stock_quantity <= 2);

    const insights = [
      {
        id: 'AI-101',
        type: 'growth',
        title: 'Stylist Capacity Recommendation',
        message: `${topStylist} is dominating volume with ${stylistCounts[topStylist] || 0} physical appointments structured. Recommend expanding their suite availability to maximize conversion win-rate.`
      },
      {
         id: 'AI-102',
         type: 'financial',
         title: 'Cashflow Recapture Identification',
         message: `VowOS dynamically identifies $${(totalAgedReceivables/100).toLocaleString()} in aged physical receivables across ${openInvoices.length} outstanding accounts matching the active Database state. Recommend triggering automated Stripe Checkouts immediately.`
      }
    ];

    if (lowStock.length > 0) {
      insights.push({
         id: 'AI-103',
         type: 'inventory',
         title: 'Supply Chain Depletion Warning',
         message: `Predictive AI Engine dynamically flags ${lowStock.length} core physical SKUs dropping below the critical 2-unit margin in SQLite. We strongly advise triggering a Purchase Order execution.`
      });
    }

    res.json({ insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- REPORTING SYSTEM AGGREGATIONS ---
app.get('/api/reports/financials', async (req, res) => {
  try {
    const invoices = await knex('invoices')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .select('invoices.*', 'customers.first_name', 'customers.last_name', 'customers.email', 'customers.phone');
    const payments = await knex('payments')
      .join('invoices', 'payments.invoice_id', 'invoices.id')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .select('payments.*', 'invoices.status as invoice_status', 'customers.first_name', 'customers.last_name');
    res.json({ invoices, payments });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/sales', async (req, res) => {
  try {
    const appointments = await knex('appointments')
      .join('customers', 'appointments.customer_id', 'customers.id')
      .select('appointments.*', 'customers.first_name', 'customers.last_name');
    const leads = await knex('leads').select('*');
    res.json({ appointments, leads });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/inventory', async (req, res) => {
  try {
    const items = await knex('inventory_items').select('*');
    const variants = await knex('inventory_variants').select('*');
    const purchase_orders = await knex('purchase_orders').select('*');
    res.json({ items, variants, purchase_orders });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PHASE 2 — LOCATION SCOPING & BOUTIQUES DIRECTORY
// Roberts Enterprises is multi-brand (I Do Bridal Couture, Proper & Co.)
// and multi-location (Baton Rouge, Covington). These endpoints expose the
// boutique/location directory and let operational data be scoped to a
// single location. Backward-compatible: existing endpoints are unchanged;
// scoping only applies when a boutique is explicitly selected.
// ============================================================

// Resolve the selected boutique/location for a request.
// Accepts ?boutique_id=<n> (query) or an x-boutique-id header. Returns null if unset/invalid.
function resolveBoutiqueScope(req) {
  const raw = (req.query && req.query.boutique_id) || (req.headers && req.headers['x-boutique-id']);
  const id = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isInteger(id) ? id : null;
}

// Apply a location scope to a Knex query only when a boutique is selected.
function scopeByBoutique(query, boutiqueId, column = 'boutique_id') {
  return boutiqueId ? query.where(column, boutiqueId) : query;
}

// GET /api/boutiques — directory of all brands/locations. Optional ?brand= & ?city= filters.
app.get('/api/boutiques', async (req, res) => {
  try {
    let q = knex('boutiques').select('*').orderBy('id');
    if (req.query.brand) q = q.where('brand', String(req.query.brand));
    if (req.query.city) q = q.where('city', String(req.query.city));
    const boutiques = await q;
    res.json({ count: boutiques.length, boutiques });
  } catch (error) {
    console.error('GET /api/boutiques failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/boutiques/:id — a single location.
app.get('/api/boutiques/:id', async (req, res) => {
  try {
    const boutique = await knex('boutiques').where({ id: req.params.id }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    res.json(boutique);
  } catch (error) {
    console.error('GET /api/boutiques/:id failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/boutiques/:id/inventory — inventory scoped to one location.
app.get('/api/boutiques/:id/inventory', async (req, res) => {
  try {
    const boutiqueId = parseInt(req.params.id, 10);
    const boutique = await knex('boutiques').where({ id: boutiqueId }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    const items = await scopeByBoutique(knex('inventory_items').select('*'), boutiqueId);
    for (const item of items) {
      item.variants = await knex('inventory_variants').where({ item_id: item.id });
    }
    res.json({ boutique_id: boutiqueId, location: boutique.name, count: items.length, items });
  } catch (error) {
    console.error('GET /api/boutiques/:id/inventory failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/boutiques — create a new brand/location.
app.post('/api/boutiques', async (req, res) => {
  const { name, brand, city, address, phone, hours } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [inserted] = await knex('boutiques')
      .insert({ name, brand, city, address, phone, hours })
      .returning('id');
    const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
    const boutique = await knex('boutiques').where({ id }).first();
    res.status(201).json(boutique);
  } catch (error) {
    console.error('POST /api/boutiques failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PHASE 3 — ALTERATIONS WORKFLOW
// Kanban-style alteration tickets scoped to a boutique/location, linked to a
// customer and (optionally) an assigned seamstress. Reuses the phase-2 location
// scoping helpers (resolveBoutiqueScope / scopeByBoutique).
// ============================================================

const ALTERATION_STATUSES = ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup'];

// GET /api/alterations — alterations board. Optional location scope via ?boutique_id or x-boutique-id.
app.get('/api/alterations', async (req, res) => {
  try {
    const boutiqueId = resolveBoutiqueScope(req);
    let q = knex('alterations as a')
      .leftJoin('customers as c', 'a.customer_id', 'c.id')
      .leftJoin('users as u', 'a.assigned_seamstress_id', 'u.id')
      .select(
        'a.id', 'a.boutique_id', 'a.customer_id', 'a.item_description',
        'a.status', 'a.due_date', 'a.notes', 'a.assigned_seamstress_id',
        knex.raw("(c.first_name || ' ' || c.last_name) as customer_name"),
        knex.raw("(u.first_name || ' ' || u.last_name) as seamstress_name")
      )
      .orderBy('a.due_date', 'asc');
    q = scopeByBoutique(q, boutiqueId, 'a.boutique_id');
    const tickets = await q;
    const kanban = {};
    for (const s of ALTERATION_STATUSES) kanban[s] = [];
    for (const t of tickets) (kanban[t.status] || kanban['Awaiting 1st Fitting']).push(t);
    res.json({ count: tickets.length, statuses: ALTERATION_STATUSES, kanban, tickets });
  } catch (error) {
    console.error('GET /api/alterations failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/boutiques/:id/alterations — alterations scoped to a single location.
app.get('/api/boutiques/:id/alterations', async (req, res) => {
  try {
    const boutiqueId = parseInt(req.params.id, 10);
    const boutique = await knex('boutiques').where({ id: boutiqueId }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    const tickets = await knex('alterations').where({ boutique_id: boutiqueId }).orderBy('due_date', 'asc');
    res.json({ boutique_id: boutiqueId, location: boutique.name, count: tickets.length, tickets });
  } catch (error) {
    console.error('GET /api/boutiques/:id/alterations failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/alterations — create an alteration ticket.
app.post('/api/alterations', async (req, res) => {
  const { customer_id, item_description, due_date, assigned_seamstress_id, notes, boutique_id } = req.body || {};
  if (!customer_id || !item_description) {
    return res.status(400).json({ error: 'customer_id and item_description are required' });
  }
  try {
    const defaultBoutique = await knex('boutiques').first();
    const scopedBoutiqueId = boutique_id || (defaultBoutique ? defaultBoutique.id : 1);
    const [inserted] = await knex('alterations')
      .insert({
        boutique_id: scopedBoutiqueId,
        customer_id,
        item_description,
        due_date: due_date || null,
        assigned_seamstress_id: assigned_seamstress_id || null,
        notes: notes || null,
        status: 'Awaiting 1st Fitting'
      })
      .returning('id');
    const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
    const ticket = await knex('alterations').where({ id }).first();
    res.status(201).json(ticket);
  } catch (error) {
    console.error('POST /api/alterations failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/alterations/:id/status — advance a ticket through the kanban; notify customer when ready.
app.post('/api/alterations/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!ALTERATION_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: ALTERATION_STATUSES });
  }
  try {
    const ticket = await knex('alterations').where({ id: req.params.id }).first();
    if (!ticket) return res.status(404).json({ error: 'Alteration ticket not found' });
    await knex('alterations').where({ id: ticket.id }).update({ status });
    let notified = false;
    if (status === 'Ready for Pickup') {
      const customer = await knex('customers').where({ id: ticket.customer_id }).first();
      console.log(`\n[Alterations SMS] >> ${customer && customer.phone ? customer.phone : 'file'}: "Hi ${customer ? customer.first_name : 'there'}! Your ${ticket.item_description} alterations are complete and ready for pickup."`);
      notified = true;
    }
    const updated = await knex('alterations').where({ id: ticket.id }).first();
    res.json({ ...updated, notified });
  } catch (error) {
    console.error('POST /api/alterations/:id/status failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PHASE 4 — INTER-LOCATION TRANSFERS
// Move inventory between boutiques/locations (Baton Rouge <-> Covington, across
// the I Do / Proper & Co. brands). Workflow: In_Transit -> Received. Source stock
// is deducted on send and credited on receipt. Reuses phase-2 location scoping.
// ============================================================

const TRANSFER_STATUSES = ['In_Transit', 'Received'];

// GET /api/transfers — list transfers. Optional ?boutique_id / x-boutique-id filters to where a boutique is source OR destination.
app.get('/api/transfers', async (req, res) => {
  try {
    const boutiqueId = resolveBoutiqueScope(req);
    let q = knex('transfers as t')
      .leftJoin('boutiques as fb', 't.from_boutique_id', 'fb.id')
      .leftJoin('boutiques as tb', 't.to_boutique_id', 'tb.id')
      .leftJoin('inventory_variants as iv', 't.inventory_variant_id', 'iv.id')
      .leftJoin('inventory_items as ii', 'iv.item_id', 'ii.id')
      .select(
        't.id', 't.from_boutique_id', 't.to_boutique_id', 't.inventory_variant_id',
        't.qty', 't.status', 't.notes', 't.received_at', 't.created_at',
        'fb.name as from_location', 'tb.name as to_location',
        'iv.sku', 'iv.size', 'iv.color', 'ii.vendor_name', 'ii.style_number'
      )
      .orderBy('t.created_at', 'desc');
    if (boutiqueId) {
      q = q.where(function () {
        this.where('t.from_boutique_id', boutiqueId).orWhere('t.to_boutique_id', boutiqueId);
      });
    }
    const transfers = await q;
    res.json({ count: transfers.length, statuses: TRANSFER_STATUSES, transfers });
  } catch (error) {
    console.error('GET /api/transfers failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transfers/:id — a single transfer.
app.get('/api/transfers/:id', async (req, res) => {
  try {
    const transfer = await knex('transfers').where({ id: req.params.id }).first();
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (error) {
    console.error('GET /api/transfers/:id failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transfers — initiate a transfer: validates stock, deducts source, status In_Transit.
app.post('/api/transfers', async (req, res) => {
  const { from_boutique_id, to_boutique_id, inventory_variant_id, qty, notes, created_by } = req.body || {};
  const amount = parseInt(qty, 10) || 1;
  if (!from_boutique_id || !to_boutique_id || !inventory_variant_id) {
    return res.status(400).json({ error: 'from_boutique_id, to_boutique_id and inventory_variant_id are required' });
  }
  if (String(from_boutique_id) === String(to_boutique_id)) {
    return res.status(400).json({ error: 'Source and destination boutiques must differ' });
  }
  try {
    const variant = await knex('inventory_variants').where({ id: inventory_variant_id }).first();
    if (!variant) return res.status(404).json({ error: 'Inventory variant not found' });
    if ((variant.stock_quantity || 0) < amount) {
      return res.status(409).json({ error: 'Insufficient stock at source', available: variant.stock_quantity || 0 });
    }
    const created = await knex.transaction(async (trx) => {
      await trx('inventory_variants').where({ id: inventory_variant_id }).decrement('stock_quantity', amount);
      const [inserted] = await trx('transfers')
        .insert({
          from_boutique_id, to_boutique_id, inventory_variant_id,
          qty: amount, notes: notes || null, created_by: created_by || null,
          status: 'In_Transit'
        })
        .returning('id');
      const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
      return trx('transfers').where({ id }).first();
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/transfers failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transfers/:id/receive — receive an in-transit transfer: credits destination stock, marks Received.
app.post('/api/transfers/:id/receive', async (req, res) => {
  const { received_by } = req.body || {};
  try {
    const transfer = await knex('transfers').where({ id: req.params.id }).first();
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status !== 'In_Transit') {
      return res.status(409).json({ error: 'Transfer already processed', status: transfer.status });
    }
    const updated = await knex.transaction(async (trx) => {
      if (transfer.inventory_variant_id) {
        await trx('inventory_variants').where({ id: transfer.inventory_variant_id }).increment('stock_quantity', transfer.qty);
      }
      await trx('transfers').where({ id: transfer.id }).update({
        status: 'Received', received_by: received_by || null, received_at: trx.fn.now()
      });
      return trx('transfers').where({ id: transfer.id }).first();
    });
    res.json(updated);
  } catch (error) {
    console.error('POST /api/transfers/:id/receive failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PHASE 5 — PAYROLL
// Time clock + paystubs. Clock in/out -> approve timesheets -> run payroll
// (generates paystubs for approved unpaid hours and marks them Paid).
// Hours are computed in JS for consistent behavior across SQLite (dev) and PG (prod).
// ============================================================

// GET /api/payroll/staff — staff with wage, approved-unpaid hours, unapproved count, clocked-in flag.
app.get('/api/payroll/staff', async (req, res) => {
  try {
    const boutiqueId = resolveBoutiqueScope(req);
    let uq = knex('users').select('id', 'first_name', 'last_name', 'email', 'role', 'boutique_id', 'hourly_wage').orderBy('first_name');
    uq = scopeByBoutique(uq, boutiqueId);
    const users = await uq;
    for (const u of users) {
      const unpaid = await knex('time_entries').where({ user_id: u.id, status: 'Unpaid', approved: true }).sum('total_hours as h').first();
      const unapproved = await knex('time_entries').where({ user_id: u.id, approved: false }).count('id as c').first();
      const open = await knex('time_entries').where({ user_id: u.id }).whereNull('clock_out').first();
      u.approved_unpaid_hours = Number((unpaid && unpaid.h) || 0);
      u.unapproved_entries = Number((unapproved && unapproved.c) || 0);
      u.clocked_in = !!open;
    }
    res.json({ count: users.length, staff: users });
  } catch (error) {
    console.error('GET /api/payroll/staff failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payroll/clock-in { user_id }
app.post('/api/payroll/clock-in', async (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const user = await knex('users').where({ id: user_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const open = await knex('time_entries').where({ user_id }).whereNull('clock_out').first();
    if (open) return res.status(409).json({ error: 'Already clocked in', entry: open });
    const [inserted] = await knex('time_entries')
      .insert({ user_id, boutique_id: user.boutique_id, clock_in: new Date().toISOString(), status: 'Unpaid', approved: false })
      .returning('id');
    const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
    res.status(201).json(await knex('time_entries').where({ id }).first());
  } catch (error) {
    console.error('POST /api/payroll/clock-in failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payroll/clock-out { user_id } — closes the open entry and computes hours.
app.post('/api/payroll/clock-out', async (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const open = await knex('time_entries').where({ user_id }).whereNull('clock_out').orderBy('clock_in', 'desc').first();
    if (!open) return res.status(409).json({ error: 'Not currently clocked in' });
    const outT = new Date();
    const hours = Math.max(0, Math.round(((outT.getTime() - new Date(open.clock_in).getTime()) / 3600000) * 100) / 100);
    await knex('time_entries').where({ id: open.id }).update({ clock_out: outT.toISOString(), total_hours: hours });
    res.json(await knex('time_entries').where({ id: open.id }).first());
  } catch (error) {
    console.error('POST /api/payroll/clock-out failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payroll/timesheets?user_id= — time entries, optionally filtered by user.
app.get('/api/payroll/timesheets', async (req, res) => {
  try {
    let q = knex('time_entries as te')
      .leftJoin('users as u', 'te.user_id', 'u.id')
      .select('te.*', knex.raw("(u.first_name || ' ' || u.last_name) as staff_name"))
      .orderBy('te.clock_in', 'desc');
    if (req.query.user_id) q = q.where('te.user_id', req.query.user_id);
    const entries = await q;
    res.json({ count: entries.length, entries });
  } catch (error) {
    console.error('GET /api/payroll/timesheets failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payroll/timesheets/:id/approve — approve a timesheet entry.
app.post('/api/payroll/timesheets/:id/approve', async (req, res) => {
  try {
    const entry = await knex('time_entries').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    await knex('time_entries').where({ id: entry.id }).update({ approved: true });
    res.json(await knex('time_entries').where({ id: entry.id }).first());
  } catch (error) {
    console.error('POST /api/payroll/timesheets/:id/approve failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payroll/run { period_start, period_end } — generate paystubs for approved unpaid hours; mark Paid.
app.post('/api/payroll/run', async (req, res) => {
  const { period_start, period_end } = req.body || {};
  if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end (YYYY-MM-DD) are required' });
  const endBound = `${period_end}T23:59:59.999Z`;
  try {
    const created = await knex.transaction(async (trx) => {
      const users = await trx('users').select('*');
      const stubs = [];
      for (const u of users) {
        const agg = await trx('time_entries')
          .where({ user_id: u.id, status: 'Unpaid', approved: true })
          .whereNotNull('clock_out')
          .andWhere('clock_out', '>=', period_start)
          .andWhere('clock_out', '<=', endBound)
          .sum('total_hours as h')
          .first();
        const totalHours = Number((agg && agg.h) || 0);
        if (totalHours <= 0) continue;
        const rate = Number(u.hourly_wage || 0);
        const basePay = Math.round(totalHours * rate * 100) / 100;
        const [inserted] = await trx('paystubs')
          .insert({
            user_id: u.id, boutique_id: u.boutique_id, period_start, period_end,
            total_hours: totalHours, hourly_rate: rate, base_pay: basePay, total_pay: basePay,
          })
          .returning('id');
        const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
        await trx('time_entries')
          .where({ user_id: u.id, status: 'Unpaid', approved: true })
          .whereNotNull('clock_out')
          .andWhere('clock_out', '>=', period_start)
          .andWhere('clock_out', '<=', endBound)
          .update({ status: 'Paid' });
        stubs.push(await trx('paystubs').where({ id }).first());
      }
      return stubs;
    });
    res.json({ paystubs_created: created.length, total_paid: created.reduce((s, p) => s + Number(p.total_pay || 0), 0), paystubs: created });
  } catch (error) {
    console.error('POST /api/payroll/run failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payroll/paystubs — recent paystubs with staff names.
app.get('/api/payroll/paystubs', async (req, res) => {
  try {
    const stubs = await knex('paystubs as p')
      .leftJoin('users as u', 'p.user_id', 'u.id')
      .select('p.*', knex.raw("(u.first_name || ' ' || u.last_name) as staff_name"))
      .orderBy('p.created_at', 'desc');
    res.json({ count: stubs.length, paystubs: stubs });
  } catch (error) {
    console.error('GET /api/payroll/paystubs failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server successfully listening on port ${PORT}`);
});
