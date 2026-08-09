exports.up = async function(knex) {
  // 1. Add status and approval fields to users table
  await knex.schema.alterTable('users', table => {
    table.string('status').notNullable().defaultTo('pending_approval');
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.text('rejection_reason');
    table.timestamp('status_changed_at');
  });

  // Set existing users to active so they don't get locked out
  await knex('users').update({ status: 'active' });

  // 2. Create user_audit_logs table
  await knex.schema.createTable('user_audit_logs', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.integer('actor_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.integer('target_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('action').notNullable(); // 'approve', 'reject', 'suspend', 'reactivate', 'role_change'
    table.text('details');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_audit_logs');
  await knex.schema.alterTable('users', table => {
    table.dropColumn('status');
    table.dropColumn('approved_by');
    table.dropColumn('approved_at');
    table.dropColumn('rejection_reason');
    table.dropColumn('status_changed_at');
  });
};
