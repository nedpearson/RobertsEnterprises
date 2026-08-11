import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Connect using the Service Role Key to bypass RLS and insert tenant_id if required.
const dbUrl = process.env.VITE_SUPABASE_URL || 'https://yyexmcaumkzxvhplipkl.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not found in env. Falling back to anon key. RLS may block inserts.");
}

const db = createClient(dbUrl, serviceKey || process.env.VITE_SUPABASE_ANON_KEY || 'fake');
const DEMO_TENANT_ID = 'tenant_demo_lumiere';

async function seedDemoTenant() {
  console.log(`\n===========================================`);
  console.log(`🌟 Seeding Demo Tenant: ${DEMO_TENANT_ID}`);
  console.log(`===========================================\n`);

  try {
    // 1. Wipe existing demo data securely
    console.log('🗑️ Clearing existing demo data...');
    const tables = ['alterations', 'contracts', 'invoices', 'appointments', 'gowns', 'locations', 'businesses'];
    for (const table of tables) {
      try {
        await db.from(table).delete().eq('tenant_id', DEMO_TENANT_ID);
      } catch (e) {
        // Ignore if tenant_id does not exist on table
      }
    }

    // 2. Create the Business & Locations for Lumière
    console.log('🏢 Creating Lumière Bridal Group...');
    const businessId = `biz_lumiere_demo`;
    
    await db.from('businesses').upsert({
      id: businessId,
      name: 'Lumière Bridal Group',
      tenant_id: DEMO_TENANT_ID
    }).select().maybeSingle();

    const locations = [
      { id: 'loc_lumiere_1', business_id: businessId, name: 'Lumière - Flagship Paris', address: '15 Rue de la Paix, Paris', tenant_id: DEMO_TENANT_ID },
      { id: 'loc_lumiere_2', business_id: businessId, name: 'Lumière - London', address: '12 Sloane St, London', tenant_id: DEMO_TENANT_ID },
      { id: 'loc_lumiere_3', business_id: businessId, name: 'Lumière - New York', address: 'Fifth Avenue, New York', tenant_id: DEMO_TENANT_ID }
    ];

    for (const loc of locations) {
      await db.from('locations').upsert(loc).select().maybeSingle();
    }

    // Give Demo an Enterprise Subscription
    const { error: subErr } = await db.from('tenant_subscriptions').upsert({
      business_id: businessId,
      plan: 'enterprise',
      status: 'active',
      addons: ['api_access', 'custom_domain'],
      grandfathered_features: [],
      industry_pack: 'bridal'
    }).select().maybeSingle();
    
    if (subErr) console.error("❌ Failed to insert subscription:", subErr);
    else console.log("✅ Inserted demo subscription");



    // 3. Generate Emma Carter's Flagship Journey
    console.log('👰 Generating Emma Carter (Flagship Customer)...');
    
    const gownId = 'gown_lumiere_demo_1';
    await db.from('gowns').upsert({
      id: gownId,
      name: 'Monique Lhuillier - Secret Garden',
      designer: 'Monique Lhuillier',
      style: 'Ballgown',
      size: '6',
      color: 'Ivory/Blush',
      price_cents: 850000,
      stock: 1,
      status: 'On Order',
      image: 'https://d64gsuwffb70l.cloudfront.net/6a5d5dc9d84ad34d886e72c1_1784503869512_b4807712.jpg',
      location: 'loc_lumiere_1',
      tenant_id: DEMO_TENANT_ID
    }).select().maybeSingle();

    // Contract
    await db.from('contracts').upsert({
      id: 'CT-LUMIERE-EMMA',
      customer: 'Emma Carter',
      location: 'loc_lumiere_1',
      gown: 'Monique Lhuillier - Secret Garden',
      amount_cents: 850000,
      deposit_cents: 510000,
      special_terms: 'Rush shipping approved.',
      status: 'Signed',
      sign_token: 'demo-token-emma',
      tenant_id: DEMO_TENANT_ID
    }).select().maybeSingle();

    // Alteration
    await db.from('alterations').upsert({
      id: 'ALT-LUMIERE-EMMA',
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
      location: 'loc_lumiere_1',
      tenant_id: DEMO_TENANT_ID
    }).select().maybeSingle();

    console.log('✅ Demo Reset Complete! Lumière Bridal Group is ready.');
  } catch (error) {
    console.error('❌ Error during demo reset:', error);
  }
}

seedDemoTenant();
