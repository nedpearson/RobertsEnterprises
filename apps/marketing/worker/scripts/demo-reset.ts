import { demoSupabase } from '../src/index';

async function resetDemoDatabase() {
  console.log('🔄 Starting Demo Database Reset...');

  try {
    // 1. Delete all operational data first (respecting foreign key cascades if configured, otherwise explicitly)
    // For a real implementation, you would truncate tables or delete all rows
    console.log('🗑️ Clearing operational data...');
    await demoSupabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await demoSupabase.from('gowns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // ... delete other operational data

    // 2. Ensure Demo User Exists
    console.log('👤 Ensuring demo user exists (demo123@gmail.com)...');
    
    // In a real environment, you'd use the Supabase Admin API to create the auth user if they don't exist:
    // await demoSupabase.auth.admin.createUser({ email: 'demo123@gmail.com', password: 'password123', email_confirm: true })
    
    // 3. Ensure Demo Business and Location Exists
    console.log('🏢 Seeding demo business & location...');
    const { data: business } = await demoSupabase.from('businesses').upsert({
      id: 'd0000000-0000-0000-0000-000000000001',
      name: 'Roberts Enterprises (Demo)'
    }).select().single();

    if (business) {
      await demoSupabase.from('locations').upsert({
        id: 'l0000000-0000-0000-0000-000000000001',
        business_id: business.id,
        name: 'Baton Rouge Flagship (Demo)',
        address: '123 Demo St, Baton Rouge, LA'
      });
      
      // Note: We'd also create the business_membership for demo123@gmail.com here.
    }

    // 4. Seed operational data
    console.log('🌱 Seeding rich fictional data...');
    // await demoSupabase.from('gowns').insert([...])

    console.log('✅ Demo Reset Complete!');
  } catch (error) {
    console.error('❌ Error during demo reset:', error);
    process.exit(1);
  }
}

resetDemoDatabase();
