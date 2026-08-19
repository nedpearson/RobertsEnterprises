import os

with open('apps/marketing/src/pages/scheduling/Request360Panel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = "import { DEFAULT_BOOKING_SETTINGS } from '@/lib/settings';\n" + content

with open('apps/marketing/src/pages/scheduling/Request360Panel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
