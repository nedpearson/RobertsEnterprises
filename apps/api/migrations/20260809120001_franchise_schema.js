exports.up = async function(knex) {
  await knex.schema.createTable('expansion_projects', t => {
    t.increments('id').primary();
    t.integer('business_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('status').notNullable().defaultTo('Planning');
    t.string('target_region');
    t.decimal('budget', 12, 2);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('market_candidates', t => {
    t.increments('id').primary();
    t.integer('project_id').unsigned().notNullable().references('id').inTable('expansion_projects').onDelete('CASCADE');
    t.string('name').notNullable();
    t.integer('population_density');
    t.decimal('median_income', 10, 2);
    t.float('competitive_index');
    t.float('viability_score');
    t.string('status').notNullable().defaultTo('Evaluating');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('franchise_programs', t => {
    t.increments('id').primary();
    t.integer('business_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.decimal('initial_franchise_fee', 10, 2);
    t.decimal('royalty_percentage', 5, 2);
    t.decimal('minimum_liquid_capital', 12, 2);
    t.decimal('minimum_net_worth', 12, 2);
    t.integer('term_length_years');
    t.boolean('is_active').defaultTo(true);
  });

  await knex.schema.createTable('franchise_candidates', t => {
    t.increments('id').primary();
    t.integer('business_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('email').notNullable();
    t.string('phone');
    t.integer('program_interest_id').unsigned().references('id').inTable('franchise_programs').onDelete('SET NULL');
    t.string('status').notNullable().defaultTo('Lead');
    t.decimal('liquid_capital_available', 12, 2);
    t.decimal('net_worth', 12, 2);
    t.string('background_check_status').defaultTo('Pending');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('territories', t => {
    t.increments('id').primary();
    t.integer('business_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.integer('assigned_franchisee_id').unsigned().references('id').inTable('franchise_candidates').onDelete('SET NULL');
    t.integer('market_candidate_id').unsigned().references('id').inTable('market_candidates').onDelete('SET NULL');
    t.string('exclusivity_status').defaultTo('Exclusive');
    t.integer('population_covered');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('territories');
  await knex.schema.dropTableIfExists('franchise_candidates');
  await knex.schema.dropTableIfExists('franchise_programs');
  await knex.schema.dropTableIfExists('market_candidates');
  await knex.schema.dropTableIfExists('expansion_projects');
};
