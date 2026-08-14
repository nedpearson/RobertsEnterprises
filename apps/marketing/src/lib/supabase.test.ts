import { describe, expect, it } from 'vitest';
import { isCanonicalDemoEntry } from './supabase';

describe('canonical VowOS demo routing', () => {
  it('allows the public VowOS guided demo and full live demo app routes', () => {
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/demo')).toBe(true);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/demo/')).toBe(true);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/demoapp')).toBe(true);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/demoapp/')).toBe(true);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/demoapp/overview')).toBe(true);
  });

  it('allows local demo development without creating a public alternate hostname', () => {
    expect(isCanonicalDemoEntry('localhost', '/demo')).toBe(true);
    expect(isCanonicalDemoEntry('127.0.0.1', '/demoapp')).toBe(true);
  });

  it('rejects alternate public demo hosts and production tenant paths', () => {
    expect(isCanonicalDemoEntry('demo.vowos.bridgebox.ai', '/demo')).toBe(false);
    expect(isCanonicalDemoEntry('demoapp.vowos.bridgebox.ai', '/demoapp')).toBe(false);
    expect(isCanonicalDemoEntry('robertsenterprises.vowos.bridgebox.ai', '/demo')).toBe(false);
    expect(isCanonicalDemoEntry('robertsenterprises.vowos.bridgebox.ai', '/demoapp')).toBe(false);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/platform')).toBe(false);
    expect(isCanonicalDemoEntry('vowos.bridgebox.ai', '/pricing')).toBe(false);
  });
});
