import re

with open('apps/marketing/src/components/vowos/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if "import FeatureExplorerModal" not in content:
    content = content.replace(
        "import { useDemo } from '@/lib/demo/demoContext';",
        "import { useDemo } from '@/lib/demo/demoContext';\nimport FeatureExplorerModal from '@/features/demo/FeatureExplorerModal';\nimport { Compass } from 'lucide-react';"
    )

# Add state
if "const [exploreOpen, setExploreOpen]" not in content:
    content = content.replace(
        "const { isDemoMode, activePersona } = useDemo();",
        "const { isDemoMode, activePersona } = useDemo();\n  const [exploreOpen, setExploreOpen] = React.useState(false);"
    )

# Add button
explore_btn = """
      {/* Feature Explorer Button */}
      {isDemoMode && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setExploreOpen(true)}
            className={lex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors bg-white/10 text-white hover:bg-white/20}
          >
            <Compass className="h-4 w-4" />
            {!compact && <span>Explore All Features</span>}
          </button>
        </div>
      )}
"""

if "Feature Explorer Button" not in content:
    content = content.replace(
        "{/* Main Navigation */}",
        explore_btn + "\n      {/* Main Navigation */}"
    )

# Add Modal
modal = """
      {/* Feature Explorer Modal */}
      <FeatureExplorerModal isOpen={exploreOpen} onClose={() => setExploreOpen(false)} />
"""

if "FeatureExplorerModal isOpen" not in content:
    content = content.replace(
        "</aside>",
        "  " + modal + "\n    </aside>"
    )

with open('apps/marketing/src/components/vowos/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
