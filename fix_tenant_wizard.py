import re

with open('apps/marketing/src/pages/PlatformAdmin/TenantWizard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "className={\w-full text-left px-4 py-2 rounded-lg text-sm transition-colors \\}",
    "className={w-full text-left px-4 py-2 rounded-lg text-sm transition-colors }"
)

with open('apps/marketing/src/pages/PlatformAdmin/TenantWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
