const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODgwNSwiZXhwIjoyMTAxNDY0ODA1fQ.dtdvjxpAyb2CbIs3tNbjEIqGHyX5uEKaCOLJm_TC4iw'
);

async function backfill() {
  const { data: reqs, error } = await db.from('appointment_requests').select('*');
  if (error) return console.error(error);

  console.log(`Found ${reqs.length} total appointment requests. Repairing historical records...`);

  for (const req of reqs) {
    if (!req.notes) continue;
    
    // Extract JSON block from notes
    const jsonMatch = req.notes.match(/Form Data:\s*([\s\S]+)/);
    if (!jsonMatch) continue;

    let formData;
    try {
      formData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      continue;
    }

    // Clean keys
    const cleanData = {};
    for (const [k, v] of Object.entries(formData)) {
      const cleanKey = k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
      cleanData[cleanKey] = v;
    }

    const rawName = cleanData['First and Last Name'] || cleanData['First + Last Name'] || cleanData['First Name'] || cleanData['name'] || '';
    const email = cleanData['Email'] || cleanData['email'] || '';
    const phone = cleanData['Contact Phone'] || cleanData['Phone'] || cleanData['phone'] || '';

    if (!rawName && !email && !phone) continue;

    console.log(`Repairing ${req.id.slice(0,8)} -> Name: "${rawName}", Email: "${email}", Phone: "${phone}"`);

    // Ensure customer exists
    let customerId = req.customer_id;
    if (email || phone) {
      const { data: existing } = await db.from('customers').select('id').eq('email', email).maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust } = await db.from('customers').insert({
          business_id: req.business_id,
          location_id: req.location_id,
          name: rawName || 'Customer',
          email,
          phone,
          status: 'Active'
        }).select('id').single();
        if (newCust) customerId = newCust.id;
      }
    }

    // Update appointment_request row with customer_id
    if (customerId) {
      const { error: updateErr } = await db.from('appointment_requests').update({ customer_id: customerId }).eq('id', req.id);
      if (updateErr) console.error('Update error:', updateErr);
      else console.log(`✅ Updated request ${req.id.slice(0,8)} with customer_id ${customerId}`);
    }
  }

  console.log('\n🎉 ALL HISTORICAL RECORDS REPAIRED SUCCESSFULLY!');
}

backfill();
