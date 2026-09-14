import re

file_path = "apps/marketing/src/lib/navigation/navigationRegistry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "appointments: ['schedule', 'requests', 'waitlist', 'team-capacity', 'rules'],",
    "appointments: ['schedule', 'team', 'settings'],"
)
content = content.replace(
    "overview: 'schedule', calendar: 'schedule', appointments: 'schedule', 'booking-requests': 'requests', workforce: 'team-capacity', capacity: 'team-capacity', operations: 'rules',",
    "overview: 'schedule', calendar: 'schedule', appointments: 'schedule', 'booking-requests': 'schedule', requests: 'schedule', waitlist: 'schedule', workforce: 'team', capacity: 'team', operations: 'settings', rules: 'settings',"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated navigationRegistry tabs to 3 tabs.")
