import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'onDelete={(id) => handleDeleteRequest(id)}',
    'onDelete={(id) => handleDeleteRequest(id)}\n                onAssign={(req) => setAssigningRequest(req)}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated UnifiedSchedulingWorkspace.tsx")
