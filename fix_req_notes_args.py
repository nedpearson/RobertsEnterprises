import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("useRequestNotes(reqId);", "useRequestNotes(reqId, request?.appointment_id);")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
