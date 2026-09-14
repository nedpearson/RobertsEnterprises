import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add activeLocations to useVowosData destructure
content = content.replace(
    'const { selectedLocationIds, activeLocation } = useVowosData();',
    'const { selectedLocationIds, activeLocation, activeLocations } = useVowosData();'
)

# Add resolveLocationSlug to the vowosData import if not there
if "resolveLocationSlug" not in content:
    content = content.replace(
        "import { useVowosData } from '@/contexts/VowosDataContext';",
        "import { useVowosData } from '@/contexts/VowosDataContext';\nimport { resolveLocationSlug } from '@/data/vowosData';"
    )

# Fix the location constant in the map
old_loc = r"const location = parsedNotes\['Store Location'\] \|\| req\.location_name \|\| 'Main Store';"
new_loc = r"""const locSlug = resolveLocationSlug(req.preferred_location_id || req.location_id || req.location);
                      const locObj = activeLocations.find((l: any) => l.id === locSlug);
                      const location = locObj ? `${locObj.business} - ${locObj.short}` : parsedNotes['Store Location'] || req.location_name || 'Main Store';"""
content = re.sub(old_loc, new_loc, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated UnifiedSchedulingWorkspace.tsx location logic")
