import re

file_path = "apps/marketing/worker/src/modules/shopify/tests/shopify.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("'Main Store'", "'I Do Bridal Couture - Baton Rouge'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated shopify.test.ts")
