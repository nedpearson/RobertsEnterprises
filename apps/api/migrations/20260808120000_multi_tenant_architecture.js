exports.up = async function(knex) {
  // 1. Create tenants table
  await knex.schema.createTable('tenants', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('slug').notNullable().unique();
    table.string('status').defaultTo('active');
    table.string('primary_domain');
    table.string('app_url');
    table.string('api_url');
    table.string('auth_provider').defaultTo('local');
    table.string('subscription_status').defaultTo('trialing');
    table.timestamps(true, true);
  });

  // 2. Create user_tenants table
  await knex.schema.createTable('user_tenants', table => {
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('role').notNullable();
    table.string('status').defaultTo('active');
    table.boolean('is_primary').defaultTo(false);
    table.timestamps(true, true);
    table.primary(['user_id', 'tenant_id']);
  });

  // 3. Create auth_codes table for SSO handoff
  await knex.schema.createTable('auth_codes', table => {
    table.string('code_hash').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('destination_origin').notNullable();
    table.string('nonce');
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at');
    table.timestamps(true, true);
  });

  // 4. Migrate existing boutiques to tenants
  const boutiques = await knex('boutiques').select('*');
  for (const boutique of boutiques) {
    let slug = boutique.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (slug === 'bridallive-boutique-default') slug = 'roberts-enterprises';
    if (slug === 'demo-boutique') slug = 'demo';

    const insertedIds = await knex('tenants').insert({
      id: boutique.id, // Preserve ID mapping
      name: slug === 'roberts-enterprises' ? 'Roberts Enterprises' : boutique.name,
      slug: slug,
      status: 'active',
      primary_domain: slug === 'roberts-enterprises' ? 'robertsenterprises.bridgebox.ai' : null,
      app_url: slug === 'roberts-enterprises' ? 'https://robertsenterprises.bridgebox.ai' : null,
      api_url: slug === 'roberts-enterprises' ? 'https://api.robertsenterprises.bridgebox.ai' : null
    }).returning('id');
    
    const tenantId = typeof insertedIds[0] === 'object' ? insertedIds[0].id : insertedIds[0];

    // 5. Migrate users to user_tenants
    const users = await knex('users').where({ boutique_id: boutique.id });
    for (const user of users) {
      await knex('user_tenants').insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: user.role,
        is_primary: true
      });
    }
  }

  // Ensure next auto-increment is correct since we forced IDs (PostgreSQL only fix, SQLite handles it, but just in case)
  if (knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql') {
    await knex.raw('SELECT setval(\'tenants_id_seq\', (SELECT MAX(id) FROM tenants))');
  }

  // 6. We keep boutique_id columns for now to avoid breaking existing queries that we haven't updated yet,
  // but we can add tenant_id to the users table for convenience in simple token generation if needed.
  // Actually, we'll just rename boutique_id everywhere later, but for now we'll add tenant_id to users.
  await knex.schema.alterTable('users', table => {
    table.integer('tenant_id').unsigned().references('id').inTable('tenants');
  });

  // Backfill tenant_id on users
  await knex.raw('UPDATE users SET tenant_id = boutique_id');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('tenant_id');
  });
  await knex.schema.dropTableIfExists('auth_codes');
  await knex.schema.dropTableIfExists('user_tenants');
  await knex.schema.dropTableIfExists('tenants');
};
