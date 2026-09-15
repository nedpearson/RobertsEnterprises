import re

file_path = "apps/marketing/src/pages/scheduling/AIAssignmentDrawer.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Disable button if score < 10 or confidence is low
old_button = """<Button 
                    className="w-full" 
                    variant={index === 0 ? "default" : "outline"}
                    onClick={() => onAssign(rec)}
                  >
                    Assign to {rec.employee?.first_name}
                  </Button>"""

new_button = """<Button 
                    className="w-full" 
                    variant={index === 0 && rec.score >= 50 ? "default" : "outline"}
                    disabled={rec.score === 0 || rec.confidence === 'Low'}
                    onClick={() => onAssign(rec)}
                  >
                    {rec.score === 0 ? 'Cannot Assign (Conflict)' : `Assign to ${rec.employee?.first_name}`}
                  </Button>"""

content = content.replace(old_button, new_button)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AIAssignmentDrawer buttons")
