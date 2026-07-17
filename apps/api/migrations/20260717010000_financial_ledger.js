// Patch 03 — financial-ledger
exports.up = async function(knex) {
  await knex.schema.createTable('ledger_entries', (t) => {
    t.increments('id').primary();
    t.integer('boutique_id').references('id').inTable('boutiques').onDelete('SET NULL');
    t.date('entry_date').notNullable();
    t.string('category').notNullable();
    t.text('description');
    t.integer('amount_cents').notNullable().defaultTo(0);
    t.integer('invoice_id').references('id').inTable('invoices').onDelete('SET NULL').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ledger_entries');
};
