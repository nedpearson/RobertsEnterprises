exports.up = function(knex) {
  return knex.schema
    .createTable('purchase_orders', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
      table.string('vendor_name').notNullable();
      table.string('style_number').notNullable();
      table.string('size').notNullable();
      table.date('expected_ship_date');
      table.string('status').notNullable().defaultTo('Submitted'); // Late, Received
      table.timestamps(true, true);
    })
    .createTable('pickups', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
      table.string('item_description').notNullable();
      table.boolean('qa_verified').defaultTo(false);
      table.date('ready_since');
      table.timestamps(true, true);
    })
    .createTable('appointments', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
      table.string('time_slot').notNullable();
      table.string('type').notNullable();
      table.string('consultant_name');
      table.string('room_name');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('appointments')
    .dropTableIfExists('pickups')
    .dropTableIfExists('purchase_orders');
};
