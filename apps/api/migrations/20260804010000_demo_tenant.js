exports.up = async function(knex) {
  await knex.schema.alterTable('boutiques', table => {
    table.boolean('is_demo').notNullable().defaultTo(false);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('boutiques', table => {
    table.dropColumn('is_demo');
  });
};
