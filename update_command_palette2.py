import re

with open('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

injection = \"\"\"
    featureResults.forEach(item => {
      list.push({
        type: item.type,
        id: item.id,
        label: item.label,
        sub: item.description,
        icon: item.icon,
        action: item.action
      });
    });
\"\"\"

if "featureResults.forEach" not in content:
    content = content.replace(
        "navResults.forEach((item) => {",
        injection + "\\n    navResults.forEach((item) => {"
    )

content = content.replace(
    "}, [navResults, brideResults, contractResults, invoiceResults]);",
    "}, [featureResults, navResults, brideResults, contractResults, invoiceResults]);"
)

with open('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
