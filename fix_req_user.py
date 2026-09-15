import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_str = "  const [activeSection, setActiveSection] = useState('overview');"
new_str = "  const { user } = useAuth();\n  const [activeSection, setActiveSection] = useState('overview');"

content = content.replace(old_str, new_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected useAuth successfully")
