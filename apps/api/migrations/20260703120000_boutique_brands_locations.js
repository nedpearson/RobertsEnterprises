/**
 * Roberts Enterprises — multi-brand, multi-location.
 * Enriches boutiques (I Do Bridal Couture + Proper & Co, Baton Rouge + Covington)
 * with real address/phone/hours. Idempotent seed.
 */
exports.up = async function (knex) {
  const has = (c) => knex.schema.hasColumn('boutiques', c);
  await knex.schema.alterTable('boutiques', (t) => {});
  if (!(await has('brand')))   await knex.schema.alterTable('boutiques', t => t.string('brand'));
  if (!(await has('city')))    await knex.schema.alterTable('boutiques', t => t.string('city'));
  if (!(await has('address'))) await knex.schema.alterTable('boutiques', t => t.string('address'));
  if (!(await has('phone')))   await knex.schema.alterTable('boutiques', t => t.string('phone'));
  if (!(await has('hours')))   await knex.schema.alterTable('boutiques', t => t.string('hours'));

  const LOCATIONS = [
    { brand: 'ido',    name: 'I Do Bridal Couture — Baton Rouge', city: 'Baton Rouge', address: '4343 Perkins Rd, Baton Rouge, LA 70808',          phone: '(225) 361-0377', hours: 'Tue–Sat 10am–5pm' },
    { brand: 'ido',    name: 'I Do Bridal Couture — Covington',   city: 'Covington',   address: '316 Lee Ln, Covington, LA 70433',              phone: '(985) 327-5598', hours: 'Tue–Sat 10am–4pm' },
    { brand: 'proper', name: 'Proper & Co. — Baton Rouge',        city: 'Baton Rouge', address: '4347 Perkins Rd, Suite A, Baton Rouge, LA 70808', phone: '(225) 361-0377', hours: 'Appointments Encouraged' },
    { brand: 'proper', name: 'Proper & Co. — Covington',          city: 'Covington',   address: '311 Lee Ln, Suite A, Covington, LA 70433',       phone: '(985) 327-5598', hours: 'By Appointment Only' },
  ];
  for (const loc of LOCATIONS) {
    const existing = await knex('boutiques').where({ name: loc.name }).first();
    if (existing) await knex('boutiques').where({ id: existing.id }).update(loc);
    else await knex('boutiques').insert(loc);
  }
};

exports.down = async function (knex) {
  await knex('boutiques').whereIn('brand', ['ido', 'proper']).del();
  for (const c of ['brand', 'city', 'address', 'phone', 'hours']) {
    if (await knex.schema.hasColumn('boutiques', c)) {
      await knex.schema.alterTable('boutiques', t => t.dropColumn(c));
    }
  }
};
