import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace insert with slug
content = content.replace(
    "insert({ name: 'Test Biz' })",
    "insert({ name: 'Test Biz', slug: 'test-biz-e2e' })"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated test insert payload")
