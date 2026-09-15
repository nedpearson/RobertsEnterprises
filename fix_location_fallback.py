import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const locationLabel = locObj ? locObj.short : (request?.location_name || 'Main Store');", "const locationLabel = locObj ? locObj.short : (request?.location_name || 'Location Review Required');")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

workspace_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const location = locObj ? locObj.short : parsedNotes['Store Location'] || req.location_name || 'Main Store';", "const location = locObj ? locObj.short : parsedNotes['Store Location'] || req.location_name || 'Location Review Required';")

with open(workspace_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed Main Store fallback")
