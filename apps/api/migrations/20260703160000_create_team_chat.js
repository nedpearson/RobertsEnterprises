/**
 * Phase 6 — Team Chat.
 * Channel-based internal team communication: chat_channels (optionally scoped to a
 * boutique; null = company-wide) and chat_messages (authored by users). Adapts the
 * legacy Flask internal-messaging concept into simple, demoable channels.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('chat_channels', (t) => {
    t.increments('id').primary();
    t.integer('boutique_id').unsigned().references('id').inTable('boutiques').onDelete('SET NULL');
    t.string('name').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('chat_messages', (t) => {
    t.increments('id').primary();
    t.integer('channel_id').unsigned().references('id').inTable('chat_channels').onDelete('CASCADE');
    t.integer('author_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.text('body').notNullable();
    t.timestamps(true, true);
  });

  await knex('chat_channels').insert({ name: 'General' }); // default company-wide channel
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_channels');
};
