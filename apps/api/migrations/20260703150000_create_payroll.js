/**
 * Phase 5 — Payroll.
 * Time clock (time_entries) + paystubs, with an hourly_wage on users.
 * Workflow: clock in -> clock out (hours computed) -> approve -> run payroll
 * (generates paystubs for approved unpaid hours in a period and marks them Paid).
 */
exports.up = async function (knex) {
  if (!(await knex.schema.hasColumn('users', 'hourly_wage'))) {
    await knex.schema.alterTable('users', (t) => t.decimal('hourly_wage', 8, 2).defaultTo(0));
    await knex('users').update({ hourly_wage: 18.0 }); // sensible default so payroll runs produce real pay
  }

  await knex.schema.createTable('time_entries', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('SET NULL');
    t.timestamp('clock_in');
    t.timestamp('clock_out');
    t.decimal('total_hours', 8, 2).defaultTo(0);
    t.boolean('approved').defaultTo(false);
    t.string('status').notNullable().defaultTo('Unpaid'); // Paid
    t.timestamps(true, true);
  });

  await knex.schema.createTable('paystubs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('SET NULL');
    t.date('period_start');
    t.date('period_end');
    t.decimal('total_hours', 8, 2).defaultTo(0);
    t.decimal('hourly_rate', 8, 2).defaultTo(0);
    t.decimal('base_pay', 10, 2).defaultTo(0);
    t.decimal('total_pay', 10, 2).defaultTo(0);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('paystubs');
  await knex.schema.dropTableIfExists('time_entries');
  if (await knex.schema.hasColumn('users', 'hourly_wage')) {
    await knex.schema.alterTable('users', (t) => t.dropColumn('hourly_wage'));
  }
};
