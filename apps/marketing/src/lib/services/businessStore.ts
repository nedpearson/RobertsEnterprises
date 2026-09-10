import { supabase } from '@/lib/supabase';

export async function getBusinesses() {
  const { data } = await supabase.from('businesses').select('*');
  return data || [];
}

export async function getLocations() {
  const { data } = await supabase.from('locations').select('*');
  return data || [];
}
