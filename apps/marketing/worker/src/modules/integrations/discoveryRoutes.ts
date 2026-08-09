import { NextFunction, Request, Response, Router } from 'express';
import { decryptSecret } from './crypto';
import { IntegrationProvider, PROVIDERS, isIntegrationProvider } from './providerRegistry';

export const integrationDiscoveryRouter = Router();

type RequestContext = { db: any; userId?: string; businessId?: string; role?: string };
const ctx = (req: Request) => (req as any).context as RequestContext;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const current = ctx(req);
  if (!current?.userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!current.businessId) return res.status(403).json({ error: 'Active business membership required.' });
  if (!['owner', 'manager'].includes((current.role || '').toLowerCase())) {
    return res.status(403).json({ error: 'Only an Owner or Manager can discover provider resources.' });
  }
  next();
}

async function getConnection(req: Request, provider: IntegrationProvider) {
  const current = ctx(req);
  const { data, error } = await current.db
    .from('integrations')
    .select('*')
    .eq('business_id', current.businessId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function jsonGet(url: string, token: string, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...extraHeaders },
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `Provider discovery failed (${response.status}).`);
  return body;
}

function resource(id: string, name: string, type: string, metadata: Record<string, unknown> = {}) {
  return { id, externalId: id, name, type, metadata };
}

async function discoverMeta(token: string) {
  const graphBase = (process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com').replace(/\/$/, '');
  const [pagesResult, adsResult] = await Promise.allSettled([
    jsonGet(`${graphBase}/me/accounts?fields=id,name,instagram_business_account&limit=100`, token),
    jsonGet(`${graphBase}/me/adaccounts?fields=id,name,account_status&limit=100`, token),
  ]);

  const resources: any[] = [];
  const warnings: string[] = [];
  if (pagesResult.status === 'fulfilled') {
    for (const page of pagesResult.value?.data || []) {
      resources.push(resource(page.id, page.name || page.id, 'Facebook Page', { instagramBusinessAccountId: page.instagram_business_account?.id || null }));
      if (page.instagram_business_account?.id) {
        resources.push(resource(page.instagram_business_account.id, `${page.name || page.id} Instagram`, 'Instagram Professional'));
      }
    }
  } else warnings.push(`Facebook Pages: ${pagesResult.reason?.message || 'discovery failed'}`);

  if (adsResult.status === 'fulfilled') {
    for (const account of adsResult.value?.data || []) {
      resources.push(resource(account.id, account.name || account.id, 'Meta Ad Account', { accountStatus: account.account_status }));
    }
  } else warnings.push(`Meta Ad Accounts: ${adsResult.reason?.message || 'discovery failed'}`);

  return { resources, warnings };
}

async function discoverGoogle(token: string) {
  const tasks: Array<Promise<{ service: string; resources: any[] }>> = [];

  tasks.push(jsonGet('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', token).then((body) => ({
    service: 'GA4',
    resources: (body.accountSummaries || []).flatMap((account: any) => [
      resource(account.account || account.name, account.displayName || account.account || account.name, 'Google Analytics Account'),
      ...(account.propertySummaries || []).map((property: any) =>
        resource(property.property, property.displayName || property.property, 'GA4 Property', { parent: property.parent, canEdit: property.canEdit }),
      ),
    ]),
  })));

  tasks.push(jsonGet('https://www.googleapis.com/webmasters/v3/sites', token).then((body) => ({
    service: 'Search Console',
    resources: (body.siteEntry || []).map((site: any) => resource(site.siteUrl, site.siteUrl, 'Search Console Property', { permissionLevel: site.permissionLevel })),
  })));

  tasks.push(jsonGet('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=50', token).then((body) => ({
    service: 'YouTube',
    resources: (body.items || []).map((channel: any) => resource(channel.id, channel.snippet?.title || channel.id, 'YouTube Channel')),
  })));

  tasks.push(jsonGet('https://tagmanager.googleapis.com/tagmanager/v2/accounts?pageSize=300', token).then((body) => ({
    service: 'Tag Manager',
    resources: (body.account || []).map((account: any) => resource(account.accountId || account.path, account.name || account.accountId, 'Google Tag Manager Account')),
  })));

  const adsDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (adsDeveloperToken) {
    tasks.push(jsonGet(
      `https://googleads.googleapis.com/${process.env.GOOGLE_ADS_API_VERSION || 'v24'}/customers:listAccessibleCustomers`,
      token,
      { 'developer-token': adsDeveloperToken },
    ).then((body) => ({
      service: 'Google Ads',
      resources: (body.resourceNames || []).map((name: string) => {
        const customerId = name.replace('customers/', '');
        return resource(customerId, `Google Ads ${customerId}`, 'Google Ads Customer');
      }),
    })));
  }

  tasks.push(jsonGet('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', token).then((body) => ({
    service: 'Business Profile',
    resources: (body.accounts || []).map((account: any) => resource(account.name, account.accountName || account.name, 'Google Business Profile Account', { accountType: account.type })),
  })));

  if (process.env.GOOGLE_MERCHANT_DISCOVERY_URL) {
    tasks.push(jsonGet(process.env.GOOGLE_MERCHANT_DISCOVERY_URL, token).then((body) => ({
      service: 'Merchant Center',
      resources: (body.accounts || body.resources || []).map((account: any) => resource(String(account.id || account.name), account.name || String(account.id), 'Google Merchant Center Account')),
    })));
  }

  const settled = await Promise.allSettled(tasks);
  const resources: any[] = [];
  const warnings: string[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') resources.push(...result.value.resources);
    else warnings.push(result.reason?.message || 'Google sub-service discovery failed.');
  }
  return { resources, warnings };
}

async function discoverPinterest(token: string) {
  const body = await jsonGet('https://api.pinterest.com/v5/ad_accounts?page_size=100', token);
  return {
    resources: (body.items || []).map((account: any) => resource(account.id, account.name || account.id, 'Pinterest Ad Account', { status: account.status })),
    warnings: [],
  };
}

async function discoverShopify(token: string, providerContext: Record<string, any>) {
  const shop = providerContext.shop;
  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error('Shopify store context is invalid.');
  const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({
      query: `query VowOSIntegrationResources { shop { id name myshopifyDomain } locations(first: 100) { nodes { id name isActive address { city provinceCode } } } }`,
    }),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || body.errors) throw new Error(body?.errors?.[0]?.message || 'Shopify resource discovery failed.');
  const shopNode = body?.data?.shop;
  const locations = body?.data?.locations?.nodes || [];
  return {
    resources: [
      resource(shopNode?.id || shop, shopNode?.name || shop, 'Shopify Store', { domain: shopNode?.myshopifyDomain || shop }),
      ...locations.map((location: any) => resource(location.id, location.name || location.id, 'Shopify Location', {
        active: location.isActive,
        city: location.address?.city,
        provinceCode: location.address?.provinceCode,
      })),
    ],
    warnings: [],
  };
}

