exports.up = async function(knex) {
  // SQLite doesn't support ENUM natively, so we use string with default
  await knex.schema.alterTable('tenants', t => {
    t.string('subscription_tier').defaultTo('essential');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('tenants', t => {
    t.dropColumn('subscription_tier');
  });
};
