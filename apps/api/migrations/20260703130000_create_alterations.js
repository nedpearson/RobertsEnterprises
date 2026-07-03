/**
 * Phase 3 — Alterations workflow.
 * Kanban-style alteration tickets (Awaiting 1st Fitting -> Pinned -> Sewing ->
 * Steaming -> Ready for Pickup), scoped to a boutique/location and linked to a
 * customer and (optionally) an assigned seamstress (users table).
 */
exports.up = function (knex) {
  return knex.schema.createTable('alterations', (table) => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
    table.integer('assigned_seamstress_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('item_description').notNullable();
    table.string('status').notNullable().defaultTo('Awaiting 1st Fitting'); // Pinned, Sewing, Steaming, Ready for Pickup
    table.date('due_date');
    table.text('notes');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alterations');
};
