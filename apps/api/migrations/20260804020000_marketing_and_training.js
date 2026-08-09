exports.up = async function(knex) {
  // 1. Create campaigns table
  await knex.schema.createTable('campaigns', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('status').notNullable().defaultTo('active'); // active, completed, paused
    table.timestamps(true, true);
  });

  // 2. Create lead_sources table
  await knex.schema.createTable('lead_sources', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.string('name').notNullable();
    table.timestamps(true, true);
    table.unique(['boutique_id', 'name']);
  });

  // 3. Create attribution_events table
  await knex.schema.createTable('attribution_events', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.integer('lead_id').unsigned().references('id').inTable('leads').onDelete('CASCADE');
    table.integer('campaign_id').unsigned().references('id').inTable('campaigns').onDelete('SET NULL');
    table.integer('lead_source_id').unsigned().references('id').inTable('lead_sources').onDelete('SET NULL');
    table.string('utm_source');
    table.string('utm_medium');
    table.string('utm_campaign');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 4. Create onboarding_progress table for training progress tracking
  await knex.schema.createTable('onboarding_progress', table => {
    table.increments('id').primary();
    table.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('step_name').notNullable();
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.timestamp('completed_at');
    table.timestamps(true, true);
    table.unique(['user_id', 'step_name']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('onboarding_progress');
  await knex.schema.dropTableIfExists('attribution_events');
  await knex.schema.dropTableIfExists('lead_sources');
  await knex.schema.dropTableIfExists('campaigns');
};
