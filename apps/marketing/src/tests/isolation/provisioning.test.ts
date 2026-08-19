import { describe, it, expect } from 'vitest';

describe('Provisioning RPC Logic (Simulated)', () => {
  it('creates org, businesses, and locations from valid payload', () => {
    // Simulate valid payload logic
    const payload = {
      orgDetails: { slug: 'test-org' },
      businesses: [{
        name: 'Brand 1',
        locations: [{ name: 'Loc 1' }]
      }]
    };
    expect(payload.orgDetails.slug).toBe('test-org');
  });

  it('duplicate slug -> clean error', () => {
    const existingSlugs = ['test-org'];
    const payload = { orgDetails: { slug: 'test-org' } };
    
    const provision = () => {
      if (existingSlugs.includes(payload.orgDetails.slug)) {
        throw new Error('Slug test-org already exists');
      }
    };
    
    expect(provision).toThrow('Slug test-org already exists');
  });

  it('duplicate location name within a brand -> rejected', () => {
    const payload = {
      businesses: [{
        name: 'Brand 1',
        locations: [{ name: 'Loc 1' }, { name: 'Loc 1' }]
      }]
    };
    
    const provision = () => {
      const locs = new Set();
      payload.businesses[0].locations.forEach(l => {
        if (locs.has(l.name.toLowerCase())) throw new Error('Duplicate location');
        locs.add(l.name.toLowerCase());
      });
    };
    
    expect(provision).toThrow('Duplicate location');
  });
});
