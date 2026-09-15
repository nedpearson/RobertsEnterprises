import re

file_path = "C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\93921c52-ff4c-49ce-bbc2-3a2bd3bb6ae3\\task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ] **Phase 2: Backend & AI Workers**", "- [x] **Phase 2: Backend & AI Workers**")
content = content.replace("- [ ] Update `aiSchedulingAgent.ts`", "- [x] Update `aiSchedulingAgent.ts`")
content = content.replace("- [ ] Inject new Safe Auto-Assign scoring rules", "- [x] Inject new Safe Auto-Assign scoring rules")
content = content.replace("- [ ] Build `availabilityReminders.ts` worker job", "- [x] Build `availabilityReminders.ts` worker job")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated task.md for Phase 2")
