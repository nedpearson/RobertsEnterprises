import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I added `const { user } = useAuth();` inside executeConfirm
# Let's move it to the component top level
old_exec = """    const { user } = useAuth();
    
    const executeConfirm = async (sendEmail: boolean, sendSms: boolean) => {"""
new_exec = """    const executeConfirm = async (sendEmail: boolean, sendSms: boolean) => {"""

content = content.replace(old_exec, new_exec)

# Now add it at the top level
old_top = """  export function Request360Panel({ reqId, onClose, onBack }: { reqId: string | null; onClose: () => void; onBack?: () => void }) {
    const { businessId, locationId } = useActiveBusinessContext();
"""
new_top = """  export function Request360Panel({ reqId, onClose, onBack }: { reqId: string | null; onClose: () => void; onBack?: () => void }) {
    const { user } = useAuth();
    const { businessId, locationId } = useActiveBusinessContext();
"""

content = content.replace(old_top, new_top)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed user variable in Request360Panel")
