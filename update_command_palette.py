import re

with open('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { FEATURE_REGISTRY }" not in content:
    content = content.replace(
        "import { NAVIGATION_ITEMS, NavigationItem, ViewKey } from '@/lib/navigation/navigationRegistry';",
        "import { NAVIGATION_ITEMS, NavigationItem, ViewKey } from '@/lib/navigation/navigationRegistry';\nimport { FEATURE_REGISTRY } from '@/data/featureRegistry';"
    )

feature_results_code = """
  const featureResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return FEATURE_REGISTRY.filter(f => {
      if (f.releaseState !== 'PRODUCTION' && f.releaseState !== 'BETA') return false;
      return f.name.toLowerCase().includes(q) || f.oneSentenceValue.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
    }).map(f => ({
      id: 'feature_' + f.id,
      type: 'feature',
      label: f.name,
      description: Feature •  • ,
      icon: Sparkles,
      action: () => {
        onNavigate(f.route.replace('/demo', '').substring(1) as ViewKey);
        onClose();
      }
    }));
  }, [query, onNavigate, onClose]);
"""

if "const featureResults" not in content:
    content = content.replace(
        "const navResults = useMemo(() => {",
        feature_results_code + "\n  const navResults = useMemo(() => {"
    )

if "const allResults = [" not in content:
    pass # we'll replace the allResults memo directly

content = re.sub(
    r"const allResults = useMemo\(\(\) => \{\s*return \[\s*\.\.\.navItems,\s*\.\.\.brideItems,\s*\.\.\.contractItems,\s*\.\.\.invoiceItems,\s*\];\s*\}, \[navItems, brideItems, contractItems, invoiceItems\]\);",
    "const allResults = useMemo(() => { return [...featureResults, ...navItems, ...brideItems, ...contractItems, ...invoiceItems]; }, [featureResults, navItems, brideItems, contractItems, invoiceItems]);",
    content
)

with open('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
