import re

file_path = "apps/marketing/src/data/vowosData.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Change LocationId type to string
content = content.replace(
    "export type LocationId = 'ido-br' | 'ido-cov' | 'pc-br' | 'pc-cov';",
    "export type LocationId = string;"
)

# 2. Update resolveLocationSlug to return raw UUID if no match
old_resolve_slug = r"export const resolveLocationSlug = \(locIdOrSlug\?: string \| null\): LocationId => \{\s*if \(!locIdOrSlug\) return 'ido-br';\s*if \(locIdOrSlug in DEMO_LOCATION_MAP\) return locIdOrSlug as LocationId;\s*for \(const \[slug, uuid\] of Object\.entries\(DEMO_LOCATION_MAP\)\) \{\s*if \(uuid === locIdOrSlug\) return slug as LocationId;\s*\}\s*return 'ido-br';\s*\};"

new_resolve_slug = """export const resolveLocationSlug = (locIdOrSlug?: string | null): LocationId => {
  if (!locIdOrSlug) return 'ido-br';
  if (locIdOrSlug in DEMO_LOCATION_MAP) return locIdOrSlug as LocationId;
  for (const [slug, uuid] of Object.entries(DEMO_LOCATION_MAP)) {
    if (uuid === locIdOrSlug) return slug as LocationId;
  }
  return locIdOrSlug as LocationId; // Return raw UUID to support production databases
};"""

content = re.sub(old_resolve_slug, new_resolve_slug, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated vowosData.ts")
