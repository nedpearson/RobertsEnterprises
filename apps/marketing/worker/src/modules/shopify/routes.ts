import { Router } from 'express';
import { shopifyHardeningRouter } from './hardening';
import { shopifyRouter as legacyShopifyRouter } from './legacyRoutes';

export {
  ShopifyConnectionInactiveError,
  resolveShopifyTenant,
  verifyShopifyWebhookHmac,
} from './hardening';

/**
 * Shopify routes are intentionally layered. Security/idempotency-sensitive
 * production handlers run first; the stable OAuth connect/callback flow remains
 * in the legacy router until it is independently migrated. Express stops at the
 * first handler that sends a response, so the hardening routes override exact
 * production paths without duplicating OAuth state logic.
 */
export const shopifyRouter = Router();
shopifyRouter.use(shopifyHardeningRouter);
shopifyRouter.use(legacyShopifyRouter);
