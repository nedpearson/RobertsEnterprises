/**
 * Phase 4 — Inter-location transfers.
 * Moves inventory between boutiques/locations (e.g. Baton Rouge <-> Covington).
 * Workflow: In_Transit -> Received. Source stock is deducted when a transfer is
 * initiated and credited back when it is received at the destination.
 */
exports.up = function (knex) {
  return knex.schema.createTable('transfers', (t) => {
    t.increments('id').primary();
    t.integer('from_boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    t.integer('to_boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    t.integer('inventory_variant_id').unsigned().references('id').inTable('inventory_variants').onDelete('SET NULL');
    t.integer('qty').notNullable().defaultTo(1);
    t.string('status').notNullable().defaultTo('In_Transit'); // Received
    t.text('notes');
    t.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.integer('received_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('received_at');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transfers');
};
