import os
import re

pattern_resolve = re.compile(r"resolveEffectiveSetting[\s\S]*?\(\s*['\"]([^'\"]+)['\"]", re.MULTILINE)
pattern_save = re.compile(r"saveScopedSetting\(\s*['\"]([^'\"]+)['\"]", re.MULTILINE)

resolved = set()
saved = set()

for root, _, files in os.walk('apps/marketing/src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                resolved.update(pattern_resolve.findall(content))
                saved.update(pattern_save.findall(content))

print("Ghost Settings (Saved but NEVER resolved):")
for s in sorted(list(saved - resolved)):
    print(f" - {s}")

print("\nRead-only Settings (Resolved but NEVER saved):")
for s in sorted(list(resolved - saved)):
    print(f" - {s}")
