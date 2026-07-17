/**
 * Demo seed — idempotent baseline data.
 * Run: npx knex seed:run --knexfile knexfile.js
 * Skips inserts when rows already exist.
 */
const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // ── Boutique ───────────────────────────────────────────────
  let boutique = await knex('boutiques').first();
  if (!boutique) {
    const [row] = await knex('boutiques')
      .insert({ name: "Roberts Enterprises — Baton Rouge" })
      .returning('id');
    const id = typeof row === 'object' ? row.id : row;
    boutique = { id };
  }

  // ── Users ─────────────────────────────────────────────────
  const ownerEmail = 'owner@vowos.demo';
  if (!(await knex('users').where({ email: ownerEmail }).first())) {
    await knex('users').insert({
      boutique_id: boutique.id,
      first_name: 'Roberts',
      last_name: 'Owner',
      email: ownerEmail,
      role: 'owner',
      password_hash: await bcrypt.hash('demo1234', 10),
      hourly_wage: 0,
    });
  }

  const consultantEmail = 'jessica@vowos.demo';
  if (!(await knex('users').where({ email: consultantEmail }).first())) {
    await knex('users').insert({
      boutique_id: boutique.id,
      first_name: 'Jessica',
      last_name: 'Stylist',
      email: consultantEmail,
      role: 'consultant',
      password_hash: await bcrypt.hash('demo1234', 10),
      hourly_wage: 18.50,
    });
  }

  // ── Customers ─────────────────────────────────────────────
  const customerEmail = 'bride@vowos.demo';
  let customer = await knex('customers').where({ email: customerEmail }).first();
  if (!customer) {
    const [row] = await knex('customers')
      .insert({
        boutique_id: boutique.id,
        first_name: 'Emma',
        last_name: 'Johnson',
        email: customerEmail,
        phone: '+15551234567',
      })
      .returning('id');
    const id = typeof row === 'object' ? row.id : row;
    customer = { id };
  }

  // ── Inventory ──────────────────────────────────────────────
  if (!(await knex('inventory_items').first())) {
    const [i1] = await knex('inventory_items')
      .insert({ boutique_id: boutique.id, vendor_name: 'Maggie Sottero', style_number: 'MS-891', category: 'Bridal Gown', base_price_cents: 180000 })
      .returning('id');
    const id1 = typeof i1 === 'object' ? i1.id : i1;
    await knex('inventory_variants').insert([
      { item_id: id1, size: '8',  color: 'Ivory',        sku: 'MS-891-8-IVY',  stock_quantity: 1 },
      { item_id: id1, size: '12', color: 'Ivory',        sku: 'MS-891-12-IVY', stock_quantity: 1 },
    ]);

    const [i2] = await knex('inventory_items')
      .insert({ boutique_id: boutique.id, vendor_name: 'Vera Wang', style_number: 'VW-LUNA', category: 'Bridal Gown', base_price_cents: 450000 })
      .returning('id');
    const id2 = typeof i2 === 'object' ? i2.id : i2;
    await knex('inventory_variants').insert([
      { item_id: id2, size: '10', color: 'Diamond White', sku: 'VW-LUNA-10-DW', stock_quantity: 2 },
    ]);
  }

  // ── Invoice ───────────────────────────────────────────────
  if (!(await knex('invoices').first())) {
    await knex('invoices').insert({
      boutique_id: boutique.id,
      customer_id: customer.id,
      total_amount_cents: 450000,
      total_paid_cents: 0,
      balance_due_cents: 450000,
      status: 'unpaid',
    });
  }

  // ── Purchase order ────────────────────────────────────────
  if (!(await knex('purchase_orders').first())) {
    const ship = new Date();
    ship.setMonth(ship.getMonth() + 4);
    const shipStr = ship.toISOString().split('T')[0];
    await knex('purchase_orders').insert({
      boutique_id: boutique.id,
      customer_id: customer.id,
      vendor_name: 'Vera Wang',
      style_number: 'VW-Luna',
      size: '10',
      size_category: 'Standard',
      expected_ship_date: shipStr,
      expected_delivery_date: shipStr,
      status: 'Submitted',
    });
  }

  // ── Appointment ───────────────────────────────────────────
  if (!(await knex('appointments').first())) {
    await knex('appointments').insert({
      boutique_id: boutique.id,
      customer_id: customer.id,
      time_slot: '10:00 AM',
      type: 'First View',
      consultant_name: 'Jessica Stylist',
      room_name: 'Suite A',
    });
  }

  // ── Chat channel ─────────────────────────────────────────
  if (!(await knex('chat_channels').where({ name: 'General' }).first())) {
    await knex('chat_channels').insert({ boutique_id: boutique.id, name: 'General' });
  }
};
