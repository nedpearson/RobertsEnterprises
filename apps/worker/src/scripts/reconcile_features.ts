import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Assuming you have a .env file locally for testing
dotenv.config({ path: path.resolve(__dirname, '../../../marketing/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54341';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const KEY_MAP: Record<string, string> = {
  'ai_analytics': 'reports.ai_insights',
  'multi_location': 'inventory.transfers', // Mapping multi_location to transfers for lack of direct equivalent
  'custom_channels': 'sales.orders' // Or just 'integrations.api'
};

async function run() {
  console.log('Starting feature reconciliation...');

  // 1. Fetch all feature overrides
  const { data: overrides, error: overridesError } = await supabase
    .from('organization_feature_overrides')
    .select('*');

  if (overridesError) {
    console.error('Failed to fetch overrides:', overridesError);
    return;
  }

  let migrated = 0;
  for (const override of overrides || []) {
    if (KEY_MAP[override.feature_key]) {
      const newKey = KEY_MAP[override.feature_key];
      console.log(Migrating override:  ->  for business );
      
      // Upsert the new key
      const { error: upsertError } = await supabase
        .from('organization_feature_overrides')
        .upsert({
          business_id: override.business_id,
          feature_key: newKey,
          state: override.state,
          reason: \Migrated from legacy key \\,
          created_at: new Date().toISOString()
        });
        
      if (upsertError) {
        console.error(\Failed to migrate \\, upsertError);
      } else {
        // Delete the old key
        await supabase
          .from('organization_feature_overrides')
          .delete()
          .eq('id', override.id);
        migrated++;
      }
    } else {
      console.log(\Override for \ (business \) is either already valid or unmapped.\);
    }
  }

  console.log(\Reconciliation complete. Migrated \ records.\);
}

run();
