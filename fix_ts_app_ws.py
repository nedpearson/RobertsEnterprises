import re

file_path = "apps/marketing/src/pages/workspaces/AppointmentsWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "t.id === 'requests' && pendingRequestsCount > 0 && (",
    "t.id === 'schedule' && pendingRequestsCount > 0 && ("
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed TS error in AppointmentsWorkspace.")
