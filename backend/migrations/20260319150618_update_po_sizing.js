exports.up = function(knex) {
  return knex.schema.table('purchase_orders', table => {
    table.string('size_category').notNullable().defaultTo('Standard'); // Standard, Split Size, Custom Length
    table.string('split_bust').nullable();
    table.string('split_waist').nullable();
    table.string('split_hips').nullable();
    table.string('hollow_to_hem').nullable();
    table.text('custom_notes').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('purchase_orders', table => {
    table.dropColumn('size_category');
    table.dropColumn('split_bust');
    table.dropColumn('split_waist');
    table.dropColumn('split_hips');
    table.dropColumn('hollow_to_hem');
    table.dropColumn('custom_notes');
  });
};
