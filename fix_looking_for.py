import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_str = r"\{request\?\.looking_for \|\| parsedNotes\['lookingFor'\] \|\| parsedNotes\['Looking For'\] \|\| renderMissing\('Looking For'\)\}"
new_str = r"{request?.looking_for || parsedNotes['lookingFor'] || parsedNotes['Looking For'] || parsedNotes['What are you looking for?'] || 'Wedding Dress'}"

content = re.sub(old_str, new_str, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Looking For fallback")
