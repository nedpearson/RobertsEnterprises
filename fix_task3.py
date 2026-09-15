import re

file_path = "C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\93921c52-ff4c-49ce-bbc2-3a2bd3bb6ae3\\task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ] **Phase 3: Frontend - Location Hierarchy & UI Cleanup**", "- [x] **Phase 3: Frontend - Location Hierarchy & UI Cleanup**")
content = content.replace("- [ ] Remove `DEFAULT_LOCATION_SETTINGS`", "- [x] Remove `DEFAULT_LOCATION_SETTINGS`")
content = content.replace("- [ ] Overhaul `LocationSelect.tsx`", "- [x] Overhaul `LocationSelect.tsx`")
content = content.replace("- [ ] Strip 'Main Store' fallbacks from `Staff360Modal.tsx`", "- [x] Strip 'Main Store' fallbacks from `Staff360Modal.tsx`")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated task.md for Phase 3")
