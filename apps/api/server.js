require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_vowos_key');
const twilio = require('twilio');
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
const { EventEmitter } = require('events');
const { seedDemoData } = require('./utils/demoSeeder');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('./knexfile')[environment];
const knex = require('knex')(knexConfig);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (environment === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required in production');
}

// Patch 02 — auth-tenant-isolation: JWT verify middleware
function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch { return res.status(401).json({ error: 'Unauthorized' }); }
}

// Middleware factory — restricts a route to one or more roles.
// Usage: requireRole('owner') or requireRole('owner', 'manager')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Trim a string and enforce a max byte length at API boundaries.
function sanitizeText(value, maxLength = 2000) {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

// Return a safe error message: full detail in dev/test, generic in production.
function safeError(error) {
  if (environment === 'production') return 'An internal error occurred. Please try again.';
  return error instanceof Error ? error.message : String(error);
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

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:5173,https://robertsenterprises.bridgebox.ai').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));
// Skip JSON parsing for the Stripe webhook — it needs the raw bytes for signature verification
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') return next();
  express.json()(req, res, next);
});

// --- STRUCTURED REQUEST LOGGING ---
app.use((req, res, next) => {
  if (req.path === '/api/health') return next(); // skip noisy health pings
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(JSON.stringify({
      level, method: req.method, path: req.path,
      status: res.statusCode, ms,
      user: req.user ? req.user.id : undefined,
    }));
  });
  next();
});

// --- GLOBAL RATE LIMITER ---
// Broad guard against scraping / brute-force on every endpoint.
// Login has its own tighter limiter (10 req / 15 min).
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 req/min per IP — generous for a staff app
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  message: { error: 'Too many requests — please slow down.' },
});
app.use(globalLimiter);

// --- PAGINATION HELPER ---
// Reads ?page (1-based) and ?limit from query string. Returns { offset, limit, page }.
function parsePagination(req, defaultLimit = 50, maxLimit = 200) {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit || String(defaultLimit), 10)));
  return { page, limit, offset: (page - 1) * limit };
}

// Wraps a paginated result with metadata the UI can use.
function paginate(rows, total, page, limit) {
  return { data: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await knex.raw('select 1');
    res.json({ status: 'OK', db: 'connected', env: environment });
  } catch (e) {
    res.status(503).json({ status: 'ERROR', db: 'unreachable', error: safeError(e) });
  }
});

// Seed endpoints are gated behind ADMIN_SEED_SECRET in production
function seedGuard(req, res, next) {
  const secret = process.env.ADMIN_SEED_SECRET;
  // In production, refuse if secret is not configured — open seeds are a security hole
  if (environment === 'production' && !secret) {
    return res.status(403).json({ error: 'Seed endpoints are disabled: set ADMIN_SEED_SECRET in production.' });
  }
  if (secret && req.headers['x-seed-secret'] !== secret) {
    return res.status(403).json({ error: 'Seed endpoint requires X-Seed-Secret header.' });
  }
  next();
}

