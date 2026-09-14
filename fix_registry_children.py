import re

file_path = "apps/marketing/src/lib/navigation/navigationRegistry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to find the `id: 'appointments'` block and replace its children.
# Use regex to match the children array specifically for appointments.
pattern = r"(id:\s*'appointments'[\s\S]*?children:\s*\[)([\s\S]*?)(\]\s*\},\s*\{\s*id:\s*'customers')"

replacement = r"""\1
        { id: 'schedule', label: 'Schedule', path: '/appointments?tab=schedule', moduleKey: 'scheduling.core', searchKeywords: ['calendar', 'schedule', 'requests', 'waitlist'] },
        { id: 'team', label: 'Team', path: '/appointments?tab=team', moduleKey: 'scheduling.resources', searchKeywords: ['team', 'capacity', 'workforce'] },
        { id: 'settings', label: 'Settings', path: '/appointments?tab=settings', moduleKey: 'scheduling.core', searchKeywords: ['rules', 'settings', 'operations'] },
      \3"""

new_content = re.sub(pattern, replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated navigationRegistry children for 3 tabs.")
