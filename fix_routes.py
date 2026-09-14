import re

def replace_in_file(file_path, old_str, new_str):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace(old_str, new_str)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

replace_in_file(
    "apps/marketing/src/App.tsx",
    "to=\"/appointments?tab=calendar&mode=calendar\"",
    "to=\"/appointments?tab=schedule&mode=calendar\""
)

replace_in_file(
    "apps/marketing/src/lib/navigation/navigationRegistry.ts",
    "path: '/appointments?tab=calendar&mode=calendar'",
    "path: '/appointments?tab=schedule&mode=calendar'"
)

replace_in_file(
    "apps/marketing/src/lib/navigation/navigationRegistry.ts",
    "path: '/appointments?tab=booking-requests&mode=requests'",
    "path: '/appointments?tab=requests&mode=requests'"
)

replace_in_file(
    "apps/marketing/src/pages/scheduling/components/WaitlistIntelligenceModal.tsx",
    "navigate(`/appointments?tab=booking-requests&appointmentId=${firstMatch.id}`)",
    "navigate(`/appointments?tab=requests&appointmentId=${firstMatch.id}`)"
)

print("Fixed hardcoded old routes.")
