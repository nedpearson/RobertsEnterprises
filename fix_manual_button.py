import re

file_path = "apps/marketing/src/pages/scheduling/components/AssignmentReviewSheet.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("onClick={() => setIsSelectionPhase(false)}", "onClick={onClose}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Manual Choose button to just close")
