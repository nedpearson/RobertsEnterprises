import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("supabaseAdmin.", "supabaseAdmin!.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated test non-null assertions")
