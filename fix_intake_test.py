import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/publicIntake.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("'Main Boutique'", "'I Do Bridal Couture - Baton Rouge'")
content = content.replace("'Main Store'", "'I Do Bridal Couture - Baton Rouge'")

# Since we removed the fallback for 1-location business and city match fallbacks, some tests might fail if they expected that.
# Let's find tests that expect 1-location fallback.
content = content.replace(
"""  it('falls back to the only location if ambiguous', async () => {
    const singleLoc = stubDb({
      businesses: [{ id: 'biz-proper', name: 'Proper & Co' }],
      business_sites: [{ id: 'site-x', business_id: 'biz-proper', name: 'Proper Site', domain: 'properandco.com', status: 'ACTIVE', booking_enabled: true }],
      locations: [{ id: 'loc-only', business_id: 'biz-proper', name: 'Some Name' }],
    });
    const r = await resolveStore(singleLoc, 'ido-br');
    assert.equal(r.locationId, 'loc-only');
  });""",
"""  it('returns null if location is ambiguous and does not fallback', async () => {
    const singleLoc = stubDb({
      businesses: [{ id: 'biz-proper', name: 'Proper & Co' }],
      business_sites: [{ id: 'site-x', business_id: 'biz-proper', name: 'Proper Site', domain: 'properandco.com', status: 'ACTIVE', booking_enabled: true }],
      locations: [{ id: 'loc-only', business_id: 'biz-proper', name: 'Some Name' }],
    });
    const r = await resolveStore(singleLoc, 'ido-br');
    assert.equal(r.locationId, null);
  });""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated publicIntake.test.ts")
