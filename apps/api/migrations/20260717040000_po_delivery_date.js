// Patch 06 — open-orders-expected-deliveries: add expected_delivery_date to purchase_orders
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('purchase_orders', 'expected_delivery_date');
  if (!hasCol) {
    await knex.schema.table('purchase_orders', (t) => {
      t.date('expected_delivery_date').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('purchase_orders', 'expected_delivery_date');
  if (hasCol) {
    await knex.schema.table('purchase_orders', (t) => {
      t.dropColumn('expected_delivery_date');
    });
  }
};
