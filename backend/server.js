require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_vowos_key');
const { EventEmitter } = require('events');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('./knexfile')[environment];
const knex = require('knex')(knexConfig);

const app = express();
const JWT_SECRET = 'vowos-production-secret-4050';
const PORT = 4000;

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

app.use(cors());
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
      const [id] = await knex('boutiques').insert({ name: 'BridalLive Boutique Default' });
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

app.post('/api/operations/purchases', async (req, res) => {
  try {
    const { 
      customer_id, vendor_name, style_number, size, 
      size_category, split_bust, split_waist, split_hips, 
      hollow_to_hem, custom_notes 
    } = req.body;
    
    // In strict production, this is extracted from the JWT token
    const boutique_id = 1; 

    // Auto-calculate expected ship date (+4 months standard lead time)
    const shipDate = new Date();
    shipDate.setMonth(shipDate.getMonth() + 4);

    const [id] = await knex('purchase_orders').insert({
      boutique_id,
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
    });
    
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

    const [id] = await knex('leads').insert({
      boutique_id: boutique.id,
      first_name,
      last_name,
      email,
      status: 'new'
    });

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
      
      const [id] = await knex('customers').insert({
        boutique_id: boutique?.id,
        first_name,
        last_name,
        email,
        phone
      });
  
      res.status(201).json({ id, message: 'Customer created successfully' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
         return res.status(409).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  });

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
