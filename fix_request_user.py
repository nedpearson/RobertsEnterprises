import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useAuth hook inside Request360Panel
pattern = r'(export function Request360Panel\([^)]+\) {)'
replacement = r'\1\n  const { user } = useAuth();'

content = re.sub(pattern, replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected useAuth successfully")
