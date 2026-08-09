export interface IProviderAdapter {
  /** The name of the provider (e.g. 'shopify', 'meta', 'google') */
  providerName: string;
  
  /** The current version of the provider's API */
  apiVersion: string;

  /** Validates the current connection tokens */
  checkHealth(brand: string): Promise<{ healthy: boolean; status: string; reason?: string }>;

  /** Attempt to refresh an expired token */
  refreshToken(brand: string): Promise<boolean>;

  /** Sync data from the provider to VowOS */
  syncDown?(brand: string, entity: string): Promise<any>;

  /** Push data from VowOS to the provider */
  pushUp?(brand: string, entity: string, payload: any): Promise<any>;
}
