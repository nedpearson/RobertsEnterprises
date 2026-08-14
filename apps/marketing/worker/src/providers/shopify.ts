import { IProviderAdapter } from './index';

export class ShopifyAdapter implements IProviderAdapter {
  providerName = 'shopify';
  apiVersion = '2024-01'; // Centralized version

  async checkHealth(brand: string) {
    try {
      // Lazy-load supabase so we don't cause circular dependencies
      const { supabase } = require('../index');
      
      const { data, error } = await supabase
        .from('provider_connections')
        .select('access_token, shop_domain')
        .eq('provider', 'shopify')
        .eq('brand', brand)
        .maybeSingle();

      if (error || !data || !data.access_token) {
        return { healthy: false, status: 'disconnected', reason: 'No active token found' };
      }

      const response = await fetch(`https://${data.shop_domain}/admin/api/${this.apiVersion}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': data.access_token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { healthy: true, status: 'connected' };
      } else {
        return { healthy: false, status: 'disconnected', reason: 'API validation failed' };
      }
    } catch (err: any) {
      return { healthy: false, status: 'disconnected', reason: err.message };
    }
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
