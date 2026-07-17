exports.up = function(knex) {
  return knex.schema.createTable('business_rules', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.string('key').notNullable();
    table.text('value').notNullable();
    table.timestamps(true, true);
    table.unique(['boutique_id', 'key']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('business_rules');
};