async function discoverConfigurable(provider: IntegrationProvider, token: string) {
  const envName = `${provider.toUpperCase()}_RESOURCE_DISCOVERY_URL`;
  const url = process.env[envName];
  if (!url) return { resources: [], warnings: [`${envName} is not configured for automatic resource discovery.`] };
  const body = await jsonGet(url, token);
  const items = body.data || body.items || body.resources || [];
  return {
    resources: items.map((item: any) => resource(String(item.id || item.external_id || item.name), item.name || item.display_name || String(item.id), `${PROVIDERS[provider].title} Resource`)),
    warnings: [],
  };
}

integrationDiscoveryRouter.get('/:provider/resources/discover', requireAdmin, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;

  try {
    const connection = await getConnection(req, provider);
    if (!connection) return res.status(404).json({ error: 'Connect the provider before discovering resources.' });

    if (provider === 'web_forms') {
      return res.json({ resources: connection.selected_resources || [], warnings: [] });
    }
    if (provider === 'klaviyo' || provider === 'call_tracking') {
      return res.json({
        resources: connection.external_organization_id
          ? [resource(connection.external_organization_id, connection.external_organization_name || provider, connection.external_organization_type || `${provider}_account`)]
          : [],
        warnings: [],
      });
    }

    const token = decryptSecret(connection.access_token_ciphertext);
    if (!token) return res.status(409).json({ error: 'Provider token is unavailable. Reconnect the provider.' });
    const providerContext = connection.metadata?.providerContext || {};

    let result: { resources: any[]; warnings: string[] };
    switch (provider) {
      case 'meta': result = await discoverMeta(token); break;
      case 'google': result = await discoverGoogle(token); break;
      case 'pinterest': result = await discoverPinterest(token); break;
      case 'shopify': result = await discoverShopify(token, providerContext); break;
      case 'tiktok':
      case 'linkedin': result = await discoverConfigurable(provider, token); break;
      default: result = { resources: [], warnings: [] };
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Unable to discover provider resources.' });
  }
});
