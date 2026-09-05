# Shopify integration

Maps a connected Shopify store into VowOS at full grain: orders and line items,
refunds, fulfilment, customers, catalog, and per-location inventory.

Written against the 2026-09-04 mapping audit. Read `DEPLOY` below before the
first deploy — two of the steps are one-time and the integration stays partly
dark without them.

## Layout

| File | Responsibility |
| --- | --- |
| `oauth.ts` | Scopes, state signing, callback HMAC, token exchange, per-store app overrides |
| `admin.ts` | Admin REST client — bounded timeouts, 429/5xx retry with `Retry-After`, cursor pagination |
| `webhookRegistry.ts` | Topic list, subscription reconciliation, delivery health |
| `context.ts` | The verification prologue every webhook shares: HMAC → tenant → dedupe → handler |
| `locations.ts` | Shopify location ↔ VowOS location mapping, plus the operator API and order backfill |
| `orderMapper.ts` | Pure payload → row mapping. No I/O, fully unit-tested |
| `orderService.ts` | Order + line-item persistence, customer identity, appointment creation |
| `catalogSync.ts` | Products, variants, inventory levels, historical order backfill |
| `handlers.ts` | One function per topic. Mapping only — no security logic |
| `routes.ts` | Wiring: OAuth, diagnostics, operator actions, webhook mounts |

## Security invariants

These are load-bearing. Changing any of them reopens a vulnerability class that
has already been fixed once in this codebase.

1. **The webhook HMAC is computed over the exact raw body.** `worker/src/index.ts`
   captures `req.rawBody` in `express.json({ verify })` before parsing. Do not
   move the Shopify routes ahead of that middleware, and do not re-serialize
   `req.body` to verify — key order and whitespace will differ and every
   delivery will fail.
2. **The tenant comes only from `X-Shopify-Shop-Domain`**, which is inside the
   HMAC envelope. Nothing in the payload may select an organization. Store keys
   and line-item properties may refine a *location*; they can never choose a
   business or a brand.
3. **Every topic goes through `shopifyWebhook()`** in `context.ts`. A handler
   that implements its own HMAC check is the first copy to drift.
4. **`growth_provider_secrets` is service-role only.** RLS is on with no
   policies. Read tokens via `getShopifyAccessToken()`, never from the browser.

## Status codes

Shopify retries any non-2xx up to 19 times over 48 hours. Getting this backwards
either loses orders or produces a retry storm.

| Situation | Response | Why |
| --- | --- | --- |
| Bad or missing signature | `401` | Not from Shopify |
| Verified, store unknown to VowOS | `200` + `ignored` | Retrying will not make it known |
| Verified, store disconnected | `410` | Deliberate local state |
| Verified, mappable, handled | `200` | Done |
| Verified, transient failure | `500` | Retrying will help |
| Compliance topics | always `200` | Shopify records non-2xx as a compliance failure |

## Topics

`orders/create`, `orders/updated`, `orders/cancelled`, `orders/fulfilled`,
`refunds/create`, `fulfillments/create`, `fulfillments/update`,
`products/create`, `products/update`, `products/delete`,
`inventory_levels/update`, `customers/create`, `customers/update`,
`app/uninstalled`.

Plus the three mandatory compliance topics, which are configured in the Shopify
**Partner dashboard**, not through the Admin API:

- `customers/data_request` → `/api/shopify/webhooks/compliance/customers-data-request`
- `customers/redact` → `/api/shopify/webhooks/compliance/customers-redact`
- `shop/redact` → `/api/shopify/webhooks/compliance/shop-redact`

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `SHOPIFY_CLIENT_ID` | yes | Default app |
| `SHOPIFY_CLIENT_SECRET` | yes | Also the fallback webhook secret |
| `SHOPIFY_OAUTH_REDIRECT_URI` | yes | Must end `/api/shopify/callback` — the webhook base is derived from it |
| `SHOPIFY_WEBHOOK_SECRET` | no | Overrides the client secret for webhook HMAC |
| `SHOPIFY_STATE_SECRET` | recommended | Dedicated OAuth state signing key |
| `SHOPIFY_STORE_CONFIGS_JSON` | no | Per-store app credentials, keyed by permanent shop domain |
| `SHOPIFY_WEBHOOK_CALLBACK_BASE` | no | Only if webhooks must land on a different host from OAuth |
| `SHOPIFY_REQUEST_ALL_ORDERS` | no | `true` once Shopify approves `read_all_orders` |
| `SHOPIFY_HTTP_TIMEOUT_MS` | no | Default 15000 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Sole path to stored tokens |

