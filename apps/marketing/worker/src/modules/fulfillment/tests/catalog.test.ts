import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionJourney, inferCatalogMapping, mapCatalogRow, moneyToCents } from '../catalog';

test('catalog field inference recognizes common designer export headers', () => {
  const mapping = inferCatalogMapping(['Style #', 'Designer', 'Wholesale Price', 'Retail Price', 'Color', 'Size', 'SKU']);
  assert.deepEqual(mapping, {
    'Style #': 'style_number', Designer: 'brand', 'Wholesale Price': 'cost_cents',
    'Retail Price': 'store_retail_cents', Color: 'color', Size: 'size', SKU: 'vendor_sku',
  });
});

test('catalog mapping normalizes currency and retains detailed product attributes', () => {
  const mapped = mapCatalogRow({ Style: 'AB-102', Retail: '$2,199.00', Cost: '$880', Fabric: 'Mikado', Color: 'Ivory' }, {
    Style: 'style_number', Retail: 'store_retail_cents', Cost: 'cost_cents', Fabric: 'fabric', Color: 'color',
  });
  assert.equal(mapped.style_number, 'AB-102');
  assert.equal(mapped.store_retail_cents, 219900);
  assert.equal(mapped.cost_cents, 88000);
  assert.equal(mapped.fabric, 'Mikado');
  assert.equal(mapped.errors.length, 0);
  assert.equal(moneyToCents('invalid'), null);
});

test('customer journeys can only move through the intentional lifecycle', () => {
  assert.equal(canTransitionJourney('order_submitted', 'vendor_confirmed'), true);
  assert.equal(canTransitionJourney('order_submitted', 'shipped'), false);
  assert.equal(canTransitionJourney('completed', 'alterations'), false);
  assert.equal(canTransitionJourney('received', 'ready_for_pickup'), true);
});
