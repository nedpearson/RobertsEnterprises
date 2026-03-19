exports.up = function(knex) {
  return knex.schema
    .createTable('invoices', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');
      table.integer('total_amount_cents').notNullable().defaultTo(0);
      table.integer('total_paid_cents').notNullable().defaultTo(0);
      table.integer('balance_due_cents').notNullable().defaultTo(0);
      table.string('status').notNullable().defaultTo('unpaid'); // unpaid, partial, paid
      table.date('due_date');
      table.timestamps(true, true);
    })
    .createTable('payments', table => {
      table.increments('id').primary();
      table.integer('invoice_id').unsigned().references('id').inTable('invoices').onDelete('CASCADE');
      table.integer('amount_cents').notNullable();
      table.string('method').notNullable(); // cash, credit_card, ach
      table.string('reference_number'); 
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('payments')
    .dropTableIfExists('invoices');
};
