import re

with open('apps/marketing/src/pages/PlatformAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to add a "+ CREATE ORGANIZATION" button next to "Tenant Directory"
content = content.replace(
    "<CardTitle>Tenant Directory</CardTitle>",
    "<CardTitle>Tenant Directory</CardTitle>\n                    <Button onClick={() => navigate('/platform/organizations/new')} size=\"sm\" className=\"mt-2 bg-stone-900 text-white\">+ CREATE ORGANIZATION</Button>"
)

with open('apps/marketing/src/pages/PlatformAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
