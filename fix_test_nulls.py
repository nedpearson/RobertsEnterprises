import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("biz.id", "biz!.id")
content = content.replace("req.id", "req!.id")
content = content.replace("customer.id", "customer!.id")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
