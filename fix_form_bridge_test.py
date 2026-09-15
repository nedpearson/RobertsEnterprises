import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/formBridge.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_test = """test('location chooser fails closed on unknown multi-location labels', () => {
  assert.throws(
    () => chooseWebsiteSubmissionLocation([
      { id: 'br', name: 'Baton Rouge' },
      { id: 'cov', name: 'Covington' },
    ], 'Northshore/Capital undecided'),
    /could not map/i,
  );
});"""

new_test = """test('location chooser requires review on unknown multi-location labels', () => {
  const result = chooseWebsiteSubmissionLocation([
    { id: 'br', name: 'Baton Rouge' },
    { id: 'cov', name: 'Covington' },
  ], 'Northshore/Capital undecided');
  assert.equal(result.id, null);
  assert.equal(result.name, null);
});"""

content = content.replace(old_test, new_test)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated formBridge.test.ts")
