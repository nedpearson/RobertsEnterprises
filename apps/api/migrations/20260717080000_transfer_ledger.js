// Patch 14 — transfer-ledger: add ledger_entry_id FK to transfers
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('transfers', 'ledger_entry_id');
  if (!hasCol) {
    await knex.schema.table('transfers', (t) => {
      t.integer('ledger_entry_id').references('id').inTable('ledger_entries').onDelete('SET NULL').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('transfers', 'ledger_entry_id');
  if (hasCol) {
    await knex.schema.table('transfers', (t) => {
      t.dropColumn('ledger_entry_id');
    });
  }
};