Non-Plus Shopify stores cannot share one custom-distribution app. Roberts
Enterprises runs independent stores, so each gets its own entry in
`SHOPIFY_STORE_CONFIGS_JSON`:

```json
{
  "proper-and-co.myshopify.com": {
    "clientId": "...",
    "clientSecret": "...",
    "redirectUri": "https://api.vowos.bridgebox.ai/api/shopify/callback",
    "webhookSecret": "..."
  }
}
```

## DEPLOY

1. **Apply the migration.** `supabase/migrations/20261001000024_shopify_production_grain.sql`.
   Everything is additive except `refunds.payment_id DROP NOT NULL`; snapshot
   first, because reverting that requires no null rows to exist. The three new
   tables ship RLS **and** their tenant policies in the same transaction — do
   not split them, a table with RLS on and no policy denies everything.

2. **Check configuration.** `GET /api/shopify/setup/status` must return 200 with
   `redirectUriValid: true` and a non-null `webhookCallbackBase`.

3. **Reconnect each store.** The scope set widened (`read_inventory`,
   `read_locations`, `read_fulfillments`), and an existing install keeps its
   original narrower grant until the merchant reauthorizes. Reconnecting also
   registers the webhooks. For a store that must not be reconnected yet, run
   `POST /api/shopify/webhooks/reconcile` to register webhooks against the
   existing token — topics needing an ungranted scope will be recorded as
   `SCOPE_DENIED` rather than failing the whole run.

4. **Register the compliance topics** in the Shopify Partner dashboard using the
   three URLs above. These cannot be created through the Admin API.

5. **Map locations.** `GET /api/shopify/mappings/locations` returns both sides;
   `PUT` saves the set. **A default is mandatory** — Shopify sends no location on
   online orders, so without one that revenue cannot be attributed to a
   boutique. Then `POST /api/shopify/mappings/locations/backfill` to attribute
   orders already stored without one.

6. **Backfill.** `POST /api/shopify/sync/catalog` then `POST /api/shopify/sync/orders`.
   Order backfill runs through the same persistence path as the live webhook, so
   it converges with live deliveries instead of duplicating them. Without
   `read_all_orders` the window is the trailing 60 days; the response says which
   window it actually got.

7. **Verify.** `GET /api/shopify/health` — `healthy: true` requires a connected
   status, live subscriptions for the order-critical topics, no scope gaps, at
   least one location mapping, and no drift against Integration Operations.

Then confirm the grain in SQL:

```sql
select o.order_number, o.brand_id, o.location_id, o.currency, o.ordered_at,
       o.subtotal_cents, o.tax_cents, o.shipping_cents, o.total_cents,
       count(i.id) as line_items
from orders o
left join order_items i on i.order_id = o.id
where o.source_type = 'SHOPIFY'
group by o.id
order by o.ordered_at desc
limit 10;
```

**Done means:** `brand_id`, `location_id` and `ordered_at` are non-null,
`line_items > 0`, and `subtotal + tax + shipping = total_cents` for a live
order — not a fixture. (Shopify's subtotal is already net of discounts; the
discount is stored separately for reporting and must not be subtracted twice.)

## Rollback

The code is safe to revert on its own — the new columns and tables are additive
and simply stop being written. Two things do not revert cleanly:

- Webhook subscriptions stay registered with Shopify. Reverting the code while
  they exist means deliveries arrive at routes that no longer exist. Run
  `DELETE /api/shopify/disconnect` first, or delete them in Shopify Admin.
- `refunds.payment_id DROP NOT NULL` cannot be restored while order-linked
  refunds exist. Delete rows where `payment_id is null` first, or leave the
  column nullable.

## Testing

```bash
cd apps/marketing/worker && npm run build && npm test
```

Tests assert against production write paths. When adding one, assert on data the
production code actually produces: the audit found a green test proving location
mapping worked by injecting connection metadata that no code path ever wrote,
while the feature was entirely dead in production.
