import { IProviderAdapter } from './index';

export class ShopifyAdapter implements IProviderAdapter {
  providerName = 'shopify';
  apiVersion = '2024-01'; // Centralized version

  async checkHealth(brand: string) {
    // In production, this would make an API call to verify the token
    return { healthy: true, status: 'connected' };
  }

  async refreshToken(brand: string) {
    // Shopify tokens are generally non-expiring for custom apps, 
    // but OAuth apps support offline/online access tokens.
    return true;
  }

  async syncCatalog(brand: string) {
    console.log(`[Shopify] Syncing catalog for ${brand}...`);
    // Example durable job execution
    return { success: true, count: 1520 };
  }
}
