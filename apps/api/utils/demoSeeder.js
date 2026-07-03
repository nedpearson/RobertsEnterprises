async function seedDemoData(knex) {
  const getSingleId = (res) => {
    if (Array.isArray(res)) {
      if (typeof res[0] === 'object' && res[0] !== null) return res[0].id;
      return res[0];
    }
    return res;
  };
  
  // 1. Clean up existing demo boutique if it exists
  const oldBoutique = await knex('boutiques').where({ name: 'VowOS Showcase Boutique (Demo)' }).first();
  if (oldBoutique) {
    await knex('payments').whereIn('invoice_id', knex('invoices').where('boutique_id', oldBoutique.id).select('id')).del();
    await knex('invoices').where('boutique_id', oldBoutique.id).del();
    await knex('pickups').where('boutique_id', oldBoutique.id).del();
    await knex('purchase_orders').where('boutique_id', oldBoutique.id).del();
    await knex('appointments').where('boutique_id', oldBoutique.id).del();
    await knex('inventory_variants').whereIn('item_id', knex('inventory_items').where('boutique_id', oldBoutique.id).select('id')).del();
    await knex('inventory_items').where('boutique_id', oldBoutique.id).del();
    await knex('leads').where('boutique_id', oldBoutique.id).del();
    await knex('customers').where('boutique_id', oldBoutique.id).del();
    await knex('users').where('boutique_id', oldBoutique.id).del();
    await knex('boutiques').where('id', oldBoutique.id).del();
  }
  
  // 1.5. Bulletproof orphaned row cleanup
  await knex('users').where('email', 'like', '%@demo.vowos').del();
  await knex('customers').where('email', 'like', '%@demo.vowos').del();
  await knex('leads').where('email', 'like', '%@demo.vowos').del();

  // 2. Create Demo Boutique
  const boutiqueRes = await knex('boutiques').insert({
    name: 'VowOS Showcase Boutique (Demo)',
    timezone: 'America/New_York'
  }).returning('id');
  const boutiqueId = getSingleId(boutiqueRes);

  if (!boutiqueId) throw new Error("Failed to capture Boutique ID");

  // 3. Create Users
  await knex('users').insert([
    { boutique_id: boutiqueId, first_name: 'Sarah', last_name: 'Owner', email: 'owner@demo.vowos', role: 'owner', password_hash: 'demo123' },
    { boutique_id: boutiqueId, first_name: 'Michael', last_name: 'Manager', email: 'manager@demo.vowos', role: 'manager', password_hash: 'demo123' },
    { boutique_id: boutiqueId, first_name: 'Emma', last_name: 'Stylist', email: 'emma@demo.vowos', role: 'consultant', password_hash: 'demo123' },
    { boutique_id: boutiqueId, first_name: 'Jessica', last_name: 'Consultant', email: 'jessican@demo.vowos', role: 'consultant', password_hash: 'demo123' }
  ]);

  // 4. Create Rich Customers Array
  const customers = [
    { first_name: 'Olivia', last_name: 'Rodriguez', email: 'olivia.r@demo.vowos', phone: '(555) 123-4567' },
    { first_name: 'Sophia', last_name: 'Martinez', email: 'sophia.m@demo.vowos', phone: '(555) 987-6543' },
    { first_name: 'Isabella', last_name: 'Chen', email: 'isabella.c@demo.vowos', phone: '(555) 456-7890' },
    { first_name: 'Mia', last_name: 'Kim', email: 'mia.k@demo.vowos', phone: '(555) 321-0987' },
    { first_name: 'Charlotte', last_name: 'Davis', email: 'charlotte.d@demo.vowos', phone: '(555) 654-3210' },
    { first_name: 'Amelia', last_name: 'Wilson', email: 'amelia.w@demo.vowos', phone: '(555) 234-5678' },
    { first_name: 'Harper', last_name: 'Taylor', email: 'harper.t@demo.vowos', phone: '(555) 876-5432' },
    { first_name: 'Evelyn', last_name: 'Anderson', email: 'evelyn.a@demo.vowos', phone: '(555) 345-6789' },
    { first_name: 'Abigail', last_name: 'Thomas', email: 'abigail.t@demo.vowos', phone: '(555) 765-4321' },
    { first_name: 'Emily', last_name: 'Jackson', email: 'emily.j@demo.vowos', phone: '(555) 456-1234' },
    { first_name: 'Elizabeth', last_name: 'White', email: 'elizabeth.w@demo.vowos', phone: '(555) 567-8901' },
    { first_name: 'Avery', last_name: 'Harris', email: 'avery.h@demo.vowos', phone: '(555) 678-9012' },
    { first_name: 'Ella', last_name: 'Martin', email: 'ella.m@demo.vowos', phone: '(555) 789-0123' },
    { first_name: 'Scarlett', last_name: 'Thompson', email: 'scarlett.t@demo.vowos', phone: '(555) 890-1234' },
    { first_name: 'Grace', last_name: 'Garcia', email: 'grace.g@demo.vowos', phone: '(555) 901-2345' }
  ];
  let customerIds = [];
  for (let c of customers) {
    const cRes = await knex('customers').insert({ boutique_id: boutiqueId, ...c }).returning('id');
    customerIds.push(getSingleId(cRes));
  }

  // 5. Rich Leads Pipeline
  const leads = [
    { first_name: 'Chloe', last_name: 'Martinez', email: 'chloe.m@demo.vowos', status: 'new' },
    { first_name: 'Victoria', last_name: 'Robinson', email: 'victoria.r@demo.vowos', status: 'contacted' },
    { first_name: 'Riley', last_name: 'Clark', email: 'riley.c@demo.vowos', status: 'qualified' },
    { first_name: 'Aria', last_name: 'Rodriguez', email: 'aria.r@demo.vowos', status: 'booked' },
    { first_name: 'Lily', last_name: 'Lewis', email: 'lily.l@demo.vowos', status: 'new' },
    { first_name: 'Zoey', last_name: 'Lee', email: 'zoey.l@demo.vowos', status: 'contacted' },
    { first_name: 'Penelope', last_name: 'Walker', email: 'penelope.w@demo.vowos', status: 'qualified' },
    { first_name: 'Layla', last_name: 'Hall', email: 'layla.h@demo.vowos', status: 'booked' },
    { first_name: 'Lillian', last_name: 'Allen', email: 'lillian.a@demo.vowos', status: 'contacted' },
    { first_name: 'Natalie', last_name: 'Young', email: 'natalie.y@demo.vowos', status: 'new' },
    { first_name: 'Zoe', last_name: 'Hernandez', email: 'zoe.h@demo.vowos', status: 'qualified' },
    { first_name: 'Stella', last_name: 'King', email: 'stella.k@demo.vowos', status: 'booked' },
    { first_name: 'Hazel', last_name: 'Wright', email: 'hazel.w@demo.vowos', status: 'new' },
    { first_name: 'Aurora', last_name: 'Lopez', email: 'aurora.l@demo.vowos', status: 'contacted' }
  ];
  for (let l of leads) {
    await knex('leads').insert({ boutique_id: boutiqueId, ...l });
  }

  // 6. Extensive Inventory Catalog (Gowns & Accessories)
  const catalog = [
    { vendor: 'Vera Wang', style: 'VW-1002', cat: 'Bridal Gown', desc: 'Silk A-Line with extended train', price: 350000, 
      variants: [{ s:'8', c:'Diamond White', q:2 }, { s:'10', c:'Diamond White', q:1 }, { s:'12', c:'Ivory', q:0 }] },
    { vendor: 'Maggie Sottero', style: 'MS-LUNA', cat: 'Bridal Gown', desc: 'Lace Mermaid with sequins', price: 180000, 
      variants: [{ s:'12', c:'Ivory', q:3 }, { s:'14', c:'Ivory over Blush', q:0 }, { s:'16', c:'Ivory', q:1 }] },
    { vendor: 'Pronovias', style: 'PR-775', cat: 'Bridal Gown', desc: 'Crepe Fit and Flare open back', price: 210000, 
      variants: [{ s:'6', c:'Off White', q:0 }, { s:'8', c:'Off White', q:1 }, { s:'10', c:'Optical White', q:2 }] },
    { vendor: 'Monique Lhuillier', style: 'ML-BLISS', cat: 'Accessories', desc: 'Swarovski Crystal Cathedral Veil', price: 85000, 
      variants: [{ s:'OS', c:'Clear', q:5 }, { s:'OS', c:'Pearl', q:2 }] },
    { vendor: 'Berta', style: 'BR-901', cat: 'Bridal Gown', desc: 'Plunging V-Neck Tulle ballgown', price: 420000, 
      variants: [{ s:'10', c:'Ivory', q:1 }, { s:'12', c:'Ivory', q:0 }] },
    { vendor: 'Justin Alexander', style: 'JA-SIG10', cat: 'Bridal Gown', desc: 'Strapless Mikado Trumpet', price: 195000, 
      variants: [{ s:'8', c:'Silk White', q:2 }, { s:'14', c:'Ivory', q:1 }] },
    { vendor: 'Badgley Mischka', style: 'BM-HEEL', cat: 'Shoes', desc: 'Satin Stiletto Crystal Back', price: 25000, 
      variants: [{ s:'7', c:'Ivory', q:4 }, { s:'8', c:'Ivory', q:2 }, { s:'9', c:'White', q:1 }] },
    { vendor: 'Amsale', style: 'AM-SASH', cat: 'Accessories', desc: 'Beaded Floral Satin Sash', price: 31000, 
      variants: [{ s:'OS', c:'Silver', q:8 }, { s:'OS', c:'Gold', q:3 }] }
  ];

  for (let item of catalog) {
    const resId = await knex('inventory_items').insert({
      boutique_id: boutiqueId, vendor_name: item.vendor, style_number: item.style,
      category: item.cat, description: item.desc, base_price_cents: item.price
    }).returning('id');
    const itemId = getSingleId(resId);
    
    let variantInserts = item.variants.map((v, i) => ({
      item_id: itemId, size: v.s, color: v.c, 
      sku: `${item.style}-${v.s}-${v.c.substring(0,3).toUpperCase()}-${i}`,
      stock_quantity: v.q, price_modifier_cents: v.s > '14' ? 15000 : 0
    }));
    await knex('inventory_variants').insert(variantInserts);
  }

  // 7. Full Appointment Calendar
  const schedule = [
    { cIdx: 0, time: '10:00 AM', type: 'Bridal Fitting', stylist: 'Emma Stylist', room: 'Suite A' },
    { cIdx: 1, time: '10:00 AM', type: 'First View', stylist: 'Jessica Consultant', room: 'Suite B' },
    { cIdx: 2, time: '11:00 AM', type: 'Alterations', stylist: 'Michael Manager', room: 'Podium 1' },
    { cIdx: 3, time: '12:00 PM', type: 'Bridal Fitting', stylist: 'Emma Stylist', room: 'Suite A' },
    { cIdx: 4, time: '12:00 PM', type: 'Accessory Styling', stylist: 'Jessica Consultant', room: 'Suite C' },
    { cIdx: 5, time: '1:00 PM', type: 'First View', stylist: 'Emma Stylist', room: 'Suite B' },
    { cIdx: 6, time: '2:00 PM', type: 'Bridal Fitting', stylist: 'Jessica Consultant', room: 'Suite A' },
    { cIdx: 7, time: '2:00 PM', type: 'Alterations', stylist: 'Michael Manager', room: 'Podium 2' },
    { cIdx: 8, time: '3:00 PM', type: 'First View', stylist: 'Emma Stylist', room: 'Suite C' },
    { cIdx: 9, time: '4:00 PM', type: 'Bridal Fitting', stylist: 'Jessica Consultant', room: 'Suite B' },
    { cIdx: 10, time: '4:00 PM', type: 'Pickup', stylist: 'Michael Manager', room: 'Front Desk' },
    { cIdx: 11, time: '5:00 PM', type: 'Alterations', stylist: 'Emma Stylist', room: 'Podium 1' }
  ];
  for (let appt of schedule) {
    await knex('appointments').insert({
      boutique_id: boutiqueId, customer_id: customerIds[appt.cIdx],
      time_slot: appt.time, type: appt.type, consultant_name: appt.stylist, room_name: appt.room
    });
  }

  // 8. Operations Data (Purchase Orders / Pickups)
  const d1 = new Date(); d1.setMonth(d1.getMonth() + 2);
  const d2 = new Date(); d2.setMonth(d2.getMonth() + 4);
  const d3 = new Date(); d3.setMonth(d3.getMonth() - 1); // Late
  
  await knex('purchase_orders').insert([
    { boutique_id: boutiqueId, customer_id: customerIds[2], vendor_name: 'Vera Wang', style_number: 'VW-1002', size: '10', status: 'Submitted', expected_ship_date: d2.toISOString().split('T')[0] },
    { boutique_id: boutiqueId, customer_id: customerIds[5], vendor_name: 'Berta', style_number: 'BR-901', size: '12', status: 'In Production', expected_ship_date: d1.toISOString().split('T')[0] },
    { boutique_id: boutiqueId, customer_id: customerIds[8], vendor_name: 'Maggie Sottero', style_number: 'MS-LUNA', size: '16', status: 'Late', expected_ship_date: d3.toISOString().split('T')[0] },
    { boutique_id: boutiqueId, customer_id: customerIds[11], vendor_name: 'Justin Alexander', style_number: 'JA-SIG10', size: '8', status: 'Submitted', expected_ship_date: d2.toISOString().split('T')[0] }
  ]);

  await knex('pickups').insert([
    { boutique_id: boutiqueId, customer_id: customerIds[0], item_description: 'Vera Wang Altered Gown', qa_verified: true, ready_since: new Date().toISOString().split('T')[0] },
    { boutique_id: boutiqueId, customer_id: customerIds[1], item_description: 'Monique Lhuillier Crystal Veil', qa_verified: true, ready_since: d3.toISOString().split('T')[0] },
    { boutique_id: boutiqueId, customer_id: customerIds[4], item_description: 'Maggie Sottero Dress', qa_verified: false, ready_since: null },
    { boutique_id: boutiqueId, customer_id: customerIds[10], item_description: 'Badgley Mischka Shoes', qa_verified: true, ready_since: new Date().toISOString().split('T')[0] }
  ]);

  // 9. Comprehensive Financial Ledger
  const invoices = [
    { cIdx: 0, tot: 380000, pd: 380000, stat: 'paid', isPaid: true },
    { cIdx: 1, tot: 180000, pd: 90000, stat: 'partial', isPaid: true },
    { cIdx: 2, tot: 240000, pd: 240000, stat: 'paid', isPaid: true },
    { cIdx: 3, tot: 350000, pd: 0, stat: 'unpaid', isPaid: false },
    { cIdx: 4, tot: 420000, pd: 210000, stat: 'partial', isPaid: true },
    { cIdx: 5, tot: 510000, pd: 510000, stat: 'paid', isPaid: true },
    { cIdx: 6, tot: 275000, pd: 100000, stat: 'partial', isPaid: true },
    { cIdx: 7, tot: 310000, pd: 0, stat: 'unpaid', isPaid: false },
    { cIdx: 8, tot: 195000, pd: 195000, stat: 'paid', isPaid: true },
    { cIdx: 9, tot: 85000, pd: 85000, stat: 'paid', isPaid: true },
    { cIdx: 10, tot: 220000, pd: 110000, stat: 'partial', isPaid: true },
    { cIdx: 11, tot: 400000, pd: 50000, stat: 'partial', isPaid: true }
  ];

  for (let inv of invoices) {
    const invRes = await knex('invoices').insert({ 
      boutique_id: boutiqueId, 
      customer_id: customerIds[inv.cIdx], 
      total_amount_cents: inv.tot, 
      total_paid_cents: inv.pd, 
      balance_due_cents: inv.tot - inv.pd, 
      status: inv.stat 
    }).returning('id');
    
    if (inv.isPaid) {
      await knex('payments').insert({ 
        invoice_id: getSingleId(invRes), 
        amount_cents: inv.pd, 
        method: inv.pd > 200000 ? 'ach' : 'credit_card', 
        reference_number: `REF-${Math.floor(Math.random()*100000)}` 
      });
    }
  }

  // Get Demo Owner and Return
  const demoOwner = await knex('users').where({ email: 'owner@demo.vowos', boutique_id: boutiqueId }).first();
  return demoOwner;
}

module.exports = { seedDemoData };
