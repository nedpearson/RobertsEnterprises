import re

file_path = "apps/marketing/src/pages/workspaces/AppointmentsWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const { requestedTab, setTab } = useWorkspaceTab('appointments', 'calendar');", "const { requestedTab, setTab } = useWorkspaceTab('appointments', 'schedule');")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed AppointmentsWorkspace TS errors")
