const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODgwNSwiZXhwIjoyMTAxNDY0ODA1fQ.dtdvjxpAyb2CbIs3tNbjEIqGHyX5uEKaCOLJm_TC4iw'
);

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  
  const emailsToDelete = [
    'demo123@gmail.com',
    'sarah@robertsenterprises.com',
    'jessica@robertsenterprises.com',
    'emily@robertsenterprises.com',
    'michael@robertsenterprises.com'
  ];
  
  for (const user of users) {
    if (emailsToDelete.includes(user.email)) {
      console.log(\Deleting user \ (\)...\);
      const res = await supabase.auth.admin.deleteUser(user.id);
      console.log('Result:', res.error || 'Success');
    }
  }
}

run();
