import re

file_path = "apps/marketing/src/lib/navigation/navigationRegistry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "appointments: ['calendar', 'booking-requests', 'workforce', 'capacity', 'operations'],",
    "appointments: ['schedule', 'requests', 'waitlist', 'team-capacity', 'rules'],"
)
content = content.replace(
    "overview: 'calendar', schedule: 'calendar', appointments: 'calendar', requests: 'booking-requests',",
    "overview: 'schedule', calendar: 'schedule', appointments: 'schedule', 'booking-requests': 'requests', workforce: 'team-capacity', capacity: 'team-capacity', operations: 'rules',"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed navigationRegistry TS errors")
