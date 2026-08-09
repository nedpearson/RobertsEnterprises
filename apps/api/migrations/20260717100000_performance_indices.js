// Dummy migration to satisfy knex which already recorded this file in the DB
// The original migration tried to add a column that already existed.
exports.up = function(knex) {
  return Promise.resolve();
};

exports.down = function(knex) {
  return Promise.resolve();
};
