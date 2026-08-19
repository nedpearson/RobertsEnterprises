import os
import re
import json

pattern = re.compile(r"resolveEffectiveSetting(?:<[^>]+>)?\(\s*['\"]([^'\"]+)['\"]")
pattern2 = re.compile(r"saveScopedSetting\(\s*['\"]([^'\"]+)['\"]")

usage = {}
for root, _, files in os.walk('apps/marketing/src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = set(pattern.findall(content) + pattern2.findall(content))
                for match in matches:
                    if match not in usage:
                        usage[match] = set()
                    usage[match].add(path.replace('\\\\', '/').replace('apps/marketing/', ''))

result = []
for key, files in usage.items():
    result.append({
        "Namespace": key.replace('_', ' ').title(),
        "Setting key": key,
        "Consumer modules": sorted(list(files))
    })

with open('apps/marketing/settings-runtime-map.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)

print("Updated settings-runtime-map.json")
