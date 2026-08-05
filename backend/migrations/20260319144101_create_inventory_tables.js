exports.up = function(knex) {
  return knex.schema
    .createTable('inventory_items', table => {
      table.increments('id').primary();
      table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
      table.string('vendor_name').notNullable();
      table.string('style_number').notNullable();
      table.string('category').notNullable();
      table.text('description');
      table.integer('base_price_cents').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('inventory_variants', table => {
      table.increments('id').primary();
      table.integer('item_id').unsigned().references('id').inTable('inventory_items').onDelete('CASCADE');
      table.string('size').notNullable();
      table.string('color').notNullable();
      table.string('sku').notNullable().unique();
      table.integer('stock_quantity').defaultTo(0);
      table.integer('price_modifier_cents').defaultTo(0); // E.g for Plus Size upcharges
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('inventory_variants')
    .dropTableIfExists('inventory_items');
};
