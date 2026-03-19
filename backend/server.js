const express = require('express');
const cors = require('cors');
const knexConfig = require('./knexfile').development;
const knex = require('knex')(knexConfig);

const app = express();
const PORT = 4000;

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
    
    // Check if users exist
    let user = await knex('users').first();
    if (!user) {
      await knex('users').insert({
        boutique_id: boutique.id,
        first_name: 'Owner',
        last_name: 'Admin',
        email: 'admin@vowos.test'
      });
    }

    res.json({ message: 'Database Seeded Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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
