/**
 * Performance indexes on the most-queried columns.
 * Every paginated list endpoint filters by boutique_id; FK columns used in
 * JOINs and status/email lookups are also covered.
 */
exports.up = async function (knex) {
  // ── boutique_id (most common filter across all tenant-scoped queries) ──
  await knex.schema.table('customers',       t => t.index('boutique_id'));
  await knex.schema.table('leads',           t => t.index('boutique_id'));
  await knex.schema.table('inventory_items', t => t.index('boutique_id'));
  await knex.schema.table('invoices',        t => t.index('boutique_id'));
  await knex.schema.table('purchase_orders', t => t.index('boutique_id'));
  await knex.schema.table('pickups',         t => t.index('boutique_id'));
  await knex.schema.table('appointments',    t => t.index('boutique_id'));
  await knex.schema.table('alterations',     t => t.index('boutique_id'));
  await knex.schema.table('time_entries',    t => t.index('boutique_id'));
  await knex.schema.table('chat_channels',   t => t.index('boutique_id'));
  await knex.schema.table('bookings',        t => t.index('boutique_id'));
  await knex.schema.table('ledger_entries',  t => t.index('boutique_id'));

  // transfers uses from_boutique_id / to_boutique_id instead
  await knex.schema.table('transfers', t => {
    t.index('from_boutique_id');
    t.index('to_boutique_id');
  });

  // ── customer_id FK (used in joins) ──
  await knex.schema.table('invoices',        t => t.index('customer_id'));
  await knex.schema.table('purchase_orders', t => t.index('customer_id'));
  await knex.schema.table('pickups',         t => t.index('customer_id'));
  await knex.schema.table('appointments',    t => t.index('customer_id'));
  await knex.schema.table('alterations',     t => t.index('customer_id'));
  await knex.schema.table('bookings',        t => t.index('customer_id'));
  await knex.schema.table('did_not_buy',     t => t.index('customer_id'));
  await knex.schema.table('follow_ups',      t => t.index('customer_id'));

  // ── status (common WHERE clause on list endpoints) ──
  await knex.schema.table('invoices',        t => t.index('status'));
  await knex.schema.table('purchase_orders', t => t.index('status'));
  await knex.schema.table('alterations',     t => t.index('status'));
  await knex.schema.table('transfers',       t => t.index('status'));
  await knex.schema.table('follow_ups',      t => t.index('status'));

  // ── email (login lookup + customer/lead search) ──
  await knex.schema.table('users', t => t.index('email'));
  await knex.schema.table('leads', t => t.index('email'));

  // ── created_at (ORDER BY in paginated queries) ──
  await knex.schema.table('customers',       t => t.index('created_at'));
  await knex.schema.table('invoices',        t => t.index('created_at'));
  await knex.schema.table('purchase_orders', t => t.index('created_at'));
  await knex.schema.table('leads',           t => t.index('created_at'));

  // ── FK indexes ──
  await knex.schema.table('payments',           t => t.index('invoice_id'));
  await knex.schema.table('time_entries',       t => t.index('user_id'));
  await knex.schema.table('paystubs',           t => t.index('user_id'));
  await knex.schema.table('inventory_variants', t => t.index('item_id'));
};

exports.down = async function (knex) {
  await knex.schema.table('customers',          t => { t.dropIndex('boutique_id'); t.dropIndex('created_at'); });
  await knex.schema.table('leads',              t => { t.dropIndex('boutique_id'); t.dropIndex('email'); t.dropIndex('created_at'); });
  await knex.schema.table('inventory_items',    t => t.dropIndex('boutique_id'));
  await knex.schema.table('invoices',           t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); t.dropIndex('status'); t.dropIndex('created_at'); });
  await knex.schema.table('purchase_orders',    t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); t.dropIndex('status'); t.dropIndex('created_at'); });
  await knex.schema.table('pickups',            t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('appointments',       t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('alterations',        t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); t.dropIndex('status'); });
  await knex.schema.table('transfers',          t => { t.dropIndex('from_boutique_id'); t.dropIndex('to_boutique_id'); t.dropIndex('status'); });
  await knex.schema.table('time_entries',       t => { t.dropIndex('boutique_id'); t.dropIndex('user_id'); });
  await knex.schema.table('chat_channels',      t => t.dropIndex('boutique_id'));
  await knex.schema.table('bookings',           t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('did_not_buy',        t => t.dropIndex('customer_id'));
  await knex.schema.table('follow_ups',         t => { t.dropIndex('customer_id'); t.dropIndex('status'); });
  await knex.schema.table('ledger_entries',     t => t.dropIndex('boutique_id'));
  await knex.schema.table('users',              t => t.dropIndex('email'));
  await knex.schema.table('payments',           t => t.dropIndex('invoice_id'));
  await knex.schema.table('paystubs',           t => t.dropIndex('user_id'));
  await knex.schema.table('inventory_variants', t => t.dropIndex('item_id'));
};
