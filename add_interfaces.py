import os
with open("apps/marketing/src/lib/settings.ts", "r", encoding="utf-8") as f:
    content = f.read()

new_interfaces = """
export interface ApptTypeConfig {
  name: string;
  durationMinutes: number;
  prepBufferMinutes: number;
  cleanupBufferMinutes: number;
  active: boolean;
}

export interface SchedulingSettings {
  maxSimultaneousStylists: number;
  allowOverlappingAppts: boolean;
  stylistCooldownMinutes: number;
  apptTypeConfigs: ApptTypeConfig[];
}

export interface NotificationPref {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export interface NotificationSettings {
  appointments: NotificationPref;
  sales: NotificationPref;
  inventory: NotificationPref;
  transfers: NotificationPref;
}

export interface StripeSettings {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  statementDescriptor: string;
}
"""

target = "export interface SettingsContext"
content = content.replace(target, new_interfaces + "\n" + target)

with open("apps/marketing/src/lib/settings.ts", "w", encoding="utf-8") as f:
    f.write(content)

