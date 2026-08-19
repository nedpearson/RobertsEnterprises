import os
import re

pattern = re.compile(r"interface\s+(\w+Settings)\s*{([^}]+)}")

for root, _, files in os.walk('apps/marketing/src/components/vowos/settings/tabs/'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                if matches:
                    for m in matches:
                        print(f"Found {m[0]} in {file}")
