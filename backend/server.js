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
