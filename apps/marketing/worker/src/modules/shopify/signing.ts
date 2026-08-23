/**
 * Shopify signs HTTPS webhooks with the app client secret. Older VowOS deploys
 * also carried SHOPIFY_WEBHOOK_SECRET; keep the alias for compatibility but
 * force it to the canonical key so stale duplicate configuration cannot split
 * webhook verification behavior by endpoint.
 */
export function canonicalizeShopifyWebhookSigningSecret(): string | undefined {
  const canonical = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  const legacy = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (canonical) {
    process.env.SHOPIFY_WEBHOOK_SECRET = canonical;
    return canonical;
  }
  return legacy || undefined;
}

canonicalizeShopifyWebhookSigningSecret();
