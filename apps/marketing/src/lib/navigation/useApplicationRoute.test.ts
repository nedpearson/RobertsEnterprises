import { describe, expect, it } from 'vitest';
import {
  getViewFromLocation,
  isDemoAppPath,
  stripDemoAppPrefix,
  withDemoAppPrefix,
} from './useApplicationRoute';

describe('VowOS demoapp navigation namespace', () => {
  it('recognizes the canonical public live demo app namespace', () => {
    expect(isDemoAppPath('/demoapp')).toBe(true);
    expect(isDemoAppPath('/demoapp/')).toBe(true);
    expect(isDemoAppPath('/demoapp/overview')).toBe(true);
    expect(isDemoAppPath('/demo')).toBe(false);
    expect(isDemoAppPath('/overview')).toBe(false);
  });

  it('maps demoapp routes to the same canonical application views', () => {
    expect(stripDemoAppPrefix('/demoapp')).toBe('/');
    expect(stripDemoAppPrefix('/demoapp/overview')).toBe('/overview');
    expect(getViewFromLocation('/demoapp')).toBe('dashboard');
    expect(getViewFromLocation('/demoapp/overview')).toBe('overview');
    expect(getViewFromLocation('/demoapp/customers')).toBe('customers');
  });

  it('keeps internal navigation inside demoapp while leaving real tenant paths unchanged', () => {
    expect(withDemoAppPrefix('/today', true)).toBe('/demoapp/today');
    expect(withDemoAppPrefix('/schedule', true)).toBe('/demoapp/schedule');
    expect(withDemoAppPrefix('/', true)).toBe('/demoapp');
    expect(withDemoAppPrefix('/today', false)).toBe('/today');
  });
});
