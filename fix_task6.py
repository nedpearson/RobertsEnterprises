import re

file_path = "C:\\Users\\nedpe\\.gemini\\antigravity\\brain\\93921c52-ff4c-49ce-bbc2-3a2bd3bb6ae3\\task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ] **Phase 6: Testing & Certification**", "- [x] **Phase 6: Testing & Certification**")
content = content.replace("- [ ] Fix all broken worker tests", "- [x] Fix all broken worker tests")
content = content.replace("- [ ] Write `availability.test.ts`", "- [x] Write `availability.test.ts`")
content = content.replace("- [ ] Run `npm run certify`", "- [x] Run `npm run certify`")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated task.md for Phase 6")
