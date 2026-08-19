import os
import json

with open('apps/marketing/settings-runtime-map.json', 'r') as f:
    map_data = json.load(f)

namespaces = {item['Setting key']: item for item in map_data}

found_keys = set()
for root, _, files in os.walk('apps/marketing/src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                for key in namespaces:
                    if f"'{key}'" in content or f'\"{key}\"' in content:
                        found_keys.add(key)

print("Found keys in code:")
for k in sorted(list(found_keys)):
    print(" -", k)

print("\nMissing keys (No usage found):")
for k in sorted(list(set(namespaces.keys()) - found_keys)):
    print(" -", k)
