// Patch 04 — bookings-cancellations-transfers
exports.up = async function(knex) {
  await knex.schema.createTable('booking_events', (t) => {
    t.increments('id').primary();
    t.integer('appointment_id').references('id').inTable('appointments').onDelete('CASCADE');
    t.enu('event_type', ['booked', 'cancelled', 'transferred']).notNullable();
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.integer('created_by_user_id').references('id').inTable('users').onDelete('SET NULL').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('booking_events');
};
