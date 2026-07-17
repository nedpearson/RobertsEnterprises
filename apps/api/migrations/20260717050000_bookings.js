// Patch 08 — booking-foundation
exports.up = async function(knex) {
  await knex.schema.createTable('bookings', (t) => {
    t.increments('id').primary();
    t.integer('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    t.integer('boutique_id').references('id').inTable('boutiques').onDelete('SET NULL').nullable();
    t.integer('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    t.string('booking_type').notNullable(); // bridal, bridesmaid, mother, flower_girl
    t.string('status').notNullable().defaultTo('pending'); // pending, confirmed, completed, cancelled
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('bookings');
};
