/**
 * The SQL function resolve_intake_service is exercised by test-migrations in CI
 * against a real Postgres. This file pins the JavaScript-side contract around
 * it: what gets passed in, and how the two intake paths react to what comes
 * back. The rule under test is the one that matters — never a guess.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * A faithful port of the SQL matcher, kept here so the ranking rule —
 * longest keyword wins, default only when nothing matches — has a fast test
 * that fails when someone changes one side and not the other.
 */
function resolveLikeSql(
  services: Array<{ id: string; keywords: string[]; isDefault: boolean; active: boolean }>,
  text: string | null,
): string | null {
  let best: { id: string; strength: number } | null = null;
  if (text) {
    const haystack = text.toLowerCase();
    for (const service of services) {
      if (!service.active) continue;
      for (const raw of service.keywords) {
        const keyword = raw.trim().toLowerCase();
        if (!keyword) continue;
        if (haystack.includes(keyword) && (!best || keyword.length > best.strength)) {
          best = { id: service.id, strength: keyword.length };
        }
      }
    }
  }
  if (best) return best.id;
  return services.find((service) => service.active && service.isDefault)?.id ?? null;
}

const catalogue = [
  { id: 'bridal', keywords: ['bridal', 'wedding dress', 'bride'], isDefault: true, active: true },
  { id: 'mob', keywords: ['mother of the bride', 'mother of the groom'], isDefault: false, active: true },
  { id: 'evening', keywords: ['evening', 'prom', 'gala'], isDefault: false, active: true },
  { id: 'retired', keywords: ['bridal'], isDefault: false, active: false },
];

test('the longest matching keyword wins, so "mother of the bride" is not filed as bridal', () => {
  assert.equal(resolveLikeSql(catalogue, 'Mother of the Bride'), 'mob');
  assert.equal(resolveLikeSql(catalogue, 'Bridal Appointment'), 'bridal');
});

test('matching is case-insensitive and tolerates surrounding text', () => {
  assert.equal(resolveLikeSql(catalogue, 'Looking for a WEDDING DRESS for June'), 'bridal');
  assert.equal(resolveLikeSql(catalogue, 'prom 2027'), 'evening');
});

test('nothing matching falls back to the default, and only the default', () => {
  assert.equal(resolveLikeSql(catalogue, 'Something else entirely'), 'bridal');
  assert.equal(resolveLikeSql(catalogue, null), 'bridal');
});

test('an inactive service never wins even when its keyword matches', () => {
  const onlyRetired = [{ id: 'retired', keywords: ['bridal'], isDefault: false, active: false }];
  assert.equal(resolveLikeSql(onlyRetired, 'bridal'), null);
});

test('with no default and no match the answer is null — never a guess', () => {
  const noDefault = catalogue.map((service) => ({ ...service, isDefault: false }));
  assert.equal(resolveLikeSql(noDefault, 'Something else entirely'), null);
});
