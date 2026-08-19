import os
import re

pattern = re.compile(r"resolveEffectiveSetting(?:<[^>]+>)?\(\s*['\"]([^'\"]+)['\"]")
pattern2 = re.compile(r"saveScopedSetting\(\s*['\"]([^'\"]+)['\"]")

found = set()
for root, _, files in os.walk('apps/marketing/src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                for match in pattern.findall(content):
                    found.add(match)
                for match in pattern2.findall(content):
                    found.add(match)

print("Actual settings keys in use:")
for k in sorted(list(found)):
    print(k)
