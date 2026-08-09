/**
 * Performance indexes on the most-queried columns.
 * Modified to be idempotent (ignore 'already exists' errors) to prevent migration failures.
 */

async function addIndexSafe(knex, tableName, columnName) {
  try {
    await knex.schema.alterTable(tableName, t => {
      t.index(columnName);
    });
  } catch (err) {
    // Ignore errors about the relation already existing
    if (!err.message.includes('already exists') && !err.message.includes('Duplicate key name')) {
      throw err;
    }
  }
}

async function addIndexSafeArray(knex, tableName, columns) {
  for (const col of columns) {
    await addIndexSafe(knex, tableName, col);
  }
}

exports.up = async function (knex) {
  // ── boutique_id (most common filter across all tenant-scoped queries) ──
  await addIndexSafe(knex, 'customers', 'boutique_id');
  await addIndexSafe(knex, 'leads', 'boutique_id');
  await addIndexSafe(knex, 'inventory_items', 'boutique_id');
  await addIndexSafe(knex, 'invoices', 'boutique_id');
  await addIndexSafe(knex, 'purchase_orders', 'boutique_id');
  await addIndexSafe(knex, 'pickups', 'boutique_id');
  await addIndexSafe(knex, 'appointments', 'boutique_id');
  await addIndexSafe(knex, 'alterations', 'boutique_id');
  await addIndexSafe(knex, 'time_entries', 'boutique_id');
  await addIndexSafe(knex, 'chat_channels', 'boutique_id');
  await addIndexSafe(knex, 'bookings', 'boutique_id');
  await addIndexSafe(knex, 'ledger_entries', 'boutique_id');

  // transfers uses from_boutique_id / to_boutique_id instead
  await addIndexSafe(knex, 'transfers', 'from_boutique_id');
  await addIndexSafe(knex, 'transfers', 'to_boutique_id');

  // ── customer_id FK (used in joins) ──
  await addIndexSafe(knex, 'invoices', 'customer_id');
  await addIndexSafe(knex, 'purchase_orders', 'customer_id');
  await addIndexSafe(knex, 'pickups', 'customer_id');
  await addIndexSafe(knex, 'appointments', 'customer_id');
  await addIndexSafe(knex, 'alterations', 'customer_id');
  await addIndexSafe(knex, 'bookings', 'customer_id');
  await addIndexSafe(knex, 'did_not_buy', 'customer_id');
  await addIndexSafe(knex, 'follow_ups', 'customer_id');

  // ── status (common WHERE clause on list endpoints) ──
  await addIndexSafe(knex, 'invoices', 'status');
  await addIndexSafe(knex, 'purchase_orders', 'status');
  await addIndexSafe(knex, 'alterations', 'status');
  await addIndexSafe(knex, 'transfers', 'status');
  await addIndexSafe(knex, 'follow_ups', 'status');

  // ── email (login lookup + customer/lead search) ──
  await addIndexSafe(knex, 'users', 'email');
  await addIndexSafe(knex, 'leads', 'email');

  // ── created_at (ORDER BY in paginated queries) ──
  await addIndexSafe(knex, 'customers', 'created_at');
  await addIndexSafe(knex, 'invoices', 'created_at');
  await addIndexSafe(knex, 'purchase_orders', 'created_at');
  await addIndexSafe(knex, 'leads', 'created_at');

  // ── FK indexes ──
  await addIndexSafe(knex, 'payments', 'invoice_id');
  await addIndexSafe(knex, 'time_entries', 'user_id');
  await addIndexSafe(knex, 'paystubs', 'user_id');
  await addIndexSafe(knex, 'inventory_variants', 'item_id');
};

async function dropIndexSafe(knex, tableName, columnName) {
  try {
    await knex.schema.alterTable(tableName, t => {
      t.dropIndex(columnName);
    });
  } catch (err) {
    // Ignore errors if the index doesn't exist
    if (!err.message.includes('does not exist')) {
      throw err;
    }
  }
}

exports.down = async function (knex) {
  await dropIndexSafe(knex, 'customers', 'boutique_id');
  await dropIndexSafe(knex, 'customers', 'created_at');
  await dropIndexSafe(knex, 'leads', 'boutique_id');
  await dropIndexSafe(knex, 'leads', 'email');
  await dropIndexSafe(knex, 'leads', 'created_at');
  await dropIndexSafe(knex, 'inventory_items', 'boutique_id');
  await dropIndexSafe(knex, 'invoices', 'boutique_id');
  await dropIndexSafe(knex, 'invoices', 'customer_id');
  await dropIndexSafe(knex, 'invoices', 'status');
  await dropIndexSafe(knex, 'invoices', 'created_at');
  await dropIndexSafe(knex, 'purchase_orders', 'boutique_id');
  await dropIndexSafe(knex, 'purchase_orders', 'customer_id');
  await dropIndexSafe(knex, 'purchase_orders', 'status');
  await dropIndexSafe(knex, 'purchase_orders', 'created_at');
  await dropIndexSafe(knex, 'pickups', 'boutique_id');
  await dropIndexSafe(knex, 'pickups', 'customer_id');
  await dropIndexSafe(knex, 'appointments', 'boutique_id');
  await dropIndexSafe(knex, 'appointments', 'customer_id');
  await dropIndexSafe(knex, 'alterations', 'boutique_id');
  await dropIndexSafe(knex, 'alterations', 'customer_id');
  await dropIndexSafe(knex, 'alterations', 'status');
  await dropIndexSafe(knex, 'transfers', 'from_boutique_id');
  await dropIndexSafe(knex, 'transfers', 'to_boutique_id');
  await dropIndexSafe(knex, 'transfers', 'status');
  await dropIndexSafe(knex, 'time_entries', 'boutique_id');
  await dropIndexSafe(knex, 'time_entries', 'user_id');
  await dropIndexSafe(knex, 'chat_channels', 'boutique_id');
  await dropIndexSafe(knex, 'bookings', 'boutique_id');
  await dropIndexSafe(knex, 'bookings', 'customer_id');
  await dropIndexSafe(knex, 'did_not_buy', 'customer_id');
  await dropIndexSafe(knex, 'follow_ups', 'customer_id');
  await dropIndexSafe(knex, 'follow_ups', 'status');
  await dropIndexSafe(knex, 'ledger_entries', 'boutique_id');
  await dropIndexSafe(knex, 'users', 'email');
  await dropIndexSafe(knex, 'payments', 'invoice_id');
  await dropIndexSafe(knex, 'paystubs', 'user_id');
  await dropIndexSafe(knex, 'inventory_variants', 'item_id');
};
