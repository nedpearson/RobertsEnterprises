import re

with open('apps/marketing/src/components/demo/DemoModeBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Select imports
if "import { Select" not in content:
    content = content.replace(
        "import { RotateCcw, X, Sparkles, ArrowRight } from 'lucide-react';",
        "import { RotateCcw, X, Sparkles, ArrowRight, UserCircle } from 'lucide-react';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';"
    )

# Add enterDemoMode
if "enterDemoMode" not in content:
    content = content.replace(
        "const { isDemoMode, activePersona, activeStore, exitDemoMode, resetDemoSession } = useDemo();",
        "const { isDemoMode, activePersona, activeStore, exitDemoMode, resetDemoSession, enterDemoMode } = useDemo();"
    )

# Add Persona Switcher UI
switcher = """
        <div className="hidden md:flex items-center gap-1 border-r border-amber-400/30 pr-2 mr-1">
          <UserCircle className="h-4 w-4 text-amber-800" />
          <Select 
            value={activePersona.id} 
            onValueChange={(val) => enterDemoMode(val as any, activeStore.id)}
          >
            <SelectTrigger className="h-6 w-[120px] bg-transparent border-none focus:ring-0 px-1 text-xs font-bold text-amber-900 shadow-none">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="persona-owner">Owner</SelectItem>
              <SelectItem value="persona-stylist">Stylist</SelectItem>
              <SelectItem value="persona-frontdesk">Front Desk</SelectItem>
              <SelectItem value="persona-manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
"""

if "SelectTrigger" not in content:
    content = content.replace(
        "<div className=\"flex flex-wrap items-center justify-end gap-2\">",
        "<div className=\"flex flex-wrap items-center justify-end gap-2\">" + switcher
    )

with open('apps/marketing/src/components/demo/DemoModeBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
