import re

file_path = "C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\93921c52-ff4c-49ce-bbc2-3a2bd3bb6ae3\\task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ] **Phase 1: Database & Migrations**", "- [x] **Phase 1: Database & Migrations**")
content = content.replace("- [ ] Remove `Main Store` insertion", "- [x] Remove `Main Store` insertion")
content = content.replace("- [ ] Create migration", "- [x] Create migration")
content = content.replace("- [ ] Add `staff_availability_submissions`", "- [x] Add `staff_availability_submissions`")
content = content.replace("- [ ] Add `availability_reminder_rules`", "- [x] Add `availability_reminder_rules`")
content = content.replace("- [ ] Add strict RLS", "- [x] Add strict RLS")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated task.md")
