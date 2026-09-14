import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add resolveLocationSlug import
if "resolveLocationSlug" not in content:
    content = content.replace(
        "import { useVowosData } from '@/contexts/VowosDataContext';",
        "import { useVowosData } from '@/contexts/VowosDataContext';\nimport { resolveLocationSlug } from '@/data/vowosData';"
    )

# 2. Extract activeLocations
old_start = r"(const queryClient = useQueryClient\(\);\s*const reqId = requestId \|\| request\?\.id;)"
new_start = r"""\1
  const { activeLocations } = useVowosData();
  const locSlug = resolveLocationSlug(request?.preferred_location_id || request?.location_id || request?.location);
  const locObj = activeLocations.find((l: any) => l.id === locSlug);
  const locationLabel = locObj ? `${locObj.business} - ${locObj.city}` : (request?.location_name || 'Main Store');
"""
content = re.sub(old_start, new_start, content)

# 3. Inject Store Location into the grid
old_grid = r"(<p className=\"text-sm font-medium\">\{request\?\.requestNumber \|\| request\?\.id\?\.substring\(0,8\) \|\| renderMissing\('Request Number'\)\}</p>\s*</div>)"
new_grid = r"""\1
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Store Location</p>
                  <p className="text-sm font-medium">{locationLabel}</p>
                </div>"""
content = re.sub(old_grid, new_grid, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Request360Panel.tsx")
