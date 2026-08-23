import { Router } from 'express';
import { shopifyComplianceRouter } from './compliance';
import { shopifyHardeningRouter } from './hardening';
import { shopifyRouter as legacyShopifyRouter } from './legacyRoutes';

export {
  ShopifyConnectionInactiveError,
  resolveShopifyTenant,
  verifyShopifyWebhookHmac,
} from './hardening';

/**
 * Shopify routes are intentionally layered. Compliance handlers run first so
 * privacy exports get the narrowest possible customer scope. Security and
 * idempotency-sensitive production handlers run next; the stable connect route
 * remains in the legacy router until it is independently migrated. Express
 * stops at the first handler that sends a response, so hardened paths override
 * legacy implementations without duplicating OAuth connect-state logic.
 */
export const shopifyRouter = Router();
shopifyRouter.use(shopifyComplianceRouter);
shopifyRouter.use(shopifyHardeningRouter);
shopifyRouter.use(legacyShopifyRouter);
