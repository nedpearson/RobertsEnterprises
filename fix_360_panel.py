import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update function signature
content = re.sub(
    r"export function Request360Panel\(\{([^\}]+)\}: \{([^\}]+)\}\)",
    r"export function Request360Panel({\1, onAssign}: {\2, onAssign?: (request: any) => void})",
    content
)

# 2. Update renderMissing to take onClick
content = content.replace(
    "const renderMissing = (label: string) => (",
    "const renderMissing = (label: string, onClick?: () => void) => ("
)
content = content.replace(
    '<Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-brand-primary bg-brand-soft/50 hover:bg-brand-soft hover:text-brand-primary">',
    '<Button variant="ghost" size="sm" onClick={onClick} className="h-6 px-2 text-xs text-brand-primary bg-brand-soft/50 hover:bg-brand-soft hover:text-brand-primary">'
)

# 3. Update renderMissing('Stylist') calls to pass onAssign
content = content.replace(
    "renderMissing('Stylist')",
    "renderMissing('Stylist', () => onAssign?.(request))"
)

# 4. Update Assign Stylist buttons
content = content.replace(
    '<Button size="sm" variant="default" className="h-7 text-xs bg-brand-primary text-white">Assign Stylist</Button>',
    '<Button size="sm" variant="default" className="h-7 text-xs bg-brand-primary text-white" onClick={() => onAssign?.(request)}>Assign Stylist</Button>'
)
content = content.replace(
    '<Button variant="default" className="bg-brand-primary">Assign Stylist</Button>',
    '<Button variant="default" className="bg-brand-primary" onClick={() => onAssign?.(request)}>Assign Stylist</Button>'
)

# 5. Update the Unassigned link button
content = content.replace(
    'Unassigned <Button size="sm" variant="link" className="h-5 p-0 text-xs">Assign</Button>',
    'Unassigned <Button size="sm" variant="link" className="h-5 p-0 text-xs" onClick={() => onAssign?.(request)}>Assign</Button>'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Request360Panel.tsx")
