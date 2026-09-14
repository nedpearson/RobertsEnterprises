import re

file_path = "apps/marketing/src/data/featureRegistry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("route: '/demo/appointments/calendar'", "route: '/demo/appointments/schedule'")
content = content.replace("route: '/demo/appointments/booking-requests'", "route: '/demo/appointments/requests'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed featureRegistry.ts routes")
