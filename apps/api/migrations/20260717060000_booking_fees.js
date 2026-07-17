// Patch 10 — booking-fee-payments
exports.up = async function(knex) {
  await knex.schema.createTable('booking_fees', (t) => {
    t.increments('id').primary();
    t.integer('booking_id').references('id').inTable('bookings').onDelete('CASCADE');
    t.integer('amount_cents').notNullable().defaultTo(0);
    t.string('status').notNullable().defaultTo('pending'); // pending, paid, refunded
    t.string('stripe_session_id').nullable();
    t.text('qr_code_data_url').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('booking_fees');
};
