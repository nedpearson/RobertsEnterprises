import os
import re

files = [
    'apps/marketing/src/contexts/VowosDataContext.tsx',
    'apps/marketing/src/features/fitting-room/ConsultantFittingRoomView.tsx',
    'apps/marketing/src/pages/scheduling/Appointment360Panel.tsx',
    'apps/marketing/src/pages/scheduling/Request360Panel.tsx'
]

import_stmt = "import { useActiveBusinessContext } from '@/lib/services/schedulingService';\n"

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'useActiveBusinessContext' not in content:
        lines = content.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import = i
        lines.insert(last_import + 1, import_stmt.strip())
        content = '\n'.join(lines)
    
    # Replace businessId assignment
    content = re.sub(r"const businessId = ['\"]b0000000-0000-0000-0000-000000000000['\"];.*", 
                     "const { businessId = 'b0000000-0000-0000-0000-000000000000' } = useActiveBusinessContext();", 
                     content)

    content = re.sub(r"business_id: '?b0000000-0000-0000-0000-000000000000'?", 
                     "business_id: businessId || 'b0000000-0000-0000-0000-000000000000'", 
                     content)
    
    # Also defaultLocation in VowosDataContext.tsx
    if f.endswith('VowosDataContext.tsx'):
        # In VowosDataContext, the context already uses useActiveBusinessContext? Wait, let's see.
        content = re.sub(r"const defaultLocation: LocationId = activeLocation === 'all' \? 'ido-br' : activeLocation;",
                         "const { locationId } = useActiveBusinessContext();\n  const defaultLocation: LocationId = (locationId && locationId !== 'all') ? locationId as LocationId : (activeLocation === 'all' ? 'ido-br' : activeLocation);",
                         content)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Patched files successfully')
