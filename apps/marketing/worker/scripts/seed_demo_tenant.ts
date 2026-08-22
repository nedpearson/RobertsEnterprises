import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Connect using the Service Role Key to bypass RLS and seed the canonical business schema.
const dbUrl = process.env.VITE_SUPABASE_URL || 'https://yyexmcaumkzxvhplipkl.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not found in env. Falling back to anon key. RLS may block inserts.");
}

const db = createClient(dbUrl, serviceKey || process.env.VITE_SUPABASE_ANON_KEY || 'fake');
const DEMO_BUSINESS_ID = '10000000-0000-0000-0000-000000000101';
const DEMO_CUSTOMER_ID = '10000000-0000-0000-0000-000000000102';
const DEMO_LOCATION_IDS = {
  paris: '10000000-0000-0000-0000-000000000111',
  london: '10000000-0000-0000-0000-000000000112',
  newYork: '10000000-0000-0000-0000-000000000113',
};

async function seedDemoTenant() {
  console.log(`\n===========================================`);
  console.log(`🌟 Seeding Demo Tenant: ${DEMO_BUSINESS_ID}`);
  console.log(`===========================================\n`);

  try {
    // 1. Wipe existing demo data securely
    console.log('🗑️ Clearing existing demo data...');
    const tables = ['alterations', 'contracts', 'invoices', 'appointments', 'customers', 'gowns', 'locations', 'businesses'];
    for (const table of tables) {
      try {
        await db.from(table).delete().eq('business_id', DEMO_BUSINESS_ID);
      } catch (e) {
        // Ignore if the table is not business-scoped.
      }
    }

    // 2. Create the Business & Locations for Lumière
    console.log('🏢 Creating Lumière Bridal Group...');
    const businessId = DEMO_BUSINESS_ID;
    
    await db.from('businesses').upsert({
      id: businessId,
      name: 'Lumiere Bridal Group',
    }).select().maybeSingle();

    const locations = [
      { id: DEMO_LOCATION_IDS.paris, business_id: businessId, name: 'Lumiere - Flagship Paris', address: '15 Rue de la Paix, Paris' },
      { id: DEMO_LOCATION_IDS.london, business_id: businessId, name: 'Lumiere - London', address: '12 Sloane St, London' },
      { id: DEMO_LOCATION_IDS.newYork, business_id: businessId, name: 'Lumiere - New York', address: 'Fifth Avenue, New York' }
    ];

    for (const loc of locations) {
      await db.from('locations').upsert(loc).select().maybeSingle();
    }

    // Give Demo an Enterprise Subscription
    const { error: subErr } = await db.from('organization_subscriptions').upsert({
      business_id: businessId,
      plan_id: 'enterprise',
      status: 'ACTIVE',
      addons: ['api_access', 'custom_domain'],
      grandfathered_features: [],
      industry_pack: 'bridal'
    }, { onConflict: 'business_id' }).select().maybeSingle();
    
    if (subErr) console.error("❌ Failed to insert subscription:", subErr);
    else console.log("✅ Inserted demo subscription");

    await db.from('customers').upsert({
      id: DEMO_CUSTOMER_ID,
      business_id: businessId,
      location_id: DEMO_LOCATION_IDS.paris,
      location: 'ido-br',
      name: 'Emma Carter',
      email: 'emma.carter@example.com',
      phone: '+13375550101',
      wedding_date: '2027-06-12',
      stylist: 'Madame Celeste',
      status: 'Active',
      spend_cents: 510000,
      portal_token: 'demo-token-emma-portal'
    }).select().maybeSingle();


    // 3. Generate Emma Carter's Flagship Journey
    console.log('👰 Generating Emma Carter (Flagship Customer)...');
    
    const gownId = 'gown_lumiere_demo_1';
    await db.from('gowns').upsert({
      id: gownId,
      business_id: businessId,
      location_id: DEMO_LOCATION_IDS.paris,
      name: 'Monique Lhuillier - Secret Garden',
      designer: 'Monique Lhuillier',
      style: 'Ballgown',
      size: '6',
      color: 'Ivory/Blush',
      price_cents: 850000,
      stock: 1,
      status: 'On Order',
      image: 'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503869512_b4807712.jpg',
      location: 'ido-br'
    }).select().maybeSingle();

    // Contract
    await db.from('contracts').upsert({
      id: 'CT-LUMIERE-EMMA',
      business_id: businessId,
      customer_id: DEMO_CUSTOMER_ID,
      customer: 'Emma Carter',
      location_id: DEMO_LOCATION_IDS.paris,
      location: 'ido-br',
      gown: 'Monique Lhuillier - Secret Garden',
      amount_cents: 850000,
      deposit_cents: 510000,
      special_terms: 'Rush shipping approved.',
      status: 'Signed',
      sign_token: 'demo-token-emma',
    }).select().maybeSingle();

    // Alteration
    await db.from('alterations').upsert({
      id: 'ALT-LUMIERE-EMMA',
      business_id: businessId,
      customer_id: DEMO_CUSTOMER_ID,
      customer: 'Emma Carter',
      gown: 'Monique Lhuillier - Secret Garden',
      seamstress: 'Madame Odette',
      status: 'In Progress',
      tasks: [
        { label: 'Hem to floor length', done: true },
        { label: 'Take in bodice sides', done: false }
      ],
      price_cents: 85000,
      notes: 'Emma needs it tight.',
      location_id: DEMO_LOCATION_IDS.paris,
      location: 'ido-br'
    }).select().maybeSingle();

    console.log('✅ Demo Reset Complete! Lumiere Bridal Group is ready.');
  } catch (error) {
    console.error('❌ Error during demo reset:', error);
  }
}

seedDemoTenant();
