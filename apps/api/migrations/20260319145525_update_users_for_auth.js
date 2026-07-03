exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('role').notNullable().defaultTo('consultant'); // owner, manager, consultant
    table.string('password_hash');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('role');
    table.dropColumn('password_hash');
  });
};
