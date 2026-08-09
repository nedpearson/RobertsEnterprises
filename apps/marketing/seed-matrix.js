import { createClient } from '@supabase/supabase-js';

const prodUrl = 'https://yyexmcaumkzxvhplipkl.supabase.co';
const prodKey = 'sb_publishable_lASIBvmSjXthkgf4D__cLw_OpMrfeyb';
const supabase = createClient(prodUrl, prodKey);

async function seed() {
  console.log('Logging in as Demo Owner...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo123@gmail.com',
    password: 'password123'
  });

  if (authErr) {
    console.error('Failed to login:', authErr.message);
    return;
  }
  
  console.log('Logged in successfully!');
  
  // 1. Get the business ID
  const { data: memberships, error: memErr } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', auth.user.id);
    
  if (memErr || !memberships || memberships.length === 0) {
    console.error('No business membership found for demo user.');
    return;
  }
  
  const businessId = memberships[0].business_id;
  console.log('Business ID:', businessId);
  
  // Get location ID
  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('business_id', businessId)
    .limit(1);
    
  const locationId = locations?.[0]?.id;

  // 2. Fetch ALL staff profiles (since Demo Owner is the only one in business_memberships due to RLS, and staff_profiles has no RLS)
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('*');
    
  let staffList = staffProfiles || [];
  
  console.log(`Found ${staffList.length} staff profiles.`);
  
  // 3. Delete existing schedules for this week to prevent duplicates
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  
  await supabase
    .from('employee_schedules')
    .delete()
    .eq('business_id', businessId);
    
  // 4. Generate the matrix data for the week
  console.log('Generating employee schedules for the matrix...');
  
  for (const staff of staffList) {
    // Skip if it's the Demo Owner
    if (staff.name === 'Demo Owner' || staff.first_name === 'Demo') continue;
    
    // Assign schedules from Sunday (0) to Saturday (6)
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Sarah gets Sunday & Wed OFF. Mon, Tue, Thu, Fri, Sat (10-6)
      if (staff.name?.includes('Sarah') || staff.first_name === 'Sarah') {
        if (i === 0 || i === 3) continue; // Off
        
        await supabase.from('employee_schedules').insert({
          business_id: businessId,
          location_id: locationId,
          employee_id: staff.id,
          shift_date: dateStr,
          start_at: `${dateStr}T10:00:00`,
          end_at: `${dateStr}T18:00:00`,
          shift_type: 'Regular',
          status: 'published'
        });
      } 
      // Jessica gets Mon, Tue (9-5). Wed (12-8). Thu, Fri, Sat (10-6). Sun OFF.
      else if (staff.name?.includes('Jessica') || staff.first_name === 'Jessica') {
        if (i === 0) continue; // Off
        let start = '10:00:00';
        let end = '18:00:00';
        
        if (i === 1 || i === 2) { start = '09:00:00'; end = '17:00:00'; }
        if (i === 3) { start = '12:00:00'; end = '20:00:00'; }
        
        await supabase.from('employee_schedules').insert({
          business_id: businessId,
          location_id: locationId,
          employee_id: staff.id,
          shift_date: dateStr,
          start_at: `${dateStr}T${start}`,
          end_at: `${dateStr}T${end}`,
          shift_type: 'Regular',
          status: 'published'
        });
      }
      else {
        // Generic schedule for others (9-5 weekdays)
        if (i > 0 && i < 6) {
          await supabase.from('employee_schedules').insert({
            business_id: businessId,
            location_id: locationId,
            employee_id: staff.id,
            shift_date: dateStr,
            start_at: `${dateStr}T09:00:00`,
            end_at: `${dateStr}T17:00:00`,
            shift_type: 'Regular',
            status: 'published'
          });
        }
      }
    }
  }

  console.log('Successfully injected Workforce Matrix synthetic data!');
}

seed();
