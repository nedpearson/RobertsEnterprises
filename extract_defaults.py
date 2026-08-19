import os

with open("apps/marketing/src/lib/settings.ts", "r", encoding="utf-8") as f:
    content = f.read()

defaults = """
export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  maxSimultaneousStylists: 4,
  allowOverlappingAppts: false,
  stylistCooldownMinutes: 15,
  apptTypeConfigs: [
    { name: "Bridal Consultation", durationMinutes: 90, prepBufferMinutes: 15, cleanupBufferMinutes: 15, active: True },
    { name: "Fitting", durationMinutes: 60, prepBufferMinutes: 15, cleanupBufferMinutes: 15, active: True },
    { name: "Alterations", durationMinutes: 45, prepBufferMinutes: 10, cleanupBufferMinutes: 10, active: True },
    { name: "Pickup", durationMinutes: 30, prepBufferMinutes: 5, cleanupBufferMinutes: 5, active: True },
    { name: "Accessories", durationMinutes: 45, prepBufferMinutes: 10, cleanupBufferMinutes: 10, active: True },
  ],
};
""".replace("True", "true")

target = "export const DEFAULT_BOOKING_SETTINGS"
content = content.replace(target, defaults + "\n" + target)

with open("apps/marketing/src/lib/settings.ts", "w", encoding="utf-8") as f:
    f.write(content)

