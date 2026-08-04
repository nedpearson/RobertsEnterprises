// Phase 6 — Performance Optimization: Create database indices for foreign keys
exports.up = async function(knex) {
  await knex.schema.table('users', t => { t.index('boutique_id'); });
  await knex.schema.table('inventory_variants', t => { t.index('item_id'); });
  await knex.schema.table('invoices', t => { t.index('boutique_id'); t.index('customer_id'); });
  await knex.schema.table('payments', t => { t.index('invoice_id'); });
  await knex.schema.table('purchase_orders', t => { t.index('boutique_id'); t.index('customer_id'); });
  await knex.schema.table('pickups', t => { t.index('boutique_id'); t.index('customer_id'); });
  await knex.schema.table('appointments', t => { t.index('boutique_id'); t.index('customer_id'); });
  await knex.schema.table('alterations', t => { t.index('boutique_id'); t.index('customer_id'); t.index('assigned_seamstress_id'); });
  await knex.schema.table('transfers', t => {
    t.index('from_boutique_id');
    t.index('to_boutique_id');
    t.index('inventory_variant_id');
    t.index('ledger_entry_id');
    t.index('created_by');
    t.index('received_by');
  });
  await knex.schema.table('time_entries', t => { t.index('user_id'); t.index('boutique_id'); });
  await knex.schema.table('paystubs', t => { t.index('user_id'); t.index('boutique_id'); });
  await knex.schema.table('chat_channels', t => { t.index('boutique_id'); });
  await knex.schema.table('chat_messages', t => { t.index('channel_id'); t.index('author_id'); });
  await knex.schema.table('ledger_entries', t => { t.index('boutique_id'); t.index('invoice_id'); });
  await knex.schema.table('booking_events', t => { t.index('appointment_id'); t.index('created_by_user_id'); });
  await knex.schema.table('did_not_buy', t => { t.index('customer_id'); t.index('appointment_id'); t.index('created_by_user_id'); });
  await knex.schema.table('bookings', t => { t.index('customer_id'); t.index('boutique_id'); t.index('appointment_id'); });
  await knex.schema.table('booking_fees', t => { t.index('booking_id'); });
  await knex.schema.table('follow_ups', t => { t.index('customer_id'); t.index('booking_id'); t.index('appointment_id'); });
};

exports.down = async function(knex) {
  await knex.schema.table('users', t => { t.dropIndex('boutique_id'); });
  await knex.schema.table('inventory_variants', t => { t.dropIndex('item_id'); });
  await knex.schema.table('invoices', t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('payments', t => { t.dropIndex('invoice_id'); });
  await knex.schema.table('purchase_orders', t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('pickups', t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('appointments', t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); });
  await knex.schema.table('alterations', t => { t.dropIndex('boutique_id'); t.dropIndex('customer_id'); t.dropIndex('assigned_seamstress_id'); });
  await knex.schema.table('transfers', t => {
    t.dropIndex('from_boutique_id');
    t.dropIndex('to_boutique_id');
    t.dropIndex('inventory_variant_id');
    t.dropIndex('ledger_entry_id');
    t.dropIndex('created_by');
    t.dropIndex('received_by');
  });
  await knex.schema.table('time_entries', t => { t.dropIndex('user_id'); t.dropIndex('boutique_id'); });
  await knex.schema.table('paystubs', t => { t.dropIndex('user_id'); t.dropIndex('boutique_id'); });
  await knex.schema.table('chat_channels', t => { t.dropIndex('boutique_id'); });
  await knex.schema.table('chat_messages', t => { t.dropIndex('channel_id'); t.dropIndex('author_id'); });
  await knex.schema.table('ledger_entries', t => { t.dropIndex('boutique_id'); t.dropIndex('invoice_id'); });
  await knex.schema.table('booking_events', t => { t.dropIndex('appointment_id'); t.dropIndex('created_by_user_id'); });
  await knex.schema.table('did_not_buy', t => { t.dropIndex('customer_id'); t.dropIndex('appointment_id'); t.dropIndex('created_by_user_id'); });
  await knex.schema.table('bookings', t => { t.dropIndex('customer_id'); t.dropIndex('boutique_id'); t.dropIndex('appointment_id'); });
  await knex.schema.table('booking_fees', t => { t.dropIndex('booking_id'); });
  await knex.schema.table('follow_ups', t => { t.dropIndex('customer_id'); t.dropIndex('booking_id'); t.dropIndex('appointment_id'); });
};
