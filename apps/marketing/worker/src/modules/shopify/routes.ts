import { Router } from 'express';
import { shopifyComplianceRouter } from './compliance';
import { shopifyOrdersRouter } from './orders';
import { shopifyHardeningRouter } from './hardening';
import { shopifyRouter as legacyShopifyRouter } from './legacyRoutes';

export {
  ShopifyConnectionInactiveError,
  resolveShopifyTenant,
  verifyShopifyWebhookHmac,
} from './hardening';

/**
 * Shopify routes are intentionally layered. Narrow compliance handlers and the
 * shop-scoped order pipeline run first. Security/idempotency hardening runs
 * next; the stable connect route remains in the legacy router until it is
 * independently migrated. Express stops at the first handler that responds, so
 * hardened paths override legacy implementations without duplicating OAuth
 * connect-state logic.
 */
export const shopifyRouter = Router();
shopifyRouter.use(shopifyComplianceRouter);
shopifyRouter.use(shopifyOrdersRouter);
shopifyRouter.use(shopifyHardeningRouter);
shopifyRouter.use(legacyShopifyRouter);
