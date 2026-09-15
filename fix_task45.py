import re

file_path = "C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\93921c52-ff4c-49ce-bbc2-3a2bd3bb6ae3\\task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ] **Phase 4: Frontend - Scheduling Workspace & AI Display**", "- [x] **Phase 4: Frontend - Scheduling Workspace & AI Display**")
content = content.replace("- [ ] Simplify `UnifiedSchedulingWorkspace.tsx`", "- [x] Simplify `UnifiedSchedulingWorkspace.tsx`")
content = content.replace("- [ ] Overhaul AI recommendation display", "- [x] Overhaul AI recommendation display")
content = content.replace("- [ ] Implement drag-and-drop", "- [x] Implement drag-and-drop")

content = content.replace("- [ ] **Phase 5: Frontend - Availability Planner & Self-Service**", "- [x] **Phase 5: Frontend - Availability Planner & Self-Service**")
content = content.replace("- [ ] Build 1-week/2-week Planner in `TeamTab.tsx`", "- [x] Build 1-week/2-week Planner in `TeamTab.tsx`")
content = content.replace("- [ ] Build `MyAvailabilityWorkspace.tsx`", "- [x] Build `MyAvailabilityWorkspace.tsx`")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated task.md for Phase 4 & 5")
