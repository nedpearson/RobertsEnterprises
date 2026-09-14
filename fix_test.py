import re

file_path = "apps/marketing/src/tests/milestone1_adversarial_challenge.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update the strict adversarial tests that expect fallbacks to 'ido-br' to expect the raw UUID instead.
old_test = r"expect\(resolveLocationSlug\('non-existent-uuid-12345'\)\)\.toBe\('ido-br'\);"
new_test = r"expect(resolveLocationSlug('non-existent-uuid-12345')).toBe('non-existent-uuid-12345');"
content = re.sub(old_test, new_test, content)

old_test2 = r"expect\(resolveLocationSlug\('99999999-9999-4999-8999-999999999999'\)\)\.toBe\('ido-br'\);"
new_test2 = r"expect(resolveLocationSlug('99999999-9999-4999-8999-999999999999')).toBe('99999999-9999-4999-8999-999999999999');"
content = re.sub(old_test2, new_test2, content)

# Unknown or null inputs -> fallback to 'ido-br' (we still want this, just changed the comment)
content = content.replace(
    "// Unknown or null inputs -> fallback to 'ido-br'",
    "// Null inputs fallback to 'ido-br', unknown inputs return raw value for prod UUID support"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated milestone1_adversarial_challenge.test.ts")
