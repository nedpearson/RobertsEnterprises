// Patch 11 — communication-scheduler
exports.up = async function(knex) {
  await knex.schema.createTable('follow_ups', (t) => {
    t.increments('id').primary();
    t.integer('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    t.integer('booking_id').references('id').inTable('bookings').onDelete('SET NULL').nullable();
    t.integer('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    t.text('message_template');
    t.datetime('scheduled_at').notNullable();
    t.datetime('sent_at').nullable();
    t.string('status').notNullable().defaultTo('pending'); // pending, sent, failed
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('follow_ups');
};
