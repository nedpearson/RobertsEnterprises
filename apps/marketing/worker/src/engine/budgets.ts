import { supabase } from '../index';

export async function checkBudgetSafeguards(brand: string, location?: string) {
  console.log(`Checking budget safeguards for ${brand} ${location ? `(${location})` : ''}...`);

  let query = supabase
    .from('marketing_budgets')
    .select('*')
    .eq('brand', brand);
    
  if (location) {
    query = query.eq('location', location);
  } else {
    query = query.is('location', null);
  }

  const { data: budgets, error } = await query;
  
  if (error || !budgets || budgets.length === 0) {
    console.log('No specific budget limits found. Proceeding with caution.');
    return true;
  }

  for (const budget of budgets) {
    // 1. Fetch current spend from marketing_campaigns
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('spent_cents')
      .eq('brand', brand)
      .eq('platform', budget.platform)
      // filter by current month if applicable
    
    const totalSpent = campaigns?.reduce((sum: number, camp: { spent_cents?: number }) => sum + (camp.spent_cents || 0), 0) || 0;

    const percentage = (totalSpent / budget.monthly_limit_cents) * 100;

    if (percentage >= budget.hard_stop_percent) {
      console.error(`🚨 HARD STOP REACHED for ${budget.platform}. Halting campaigns.`);
      await haltAllCampaigns(brand, budget.platform);
      return false; // Prevent further action
    } else if (percentage >= budget.warning_threshold_percent) {
      console.warn(`⚠️ WARNING: ${budget.platform} spend is at ${percentage.toFixed(1)}% of limit.`);
      // Emit alert event to audit log or notification system
    }
  }

  return true;
}

export async function haltAllCampaigns(brand: string, platform?: string) {
  // Enqueue durable jobs to pause all active campaigns for this brand/platform
  console.log(`Queueing emergency pause for ${brand} / ${platform || 'ALL'}`);
  
  let query = supabase
    .from('marketing_campaigns')
    .select('id')
    .eq('brand', brand)
    .eq('status', 'active');
    
  if (platform) {
    query = query.eq('provider', platform);
  }
  
  const { data: activeCampaigns } = await query;
  
  if (activeCampaigns) {
    for (const camp of activeCampaigns) {
      await supabase.from('durable_jobs').insert({
        queue_name: 'pause_campaign',
        payload: { campaign_id: camp.id }
      });
    }
  }
}
