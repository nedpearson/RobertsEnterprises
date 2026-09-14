import re

# File 1: UnifiedSchedulingWorkspace.tsx
file_path_1 = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path_1, "r", encoding="utf-8") as f:
    content_1 = f.read()

# Replace `${locObj.business} - ${locObj.city}` with just `locObj.short`
old_loc_text_1 = r"const location = locObj \? `\$\{locObj\.business\} - \$\{locObj\.city\}` : parsedNotes\['Store Location'\] \|\| req\.location_name \|\| 'Main Store';"
new_loc_text_1 = r"const location = locObj ? locObj.short : parsedNotes['Store Location'] || req.location_name || 'Main Store';"
content_1 = re.sub(old_loc_text_1, new_loc_text_1, content_1)

with open(file_path_1, "w", encoding="utf-8") as f:
    f.write(content_1)

# File 2: Request360Panel.tsx
file_path_2 = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path_2, "r", encoding="utf-8") as f:
    content_2 = f.read()

# Replace `${locObj.business} - ${locObj.city}` with just `locObj.short`
old_loc_text_2 = r"const locationLabel = locObj \? `\$\{locObj\.business\} - \$\{locObj\.city\}` : \(request\?\.location_name \|\| 'Main Store'\);"
new_loc_text_2 = r"const locationLabel = locObj ? locObj.short : (request?.location_name || 'Main Store');"
content_2 = re.sub(old_loc_text_2, new_loc_text_2, content_2)

with open(file_path_2, "w", encoding="utf-8") as f:
    f.write(content_2)

print("Fixed location text formatting in both files")
