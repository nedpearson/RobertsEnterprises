import { describe, it, expect } from 'vitest';
import { demoDb } from './demoDatabase';

/**
 * Guards the "everything is stale" bug: the demo plane must serve the demo
 * tenant's identity through settings_values, not the generic production default.
 */
describe('demo plane settings identity', () => {
  it('serves Magnolia Bridal for organization/business_config, not "My Boutique"', async () => {
    const { data } = await demoDb
      .from('settings_values')
      .select('*')
      .eq('setting_namespace', 'organization')
      .eq('setting_key', 'business_config')
      .eq('data_plane', 'demo')
      .eq('status', 'active');

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    const org = data[0].value_json;
    expect(org.name).toBe('Magnolia Bridal');
    expect(org.name).not.toBe('My Boutique');
    expect(org.legalName).toContain('Magnolia Bridal');
  });

  it('org-scope rows carry no business/location/user id so they resolve for every persona', async () => {
    const { data } = await demoDb
      .from('settings_values').select('*')
      .eq('setting_namespace', 'organization').eq('setting_key', 'business_config');
    const row = data[0];
    expect(row.business_id).toBeNull();
    expect(row.location_id).toBeNull();
    expect(row.user_id).toBeNull();
  });
});
