exports.up = function(knex) {
  return knex.schema
    .createTable('boutiques', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('timezone').defaultTo('UTC');
      table.timestamps(true, true);
    })
    .createTable('users', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').notNullable().unique();
      table.timestamps(true, true);
    })
    .createTable('customers', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').notNullable().unique();
      table.string('phone');
      table.timestamps(true, true);
    })
    .createTable('leads', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').notNullable();
      table.string('status').defaultTo('new');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('leads')
    .dropTableIfExists('customers')
    .dropTableIfExists('users')
    .dropTableIfExists('boutiques');
};
