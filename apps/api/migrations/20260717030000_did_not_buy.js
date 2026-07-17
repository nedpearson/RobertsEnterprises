// Patch 05 — did-not-buy
exports.up = async function(knex) {
  await knex.schema.createTable('did_not_buy', (t) => {
    t.increments('id').primary();
    t.integer('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    t.integer('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    t.string('reason');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.integer('created_by_user_id').references('id').inTable('users').onDelete('SET NULL').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('did_not_buy');
};