// --- MVP SEED DATA ENDPOINT ---
app.post('/api/seed', seedGuard, async (req, res) => {
  try {
    // bcrypt hoisted to top-level
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
      const ownerHash = await bcrypt.hash('password123', 10);
      await knex('users').insert({
        boutique_id: boutique.id,
        first_name: 'Owner',
        last_name: 'Admin',
        email: 'admin@vowos.test',
        role: 'owner',
        password_hash: ownerHash
      });
      const consultantHash = await bcrypt.hash('password123', 10);
      await knex('users').insert({
        boutique_id: boutique.id,
        first_name: 'Jessica',
        last_name: 'Stylist',
        email: 'jessica@vowos.test',
        role: 'consultant',
        password_hash: consultantHash
      });
    }

    res.json({ message: 'Database Seeded Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: safeError(error) });
  }
});

// --- DEMO MODE ENDPOINT ---
app.post('/api/demo-login', async (req, res) => {
  try {
    // seedDemoData hoisted to top-level
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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- AUTHENTICATION API ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes.' }
});

const userCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many user creation attempts — please try again later.' }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await knex('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials. Password or Email is incorrect.' });
    // Patch 13 — bcrypt-passwords: compare with bcrypt, fall back to plain for dev seeds
    // bcrypt hoisted to top-level
    const hashMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
    const plainMatch = !hashMatch && !String(user.password_hash).startsWith('$2') && user.password_hash === password;
    if (!hashMatch && !plainMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password or Email is incorrect.' });
    }
    
    const token = jwt.sign(
      { id: user.id, name: user.first_name, role: user.role, boutique_id: user.boutique_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.first_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// --- INVENTORY API ---
app.get('/api/inventory', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req, 50);
    const [{ total }] = await knex('inventory_items').count('id as total');
    const items = await knex('inventory_items').select('id', 'boutique_id', 'vendor_name', 'style_number', 'category', 'base_price_cents', 'created_at').orderBy('id', 'asc').limit(limit).offset(offset);
    for (const item of items) {
      item.variants = await knex('inventory_variants').where({ item_id: item.id });
    }
    res.json(paginate(items, Number(total), page, limit));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/inventory/seed', seedGuard, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- HARDWARE BARCODE ENGINE ---
app.get('/api/inventory/scan/:sku', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- FINANCIAL API ---
app.get('/api/invoices', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req, 50);
    const base = knex('invoices').join('customers', 'invoices.customer_id', '=', 'customers.id');
    const [{ total }] = await base.clone().count('invoices.id as total');
    const invoices = await base.clone()
      .select('invoices.*', 'customers.first_name', 'customers.last_name')
      .orderBy('invoices.id', 'desc')
      .limit(limit).offset(offset);
    for (const inv of invoices) {
      inv.payments = await knex('payments').where({ invoice_id: inv.id });
    }
    res.json(paginate(invoices, Number(total), page, limit));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/invoices/:id/checkout', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await knex('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.balance_due_cents <= 0) return res.status(400).json({ error: 'Invoice fully paid' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
      success_url: `${frontendUrl}/?payment=success&invoice=${id}`,
      cancel_url: `${frontendUrl}/?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      event = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString())
        : req.body;
    }
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

app.post('/api/payments', authenticate, async (req, res) => {
  try {
    const { invoice_id, method, reference_number } = req.body;
    const amount_cents = Number(req.body.amount_cents);
    if (!invoice_id || !Number.isInteger(amount_cents) || amount_cents <= 0) {
      return res.status(400).json({ error: 'invoice_id and a positive integer amount_cents are required.' });
    }

    const invoice = await knex('invoices').where({ id: invoice_id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.boutique_id !== req.user.boutique_id) {
      return res.status(403).json({ error: 'Forbidden: invoice belongs to a different boutique' });
    }

    await knex('payments').insert({ invoice_id, amount_cents, method: sanitizeText(method, 50), reference_number: sanitizeText(reference_number, 100) });

    const payments = await knex('payments').where({ invoice_id });
    const total_paid = payments.reduce((sum, p) => sum + p.amount_cents, 0);

    const balance_due = invoice.total_amount_cents - total_paid;
    const status = balance_due <= 0 ? 'paid' : (total_paid > 0 ? 'partial' : 'unpaid');

    await knex('invoices').where({ id: invoice_id }).update({
      total_paid_cents: total_paid,
      balance_due_cents: balance_due < 0 ? 0 : balance_due,
      status
    });

    res.json({ message: 'Payment successfully processed' });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/invoices/seed', seedGuard, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- OPERATIONS API ---
app.get('/api/operations', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/appointments', authenticate, async (req, res) => {
  try {
    const { customer_id, time_slot, type, consultant_name, room_name } = req.body;
    const boutique_id = req.user.boutique_id;
    if (!boutique_id) return res.status(400).json({ error: 'User token is missing boutique_id' });

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
    const rows = await knex('appointments').insert({
      boutique_id, customer_id, time_slot, type, consultant_name, room_name
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);

    res.json({ id, message: 'Appointment securely scheduled and locked into the active calendar.' });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/operations/purchases', authenticate, async (req, res) => {
  try {
    const { 
      customer_id, vendor_name, style_number, size, 
      size_category, split_bust, split_waist, split_hips, 
      hollow_to_hem, custom_notes 
    } = req.body;
    
    const boutique_id = req.user.boutique_id;
    if (!boutique_id) return res.status(400).json({ error: 'User token is missing boutique_id' });

    // Auto-calculate expected ship date (+4 months standard lead time)
    const shipDate = new Date();
    shipDate.setMonth(shipDate.getMonth() + 4);

    const rows = await knex('purchase_orders').insert({
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
      expected_delivery_date: shipDate.toISOString().split('T')[0],
      status: 'Submitted'
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);
    
    res.json({ id, message: 'Purchase Order fully structured and transmitted.' });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/operations/pickups/:id/ready', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/operations/seed', seedGuard, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- ADMINISTRATIVE API ---
const DEFAULT_BUSINESS_RULES = {
  taxRate: 8.25,
  depositPercent: 50,
  returnDays: 14,
  apptDurationFitting: 90,
  apptDurationAlt: 60,
  lowStockThreshold: 3,
  smsAlerts: true,
  emailReceipts: true
};

async function getBusinessRules(boutique_id) {
  const rows = await knex('business_rules').where({ boutique_id });
  const fromDb = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_BUSINESS_RULES, ...fromDb };
}

async function setBusinessRules(boutique_id, updates) {
  for (const [key, value] of Object.entries(updates)) {
    await knex('business_rules')
      .insert({ boutique_id, key, value: JSON.stringify(value) })
      .onConflict(['boutique_id', 'key']).merge();
  }
  return getBusinessRules(boutique_id);
}

app.get('/api/system/settings', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    const users = await knex('users').select('id', 'first_name', 'last_name', 'email', 'role', 'created_at', knex.raw("(first_name || ' ' || last_name) as name")).orderBy('created_at', 'desc');
    const business_rules = boutique ? await getBusinessRules(boutique.id) : DEFAULT_BUSINESS_RULES;
    res.json({ boutique, users, business_rules });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/system/settings/rules', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const boutique = await knex('boutiques').first();
    if (!boutique) return res.status(404).json({ error: 'No boutique found' });
    const rules = await setBusinessRules(boutique.id, req.body);
    res.json({ message: 'Rules Synced', rules });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/system/users', authenticate, requireRole('owner'), userCreateLimiter, async (req, res) => {
  try {
    // bcrypt hoisted to top-level
    const { email, role, password } = req.body;
    const name = sanitizeText(req.body?.name, 200);

    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!['owner', 'manager', 'consultant'].includes(role)) return res.status(400).json({ error: 'role must be owner, manager, or consultant' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

    const boutique = await knex('boutiques').first();

    const existing = await knex('users').where({ email: email.toLowerCase().trim() }).first();
    if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

    const _parts = name.trim().split(/\s+/);
    const first_name = _parts.shift();
    const last_name = _parts.join(' ');
    const password_hash = await bcrypt.hash(password, 10);
    const rows = await knex('users').insert({
      boutique_id: boutique.id,
      first_name,
      last_name,
      email,
      password_hash,
      role
    }).returning('id');
    const id = rows[0] && (rows[0].id ?? rows[0]);

    res.status(201).json({ id, message: 'Employee successfully provisioned within VowOS architecture.' });
  } catch(err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Identical Email already maps to an active Employee.' });
    }
    res.status(500).json({ error: safeError(err) });
  }
});

// --- LEADS API ---
app.get('/api/leads', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req, 50);
    const [{ total }] = await knex('leads').count('id as total');
    const leads = await knex('leads').select('id', 'boutique_id', 'first_name', 'last_name', 'email', 'phone', 'source', 'notes', 'created_at').orderBy('created_at', 'desc').limit(limit).offset(offset);
    res.json(paginate(leads, Number(total), page, limit));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/leads', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
    const boutique = await knex('boutiques').first();
    if (!boutique) {
      return res.status(400).json({ error: 'No boutique configured yet. Call /api/seed.' });
    }

    const existingLead = await knex('leads').where({ email }).first();
    if (existingLead) return res.status(409).json({ error: 'Email already exists as a lead.' });
    const existingCust = await knex('customers').where({ email }).first();
    if (existingCust) return res.status(409).json({ error: 'Email already exists as a customer.' });

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
    res.status(500).json({ error: safeError(error) });
  }
});

// --- CUSTOMERS API ---
app.get('/api/customers', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req, 50);
    const [{ total }] = await knex('customers').count('id as total');
    const customers = await knex('customers').select('id', 'boutique_id', 'first_name', 'last_name', 'email', 'phone', 'wedding_date', 'created_at').orderBy('created_at', 'desc').limit(limit).offset(offset);
    res.json(paginate(customers, Number(total), page, limit));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

app.post('/api/customers', authenticate, async (req, res) => {
    try {
      const { first_name, last_name, email, phone } = req.body;
      if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required.' });
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
      const boutique = await knex('boutiques').first();
      const dupCheck = await knex('customers').where({ email }).first();
      if (dupCheck) return res.status(409).json({ error: 'Email already exists as a customer.' });

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
      res.status(500).json({ error: safeError(error) });
    }
  });

// --- TWILIO COMMUNICATIONS API ---
app.post('/api/communications/sms', authenticate, async (req, res) => {
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
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// (Stripe checkout is handled above at POST /api/invoices/:id/checkout)

// --- PREDICTIVE AI ANALYTICS ---
app.get('/api/analytics/insights', authenticate, async (req, res) => {
  try {
    const rawInvoices = await knex('invoices').select('id', 'customer_id', 'boutique_id', 'status', 'total_cents', 'balance_due_cents', 'created_at');
    const rawAppointments = await knex('appointments').select('id', 'customer_id', 'boutique_id', 'consultant_name', 'type', 'time_slot', 'created_at');
    const rawInventory = await knex('inventory_items').select('id', 'boutique_id', 'vendor_name', 'style_number', 'description', 'retail_price_cents', 'created_at');
    
    // 1. Stylist Conversion Volume
    const stylistCounts = rawAppointments.reduce((acc, curr) => {
      acc[curr.consultant_name] = (acc[curr.consultant_name] || 0) + 1;
      return acc;
    }, {});
    const topStylist = Object.keys(stylistCounts).length > 0 ? Object.keys(stylistCounts).reduce((a, b) => stylistCounts[a] > stylistCounts[b] ? a : b, 'None') : 'None';
    
    // 2. Financial Velocity
    const openInvoices = rawInvoices.filter(i => i.balance_due_cents > 0);
    const totalAgedReceivables = openInvoices.reduce((sum, i) => sum + i.balance_due_cents, 0);

    // 3. Fast-Moving Inventory (Supply Chain prediction) — stock lives on variants, not items
    const rawVariants = await knex('inventory_variants').select('sku', 'stock_quantity');
    const lowStock = rawVariants.filter((v) => (v.stock_quantity || 0) <= 1);

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
         message: `Predictive AI Engine flags ${lowStock.length} SKU variant(s) at or below the critical 1-unit margin. We strongly advise triggering a Purchase Order or inter-location transfer.`
      });
    }

    // --- Cross-module operational insights (phases 3-5); each guarded so a failure is non-fatal ---
    try {
      const alts = await knex('alterations').select('status', 'due_date');
      const awaiting = alts.filter((a) => a.status === 'Awaiting 1st Fitting').length;
      const today = new Date().toISOString().slice(0, 10);
      const overdue = alts.filter((a) => a.due_date && String(a.due_date).slice(0, 10) < today && a.status !== 'Ready for Pickup').length;
      if (alts.length > 0) insights.push({ id: 'AI-201', type: 'operations', title: 'Alterations Workflow', message: `${alts.length} active alteration ticket(s) — ${awaiting} awaiting first fitting${overdue ? `, ${overdue} past due` : ''}. Assign seamstresses to keep the board moving.` });
    } catch (e) { console.warn('insights alterations:', e.message); }

    try {
      const row = await knex('transfers').where({ status: 'In_Transit' }).count('id as c').first();
      const n = Number((row && row.c) || 0);
      if (n > 0) insights.push({ id: 'AI-202', type: 'logistics', title: 'Transfers In Transit', message: `${n} inventory transfer(s) are in transit awaiting receipt. Confirm receipt to release the reserved stock at the destination boutique.` });
    } catch (e) { console.warn('insights transfers:', e.message); }

    try {
      const users = await knex('users').select('id', 'hourly_wage');
      let hours = 0; let pay = 0;
      for (const u of users) {
        const agg = await knex('time_entries').where({ user_id: u.id, status: 'Unpaid', approved: true }).sum('total_hours as h').first();
        const h = Number((agg && agg.h) || 0); hours += h; pay += h * Number(u.hourly_wage || 0);
      }
      if (hours > 0) insights.push({ id: 'AI-203', type: 'payroll', title: 'Payroll Ready to Process', message: `${hours.toFixed(2)} approved unpaid hour(s) (~$${pay.toFixed(2)}) are ready to process. Run a pay period from the Payroll module.` });
    } catch (e) { console.warn('insights payroll:', e.message); }

    res.json({ insights });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// --- REPORTING SYSTEM AGGREGATIONS ---
app.get('/api/reports/financials', authenticate, async (req, res) => {
  try {
    const invoices = await knex('invoices')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .select(
        'invoices.id', 'invoices.boutique_id', 'invoices.customer_id', 'invoices.status',
        'invoices.total_cents', 'invoices.balance_due_cents', 'invoices.created_at',
        'customers.first_name', 'customers.last_name', 'customers.email', 'customers.phone'
      );
    const payments = await knex('payments')
      .join('invoices', 'payments.invoice_id', 'invoices.id')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .select(
        'payments.id', 'payments.invoice_id', 'payments.amount_cents', 'payments.method',
        'payments.reference_number', 'payments.created_at',
        'invoices.status as invoice_status', 'customers.first_name', 'customers.last_name'
      );
    res.json({ invoices, payments });
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/reports/sales', authenticate, async (req, res) => {
  try {
    // Patch 01 — sales-grain-fix: per-transaction grain, appointments only
    const rows = await knex('appointments')
      .join('customers', 'appointments.customer_id', '=', 'customers.id')
      .select(
        'appointments.id',
        knex.raw("customers.first_name || ' ' || customers.last_name as customer_name"),
        'appointments.created_at as date',
        'appointments.consultant_name as stylist',
        'appointments.type as status',
        'appointments.time_slot'
      )
      .orderBy('appointments.created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/reports/inventory', authenticate, async (req, res) => {
  try {
    const items = await knex('inventory_items').select('id', 'boutique_id', 'vendor_name', 'style_number', 'description', 'retail_price_cents', 'cost_price_cents', 'category', 'created_at');
    const variants = await knex('inventory_variants').select('id', 'item_id', 'sku', 'size', 'color', 'stock_quantity', 'created_at');
    const purchase_orders = await knex('purchase_orders').select('id', 'boutique_id', 'customer_id', 'vendor_name', 'status', 'order_date', 'expected_date', 'total_cents', 'notes', 'created_at');
    res.json({ items, variants, purchase_orders });
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
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
// Owner role may filter by any boutique via ?boutique_id or x-boutique-id.
// Non-owners are always scoped to their own boutique from the JWT.
function resolveBoutiqueScope(req) {
  const userBoutiqueId = req.user && req.user.boutique_id;
  const userRole = req.user && req.user.role;
  if (userRole !== 'owner') return userBoutiqueId || null;
  const raw = (req.query && req.query.boutique_id) || (req.headers && req.headers['x-boutique-id']);
  const id = raw != null ? parseInt(raw, 10) : NaN;
  // Owners with no explicit scope see all boutiques (company-wide view)
  return Number.isInteger(id) ? id : null;
}

// Apply a location scope to a Knex query only when a boutique is selected.
function scopeByBoutique(query, boutiqueId, column = 'boutique_id') {
  return boutiqueId ? query.where(column, boutiqueId) : query;
}

// GET /api/boutiques — directory of all brands/locations. Optional ?brand= & ?city= filters.
app.get('/api/boutiques', authenticate, async (req, res) => {
  try {
    let q = knex('boutiques').select('id', 'name', 'brand', 'city', 'address', 'phone', 'hours', 'created_at').orderBy('id');
    if (req.query.brand) q = q.where('brand', String(req.query.brand));
    if (req.query.city) q = q.where('city', String(req.query.city));
    const boutiques = await q;
    res.json({ count: boutiques.length, boutiques });
  } catch (error) {
    console.error('GET /api/boutiques failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/boutiques/:id — a single location.
app.get('/api/boutiques/:id', authenticate, async (req, res) => {
  try {
    const boutique = await knex('boutiques').where({ id: req.params.id }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    res.json(boutique);
  } catch (error) {
    console.error('GET /api/boutiques/:id failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/boutiques/:id/inventory — inventory scoped to one location.
app.get('/api/boutiques/:id/inventory', authenticate, async (req, res) => {
  try {
    const boutiqueId = parseInt(req.params.id, 10);
    const boutique = await knex('boutiques').where({ id: boutiqueId }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    const items = await scopeByBoutique(knex('inventory_items').select('id', 'boutique_id', 'vendor_name', 'style_number', 'description', 'retail_price_cents', 'cost_price_cents', 'category', 'created_at'), boutiqueId);
    for (const item of items) {
      item.variants = await knex('inventory_variants').where({ item_id: item.id });
    }
    res.json({ boutique_id: boutiqueId, location: boutique.name, count: items.length, items });
  } catch (error) {
    console.error('GET /api/boutiques/:id/inventory failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/boutiques — create a new brand/location.
app.post('/api/boutiques', authenticate, requireRole('owner'), async (req, res) => {
  const raw = req.body || {};
  const name    = sanitizeText(raw.name, 200);
  const brand   = sanitizeText(raw.brand, 200);
  const city    = sanitizeText(raw.city, 100);
  const address = sanitizeText(raw.address, 500);
  const phone   = sanitizeText(raw.phone, 30);
  const hours   = sanitizeText(raw.hours, 500);
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
    res.status(500).json({ error: safeError(error) });
  }
});

// ============================================================
// PHASE 3 — ALTERATIONS WORKFLOW
// Kanban-style alteration tickets scoped to a boutique/location, linked to a
// customer and (optionally) an assigned seamstress. Reuses the phase-2 location
// scoping helpers (resolveBoutiqueScope / scopeByBoutique).
// ============================================================

const ALTERATION_STATUSES = ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// GET /api/alterations — alterations board. Optional location scope via ?boutique_id or x-boutique-id.
app.get('/api/alterations', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/boutiques/:id/alterations — alterations scoped to a single location.
app.get('/api/boutiques/:id/alterations', authenticate, async (req, res) => {
  try {
    const boutiqueId = parseInt(req.params.id, 10);
    const boutique = await knex('boutiques').where({ id: boutiqueId }).first();
    if (!boutique) return res.status(404).json({ error: 'Boutique not found' });
    const tickets = await knex('alterations').where({ boutique_id: boutiqueId }).orderBy('due_date', 'asc');
    res.json({ boutique_id: boutiqueId, location: boutique.name, count: tickets.length, tickets });
  } catch (error) {
    console.error('GET /api/boutiques/:id/alterations failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/alterations — create an alteration ticket.
app.post('/api/alterations', authenticate, async (req, res) => {
  const { customer_id, due_date, assigned_seamstress_id } = req.body || {};
  const item_description = sanitizeText(req.body?.item_description, 500);
  const notes = sanitizeText(req.body?.notes);
  if (!customer_id || !item_description) {
    return res.status(400).json({ error: 'customer_id and item_description are required' });
  }
  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: 'due_date must be a valid ISO date string (e.g. 2026-09-15).' });
  }
  try {
    // Always use the boutique from the JWT — never trust client-supplied boutique_id
    const scopedBoutiqueId = req.user.boutique_id;
    if (!scopedBoutiqueId) return res.status(400).json({ error: 'User token is missing boutique_id' });
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
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/alterations/:id/status — advance a ticket through the kanban; notify customer when ready.
app.post('/api/alterations/:id/status', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
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
app.get('/api/transfers', authenticate, async (req, res) => {
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
    const { page, limit, offset } = parsePagination(req, 50);
    const [{ total }] = await q.clone().clearSelect().clearOrder().count('t.id as total');
    const transfers = await q.limit(limit).offset(offset);
    const paged = paginate(transfers, Number(total), page, limit);
    res.json({ ...paged, statuses: TRANSFER_STATUSES });
  } catch (error) {
    console.error('GET /api/transfers failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/transfers/:id — a single transfer.
app.get('/api/transfers/:id', authenticate, async (req, res) => {
  try {
    const transfer = await knex('transfers').where({ id: req.params.id }).first();
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (error) {
    console.error('GET /api/transfers/:id failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/transfers — initiate a transfer: validates stock, deducts source, status In_Transit.
app.post('/api/transfers', authenticate, async (req, res) => {
  const { from_boutique_id, to_boutique_id, inventory_variant_id, qty, created_by } = req.body || {};
  const notes = sanitizeText(req.body?.notes);
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
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/transfers/:id/receive — receive an in-transit transfer: credits destination stock, marks Received.
app.post('/api/transfers/:id/receive', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// ============================================================
// PHASE 5 — PAYROLL
// Time clock + paystubs. Clock in/out -> approve timesheets -> run payroll
// (generates paystubs for approved unpaid hours and marks them Paid).
// Hours are computed in JS for consistent behavior across SQLite (dev) and PG (prod).
// ============================================================

// GET /api/payroll/staff — staff with wage, approved-unpaid hours, unapproved count, clocked-in flag.
app.get('/api/payroll/staff', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/payroll/clock-in { user_id }
app.post('/api/payroll/clock-in', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/payroll/clock-out { user_id } — closes the open entry and computes hours.
app.post('/api/payroll/clock-out', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/payroll/timesheets?user_id= — time entries, optionally filtered by user.
app.get('/api/payroll/timesheets', authenticate, async (req, res) => {
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
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/payroll/timesheets/:id/approve — approve a timesheet entry.
app.post('/api/payroll/timesheets/:id/approve', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const entry = await knex('time_entries').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    await knex('time_entries').where({ id: entry.id }).update({ approved: true });
    res.json(await knex('time_entries').where({ id: entry.id }).first());
  } catch (error) {
    console.error('POST /api/payroll/timesheets/:id/approve failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/payroll/run { period_start, period_end } — generate paystubs for approved unpaid hours; mark Paid.
app.post('/api/payroll/run', authenticate, requireRole('owner'), async (req, res) => {
  const { period_start, period_end } = req.body || {};
  if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end (YYYY-MM-DD) are required' });
  if (isNaN(Date.parse(period_start)) || isNaN(Date.parse(period_end))) {
    return res.status(400).json({ error: 'period_start and period_end must be valid dates (YYYY-MM-DD).' });
  }
  if (new Date(period_start) > new Date(period_end)) {
    return res.status(400).json({ error: 'period_start must be before period_end.' });
  }
  const endBound = `${period_end}T23:59:59.999Z`;
  try {
    const created = await knex.transaction(async (trx) => {
      const users = await trx('users').select('id', 'first_name', 'last_name', 'email', 'role', 'boutique_id', 'hourly_wage');
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
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/payroll/paystubs — recent paystubs with staff names.
app.get('/api/payroll/paystubs', authenticate, async (req, res) => {
  try {
    const stubs = await knex('paystubs as p')
      .leftJoin('users as u', 'p.user_id', 'u.id')
      .select('p.*', knex.raw("(u.first_name || ' ' || u.last_name) as staff_name"))
      .orderBy('p.created_at', 'desc');
    res.json({ count: stubs.length, paystubs: stubs });
  } catch (error) {
    console.error('GET /api/payroll/paystubs failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// ============================================================
// PHASE 6 — TEAM CHAT
// Channel-based internal team communication. Channels can be company-wide
// (boutique_id null) or scoped to a boutique. Messages are authored by users.
// ============================================================

// GET /api/chat/channels — list channels (company-wide + optionally scoped to ?boutique_id).
app.get('/api/chat/channels', authenticate, async (req, res) => {
  try {
    const boutiqueId = resolveBoutiqueScope(req);
    let q = knex('chat_channels').select('id', 'boutique_id', 'name', 'description', 'created_at').orderBy('id');
    if (boutiqueId) {
      q = q.where(function () { this.where('boutique_id', boutiqueId).orWhereNull('boutique_id'); });
    }
    const channels = await q;
    for (const c of channels) {
      const cnt = await knex('chat_messages').where({ channel_id: c.id }).count('id as c').first();
      c.message_count = Number((cnt && cnt.c) || 0);
    }
    res.json({ count: channels.length, channels });
  } catch (error) {
    console.error('GET /api/chat/channels failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/chat/channels { name, boutique_id? } — create a channel.
app.post('/api/chat/channels', authenticate, async (req, res) => {
  const { name, boutique_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [inserted] = await knex('chat_channels').insert({ name, boutique_id: boutique_id || null }).returning('id');
    const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
    res.status(201).json(await knex('chat_channels').where({ id }).first());
  } catch (error) {
    console.error('POST /api/chat/channels failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/chat/channels/:id/messages — messages in a channel, oldest first, with author names.
app.get('/api/chat/channels/:id/messages', authenticate, async (req, res) => {
  try {
    const channel = await knex('chat_channels').where({ id: req.params.id }).first();
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const messages = await knex('chat_messages as m')
      .leftJoin('users as u', 'm.author_id', 'u.id')
      .select('m.id', 'm.channel_id', 'm.author_id', 'm.body', 'm.created_at', knex.raw("(u.first_name || ' ' || u.last_name) as author_name"))
      .where('m.channel_id', channel.id)
      .orderBy('m.created_at', 'asc');
    res.json({ channel_id: channel.id, channel: channel.name, count: messages.length, messages });
  } catch (error) {
    console.error('GET /api/chat/channels/:id/messages failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/chat/channels/:id/messages { author_id?, body } — post a message to a channel.
app.post('/api/chat/channels/:id/messages', authenticate, async (req, res) => {
  const { author_id } = req.body || {};
  const body = sanitizeText(req.body?.body, 2000);
  if (!body) return res.status(400).json({ error: 'body is required' });
  try {
    const channel = await knex('chat_channels').where({ id: req.params.id }).first();
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const [inserted] = await knex('chat_messages').insert({ channel_id: channel.id, author_id: author_id || null, body }).returning('id');
    const id = typeof inserted === 'object' && inserted !== null ? inserted.id : inserted;
    const msg = await knex('chat_messages as m')
      .leftJoin('users as u', 'm.author_id', 'u.id')
      .select('m.id', 'm.channel_id', 'm.author_id', 'm.body', 'm.created_at', knex.raw("(u.first_name || ' ' || u.last_name) as author_name"))
      .where('m.id', id)
      .first();
    res.status(201).json(msg);
  } catch (error) {
    console.error('POST /api/chat/channels/:id/messages failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// ============================================================
// PHASE 7 — AI VOICE (command router)
// Two-stage voice command system adapted from the legacy AI orchestrator:
//   /process  -> rule-based intent parsing of a transcript (no external LLM key)
//   /execute  -> runs the confirmed intent against live data
// ============================================================

const VOICE_ENTITIES = {
  customers: 'customers', leads: 'leads', boutiques: 'boutiques', locations: 'boutiques',
  transfers: 'transfers', alterations: 'alterations', appointments: 'appointments',
  inventory: 'inventory_items', items: 'inventory_items', paystubs: 'paystubs', messages: 'chat_messages',
};

function interpretVoice(transcript) {
  const raw = String(transcript || '');
  const t = raw.toLowerCase();
  const has = (...ws) => ws.some((w) => t.includes(w));
  if (has('clock in', 'clocking in', 'start my shift', 'start shift')) return { intent: 'TIME_CLOCK_ACTION', params: { action: 'in' }, summary: 'Clock in.', requires_confirmation: true };
  if (has('clock out', 'clocking out', 'end my shift', 'end shift')) return { intent: 'TIME_CLOCK_ACTION', params: { action: 'out' }, summary: 'Clock out.', requires_confirmation: true };
  if (has('tell the team', 'broadcast', 'post to general', 'message the team', 'announce', 'let the team know')) {
    const body = raw.replace(/.*(tell the team|broadcast|post to general|message the team|announce that|announce|let the team know that|let the team know)/i, '').trim();
    return { intent: 'BROADCAST_MESSAGE', params: { body: body || raw }, summary: `Post to team chat: "${body || raw}"`, requires_confirmation: true };
  }
  if (has('how many', 'count', 'number of', 'total number')) {
    let entity = 'customers';
    for (const k of Object.keys(VOICE_ENTITIES)) { if (t.includes(k)) { entity = k; break; } }
    return { intent: 'QUERY_DATABASE', params: { entity }, summary: `Count of ${entity}.`, requires_confirmation: false };
  }
  if (has('find', 'look up', 'lookup', 'search', 'do we have', 'in stock', 'inventory')) {
    const q = raw.replace(/.*(find|look up|lookup|search for|search|do we have any|do we have|in stock)/i, '').trim();
    return { intent: 'INVENTORY_LOOKUP', params: { query: q || raw }, summary: `Search inventory for "${q || raw}"`, requires_confirmation: false };
  }
  if (has('schedule', 'appointments today', 'todays appointments', 'who is coming', 'who\'s coming')) return { intent: 'CHECK_SCHEDULE', params: {}, summary: 'Today\'s schedule.', requires_confirmation: false };
  if (has('payroll', 'pay summary', 'hours owed', 'unpaid hours')) return { intent: 'GET_PAYROLL_SUMMARY', params: {}, summary: 'Payroll summary.', requires_confirmation: false };
  if (has('go to', 'open the', 'navigate', 'take me to', 'show me the')) {
    const nav = ['inventory', 'locations', 'payroll', 'chat', 'customers', 'reports', 'calendar', 'dashboard'];
    let target = 'dashboard';
    for (const n of nav) { if (t.includes(n)) { target = n; break; } }
    return { intent: 'NAVIGATE_PAGE', params: { target }, summary: `Navigate to ${target}.`, requires_confirmation: false };
  }
  return { intent: 'UNKNOWN', params: { transcript: raw }, summary: 'Sorry, I did not catch an action there.', requires_confirmation: false };
}

// POST /api/voice/process { transcript, page_context? } — interpret a spoken command into an action plan.
app.post('/api/voice/process', authenticate, async (req, res) => {
  const { transcript } = req.body || {};
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  const plan = interpretVoice(transcript);
  plan.transcript = transcript;
  res.json(plan);
});

// POST /api/voice/execute { intent, params, author_id? } — run the confirmed action plan against live data.
app.post('/api/voice/execute', authenticate, async (req, res) => {
  const { intent, params, author_id } = req.body || {};
  const p = params || {};
  try {
    if (intent === 'TIME_CLOCK_ACTION') {
      if (!author_id) return res.status(400).json({ error: 'author_id (user) required for time clock' });
      if (p.action === 'in') {
        const open = await knex('time_entries').where({ user_id: author_id }).whereNull('clock_out').first();
        if (open) return res.json({ spoken: 'You are already clocked in.', entry: open });
        const user = await knex('users').where({ id: author_id }).first();
        const [ins] = await knex('time_entries').insert({ user_id: author_id, boutique_id: user ? user.boutique_id : null, clock_in: new Date().toISOString(), status: 'Unpaid', approved: false }).returning('id');
        const id = typeof ins === 'object' && ins !== null ? ins.id : ins;
        return res.json({ spoken: 'Clocked in.', entry: await knex('time_entries').where({ id }).first() });
      }
      const open = await knex('time_entries').where({ user_id: author_id }).whereNull('clock_out').orderBy('clock_in', 'desc').first();
      if (!open) return res.json({ spoken: 'You are not currently clocked in.' });
      const hrs = Math.max(0, Math.round(((Date.now() - new Date(open.clock_in).getTime()) / 3600000) * 100) / 100);
      await knex('time_entries').where({ id: open.id }).update({ clock_out: new Date().toISOString(), total_hours: hrs });
      return res.json({ spoken: `Clocked out. Logged ${hrs} hours.`, entry: await knex('time_entries').where({ id: open.id }).first() });
    }

    if (intent === 'QUERY_DATABASE') {
      const table = VOICE_ENTITIES[p.entity] || 'customers';
      const row = await knex(table).count('id as c').first();
      const n = Number((row && row.c) || 0);
      return res.json({ spoken: `You have ${n} ${p.entity || 'records'}.`, entity: p.entity, count: n });
    }

    if (intent === 'INVENTORY_LOOKUP') {
      const terms = String(p.query || '').toLowerCase().split(/\s+/).filter(Boolean);
      const rows = await knex('inventory_variants as v')
        .join('inventory_items as i', 'v.item_id', 'i.id')
        .select('v.id', 'v.sku', 'v.size', 'v.color', 'v.stock_quantity', 'i.vendor_name', 'i.style_number', 'i.category');
      const matches = rows.filter((r) => {
        const hay = `${r.vendor_name} ${r.style_number} ${r.category} ${r.sku} ${r.size} ${r.color}`.toLowerCase();
        return terms.length === 0 || terms.some((term) => hay.includes(term));
      }).slice(0, 20);
      return res.json({ spoken: `Found ${matches.length} matching item(s).`, query: p.query, matches });
    }

    if (intent === 'BROADCAST_MESSAGE') {
      if (!p.body) return res.status(400).json({ error: 'message body required' });
      let channel = await knex('chat_channels').where({ name: 'General' }).first();
      if (!channel) channel = await knex('chat_channels').first();
      if (!channel) return res.status(404).json({ error: 'No chat channel available' });
      const [ins] = await knex('chat_messages').insert({ channel_id: channel.id, author_id: author_id || null, body: p.body }).returning('id');
      const id = typeof ins === 'object' && ins !== null ? ins.id : ins;
      return res.json({ spoken: 'Broadcast posted to the team channel.', message: await knex('chat_messages').where({ id }).first() });
    }

    if (intent === 'CHECK_SCHEDULE') {
      const appts = await knex('appointments as a')
        .leftJoin('customers as c', 'a.customer_id', 'c.id')
        .select('a.id', 'a.time_slot', 'a.type', 'a.consultant_name', 'a.room_name', knex.raw("(c.first_name || ' ' || c.last_name) as customer_name"))
        .orderBy('a.time_slot', 'asc');
      return res.json({ spoken: `There are ${appts.length} appointment(s) on the books.`, appointments: appts });
    }

    if (intent === 'GET_PAYROLL_SUMMARY') {
      const users = await knex('users').select('id', 'hourly_wage');
      let hours = 0; let pay = 0;
      for (const u of users) {
        const agg = await knex('time_entries').where({ user_id: u.id, status: 'Unpaid', approved: true }).sum('total_hours as h').first();
        const h = Number((agg && agg.h) || 0);
        hours += h; pay += h * Number(u.hourly_wage || 0);
      }
      return res.json({ spoken: `There are ${hours.toFixed(2)} approved unpaid hours, about $${pay.toFixed(2)} owed.`, approved_unpaid_hours: Math.round(hours * 100) / 100, estimated_pay: Math.round(pay * 100) / 100 });
    }

    if (intent === 'NAVIGATE_PAGE') {
      return res.json({ spoken: `Opening ${p.target}.`, navigate: p.target });
    }

    return res.json({ spoken: 'I could not perform that action.', intent });
  } catch (error) {
    console.error('POST /api/voice/execute failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/ops/summary — one-call operations KPIs across the phase 2-6 modules (each guarded).
app.get('/api/ops/summary', authenticate, async (req, res) => {
  const summary = { alterations_open: 0, transfers_in_transit: 0, payroll_unpaid_hours: 0, chat_messages: 0 };
  try {
    try { const r = await knex('alterations').whereNot('status', 'Ready for Pickup').count('id as c').first(); summary.alterations_open = Number((r && r.c) || 0); } catch (e) { /* table may be missing */ }
    try { const r = await knex('transfers').where('status', 'In_Transit').count('id as c').first(); summary.transfers_in_transit = Number((r && r.c) || 0); } catch (e) { /* */ }
    try {
      const users = await knex('users').select('id');
      let h = 0;
      for (const u of users) { const a = await knex('time_entries').where({ user_id: u.id, status: 'Unpaid', approved: true }).sum('total_hours as h').first(); h += Number((a && a.h) || 0); }
      summary.payroll_unpaid_hours = Math.round(h * 100) / 100;
    } catch (e) { /* */ }
    try { const r = await knex('chat_messages').count('id as c').first(); summary.chat_messages = Number((r && r.c) || 0); } catch (e) { /* */ }
    res.json(summary);
  } catch (error) {
    console.error('GET /api/ops/summary failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/operations/demo-seed — populate realistic demo data across phases 3-6 (idempotent-ish; skips if data already present).
app.post('/api/operations/demo-seed', seedGuard, async (req, res) => {
  try {
    const result = { alterations: 0, transfers: 0, timecards: 0, messages: 0 };
    const customers = await knex('customers').select('id').limit(8);
    const users = await knex('users').select('id', 'boutique_id').limit(6);
    const boutiques = await knex('boutiques').select('id');
    const now = Date.now();
    const cnt = async (t, q) => Number(((await (q || knex(t)).count('id as c').first()) || {}).c || 0);

    // 1. Alterations spread across kanban lanes
    if ((await cnt('alterations')) < 5 && customers.length) {
      const lanes = ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup'];
      const items = ['Maggie Sottero gown — hem + bustle', 'Vera Wang gown — take in bodice', 'Pronovias gown — strap adjustment', 'Bridesmaid dress — length', 'Mother-of-bride — sleeves', 'Cathedral veil — trim + horsehair'];
      for (let i = 0; i < items.length; i++) {
        await knex('alterations').insert({
          boutique_id: (boutiques[0] || {}).id || null,
          customer_id: customers[i % customers.length].id,
          item_description: items[i],
          status: lanes[i % lanes.length],
          due_date: new Date(now + (i - 1) * 86400000).toISOString().slice(0, 10),
          assigned_seamstress_id: (users[i % users.length] || {}).id || null,
        });
        result.alterations++;
      }
    }

    // 2. Transfers (mix of in-transit + received)
    if ((await cnt('transfers')) < 3 && boutiques.length >= 2) {
      const variants = await knex('inventory_variants').where('stock_quantity', '>', 1).select('id').limit(3);
      for (let i = 0; i < variants.length; i++) {
        const status = i === 0 ? 'In_Transit' : 'Received';
        await knex('transfers').insert({
          from_boutique_id: boutiques[0].id, to_boutique_id: boutiques[1].id,
          inventory_variant_id: variants[i].id, qty: 1, status,
          received_at: status === 'Received' ? new Date().toISOString() : null,
        });
        result.transfers++;
      }
    }

    // 3. Timecards — approved, unpaid, with real hours (makes payroll KPI/insight meaningful)
    let unpaid = 0;
    for (const u of users) { const a = await knex('time_entries').where({ user_id: u.id, status: 'Unpaid', approved: true }).sum('total_hours as h').first(); unpaid += Number((a && a.h) || 0); }
    if (unpaid === 0 && users.length) {
      for (let i = 0; i < Math.min(3, users.length); i++) {
        const inT = new Date(now - (6 + i) * 3600000);
        const outT = new Date(now - i * 3600000);
        const hrs = Math.round(((outT.getTime() - inT.getTime()) / 3600000) * 100) / 100;
        await knex('time_entries').insert({ user_id: users[i].id, boutique_id: users[i].boutique_id, clock_in: inT.toISOString(), clock_out: outT.toISOString(), total_hours: hrs, approved: true, status: 'Unpaid' });
        result.timecards++;
      }
    }

    // 4. Team chat — a Floor Ops channel with a few messages
    let floor = await knex('chat_channels').where({ name: 'Floor Ops' }).first();
    if (!floor) { const [id] = await knex('chat_channels').insert({ name: 'Floor Ops' }).returning('id'); floor = { id: typeof id === 'object' && id !== null ? id.id : id }; }
    if ((await cnt('chat_messages', knex('chat_messages').where({ channel_id: floor.id }))) < 2 && users.length) {
      const msgs = ['Covington is slammed this afternoon — extra hands welcome.', '2 gowns arrived for QA, tagging them now.', 'Reminder: Saturday trunk-show setup at 8am.'];
      for (let i = 0; i < msgs.length; i++) { await knex('chat_messages').insert({ channel_id: floor.id, author_id: users[i % users.length].id, body: msgs[i] }); result.messages++; }
    }

    res.json({ message: 'Demo operations data seeded.', seeded: result });
  } catch (error) {
    console.error('POST /api/operations/demo-seed failed:', error);
    res.status(500).json({ error: safeError(error) });
  }
});

// ============================================================
// PATCH 03 — financial-ledger
// ============================================================
app.get('/api/reports/financials-ledger', authenticate, async (req, res) => {
  try {
    let q = knex('ledger_entries')
      .leftJoin('boutiques', 'ledger_entries.boutique_id', '=', 'boutiques.id')
      .select('ledger_entries.*', 'boutiques.name as boutique_name')
      .orderBy('ledger_entries.entry_date', 'desc');
    const boutiqueId = resolveBoutiqueScope(req);
    if (boutiqueId) q = q.where('ledger_entries.boutique_id', boutiqueId);
    const rows = await q;
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 04 — bookings-cancellations-transfers
// ============================================================
app.get('/api/reports/bookings', authenticate, async (req, res) => {
  try {
    const rows = await knex('appointments')
      .join('customers', 'appointments.customer_id', '=', 'customers.id')
      .leftJoin('booking_events', 'booking_events.appointment_id', '=', 'appointments.id')
      .select(
        'appointments.*',
        knex.raw("customers.first_name || ' ' || customers.last_name as customer_name"),
        knex.raw('COUNT(booking_events.id) as event_count')
      )
      .groupBy('appointments.id', 'customers.first_name', 'customers.last_name')
      .orderBy('appointments.created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/reports/cancellations', authenticate, async (req, res) => {
  try {
    const rows = await knex('appointments')
      .join('customers', 'appointments.customer_id', '=', 'customers.id')
      .whereIn('appointments.id', function() {
        this.select('appointment_id').from('booking_events').where('event_type', 'cancelled');
      })
      .select(
        'appointments.*',
        knex.raw("customers.first_name || ' ' || customers.last_name as customer_name")
      )
      .orderBy('appointments.created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 05 — did-not-buy
// ============================================================
app.get('/api/reports/did-not-buy', authenticate, async (req, res) => {
  try {
    const rows = await knex('did_not_buy')
      .join('customers', 'did_not_buy.customer_id', '=', 'customers.id')
      .select('did_not_buy.*', knex.raw("customers.first_name || ' ' || customers.last_name as customer_name"), 'customers.email', 'customers.phone')
      .orderBy('did_not_buy.created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 06 — open-orders-expected-deliveries
// ============================================================
app.get('/api/reports/open-orders', authenticate, async (req, res) => {
  try {
    const rows = await knex('purchase_orders')
      .leftJoin('boutiques', 'purchase_orders.boutique_id', '=', 'boutiques.id')
      .whereNot('purchase_orders.status', 'received')
      .select('purchase_orders.*', 'boutiques.name as boutique_name')
      .orderBy('purchase_orders.created_at', 'asc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/reports/expected-deliveries', authenticate, async (req, res) => {
  try {
    const rows = await knex('purchase_orders')
      .leftJoin('boutiques', 'purchase_orders.boutique_id', '=', 'boutiques.id')
      .whereNot('purchase_orders.status', 'received')
      .select('purchase_orders.*', 'boutiques.name as boutique_name', 'purchase_orders.expected_delivery_date')
      .orderBy('purchase_orders.created_at', 'asc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 08 — booking-foundation
// ============================================================
const BOOKING_TYPES = ['bridal', 'bridesmaid', 'mother', 'flower_girl'];
app.post('/api/bookings', authenticate, async (req, res) => {
  try {
    const { customer_id, boutique_id, appointment_id, booking_type, status } = req.body;
    const notes = sanitizeText(req.body?.notes);
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });
    if (!booking_type || !BOOKING_TYPES.includes(booking_type)) {
      return res.status(400).json({ error: `booking_type must be one of: ${BOOKING_TYPES.join(', ')}` });
    }
    const safeStatus = BOOKING_STATUSES.includes(status) ? status : 'pending';
    const [id] = await knex('bookings').insert({ customer_id, boutique_id, appointment_id, booking_type, status: safeStatus, notes }).returning('id');
    const realId = typeof id === 'object' && id !== null ? id.id : id;
    const booking = await knex('bookings').where({ id: realId }).first();
    res.status(201).json(booking);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/bookings/availability', authenticate, async (req, res) => {
  // Patch 09 — calendar-availability
  try {
    const { boutique_id } = req.query;
    let q = knex('appointments').select('time_slot');
    if (boutique_id) q = q.where('boutique_id', boutique_id);
    const booked = await q;
    const bookedSlots = new Set(booked.map(r => (r.time_slot || '').slice(0, 5)));
    const slots = [];
    for (let h = 10; h <= 17; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      slots.push({ time, available: !bookedSlots.has(time) });
    }
    res.json({ slots });
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/bookings/slot-rank', authenticate, async (req, res) => {
  // Patch 15 — slot-ranker
  try {
    const { boutique_id } = req.query;
    let q = knex('appointments').select('time_slot');
    if (boutique_id) q = q.where('boutique_id', boutique_id);
    const booked = await q;
    const counts = {};
    for (let h = 10; h <= 17; h++) counts[`${String(h).padStart(2,'0')}:00`] = 0;
    for (const r of booked) {
      const t = (r.time_slot || '').slice(0, 5);
      if (counts[t] !== undefined) counts[t]++;
    }
    const entries = Object.entries(counts).map(([time, score]) => ({ time, score }));
    entries.sort((a, b) => a.score - b.score);
    const topThree = new Set(entries.slice(0, 3).map(e => e.time));
    const slots = entries.map(e => ({ time: e.time, score: e.score, recommended: topThree.has(e.time) }));
    res.json(slots);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/bookings', authenticate, async (req, res) => {
  try {
    let q = knex('bookings').select('id', 'customer_id', 'boutique_id', 'appointment_id', 'booking_type', 'status', 'notes', 'created_at', 'updated_at');
    const boutiqueScope = resolveBoutiqueScope(req);
    if (boutiqueScope) q = q.where('boutique_id', boutiqueScope);
    if (req.query.status) q = q.where('status', req.query.status);
    const rows = await q.orderBy('created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.get('/api/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await knex('bookings').where({ id: req.params.id }).first();
    if (!booking) return res.status(404).json({ error: 'Not found' });
    res.json(booking);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.patch('/api/bookings/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', valid: BOOKING_STATUSES });
    }
    const existing = await knex('bookings').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    await knex('bookings').where({ id: existing.id }).update({ status, updated_at: new Date().toISOString() });
    const booking = await knex('bookings').where({ id: existing.id }).first();
    res.json(booking);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 10 — booking-fee-payments
// ============================================================
app.post('/api/bookings/:id/fee', authenticate, async (req, res) => {
  try {
    // QRCode hoisted to top-level
    const amount_cents = Number(req.body.amount_cents);
    if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
      return res.status(400).json({ error: 'amount_cents must be a positive integer' });
    }
    const booking = await knex('bookings').where({ id: req.params.id }).first();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const stripe_session_id = 'stub_' + Date.now();
    const stubUrl = `https://vowos.app/booking-fee/${req.params.id}?session=${stripe_session_id}`;
    // Stub Stripe — wire real Stripe checkout when STRIPE_SECRET_KEY is live
    const qr_code_data_url = await QRCode.toDataURL(stubUrl);
    const [id] = await knex('booking_fees').insert({
      booking_id: req.params.id,
      amount_cents: amount_cents || 0,
      status: 'pending',
      stripe_session_id,
      qr_code_data_url,
    }).returning('id');
    const realId = typeof id === 'object' && id !== null ? id.id : id;
    const fee = await knex('booking_fees').where({ id: realId }).first();
    res.status(201).json(fee);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 11 — communication-scheduler
// ============================================================
app.get('/api/follow-ups', authenticate, async (req, res) => {
  try {
    const rows = await knex('follow_ups')
      .join('customers', 'follow_ups.customer_id', '=', 'customers.id')
      .select('follow_ups.*', knex.raw("customers.first_name || ' ' || customers.last_name as customer_name"), 'customers.phone', 'customers.email')
      .orderBy('follow_ups.scheduled_at', 'asc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.post('/api/follow-ups', authenticate, async (req, res) => {
  try {
    const { customer_id, booking_id, appointment_id, scheduled_at } = req.body;
    const message_template = sanitizeText(req.body?.message_template, 1000);
    const [id] = await knex('follow_ups').insert({ customer_id, booking_id, appointment_id, message_template, scheduled_at, status: 'pending' }).returning('id');
    const realId = typeof id === 'object' && id !== null ? id.id : id;
    const row = await knex('follow_ups').where({ id: realId }).first();
    res.status(201).json(row);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

app.post('/api/follow-ups/:id/send', authenticate, async (req, res) => {
  try {
    // Twilio sendFn stub — wire real credentials to send SMS
    await knex('follow_ups').where({ id: req.params.id }).update({ sent_at: new Date().toISOString(), status: 'sent' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// ============================================================
// PATCH 12 — inbound-sms (NO auth — Twilio webhook)
// ============================================================
app.post('/api/webhooks/sms', express.urlencoded({ extended: false }), (req, res) => {
  if (process.env.TWILIO_AUTH_TOKEN) {
    const twilioSig = req.headers['x-twilio-signature'] || '';
    // Behind a TLS-terminating proxy req.protocol is always 'http'; use the
    // configured public URL or fall back to X-Forwarded-Proto so the URL
    // matches what Twilio actually signed.
    const proto = process.env.PUBLIC_URL
      ? new URL(process.env.PUBLIC_URL).protocol.replace(':', '')
      : (req.headers['x-forwarded-proto'] || req.protocol);
    const host = process.env.PUBLIC_URL
      ? new URL(process.env.PUBLIC_URL).host
      : req.get('host');
    const url = `${proto}://${host}${req.originalUrl}`;
    const valid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSig,
      url,
      req.body || {}
    );
    if (!valid) {
      console.warn('[Twilio SMS] Rejected — invalid signature');
      return res.status(403).send('Forbidden');
    }
  }
  console.log('[Twilio Inbound SMS]', req.body);
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// ============================================================
// PATCH 14 — transfer-ledger
// ============================================================
app.get('/api/reports/transfers', authenticate, async (req, res) => {
  try {
    const rows = await knex('transfers')
      .leftJoin('boutiques as src', 'transfers.from_boutique_id', '=', 'src.id')
      .leftJoin('boutiques as dst', 'transfers.to_boutique_id', '=', 'dst.id')
      .select(
        'transfers.*',
        'src.name as from_boutique_name',
        'dst.name as to_boutique_name'
      )
      .orderBy('transfers.created_at', 'desc');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: safeError(e) }); }
});

// Global error handler — catches anything thrown from async routes not
// caught by per-route try/catch.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: safeError(err) });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server successfully listening on port ${PORT}`);
  });
}

module.exports = { app, knex };
