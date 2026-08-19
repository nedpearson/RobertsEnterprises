import re

with open('apps/marketing/src/pages/PlatformAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    "import TenantControlCenter from './PlatformAdmin/TenantControlCenter';",
    "import TenantControlCenter from './PlatformAdmin/TenantControlCenter';\nimport TenantWizard from './PlatformAdmin/TenantWizard';"
)

# Add route
content = content.replace(
    "<Route path=\"/tenant/:tenantId\" element={<TenantControlCenter />} />",
    "<Route path=\"/tenant/:tenantId\" element={<TenantControlCenter />} />\n              <Route path=\"/organizations/new\" element={<TenantWizard />} />"
)

with open('apps/marketing/src/pages/PlatformAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
