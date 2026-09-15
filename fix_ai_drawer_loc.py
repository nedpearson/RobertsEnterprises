import re

file_path = "apps/marketing/src/pages/scheduling/AIAssignmentDrawer.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_content = """<div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Top Recommendations
          </div>"""

new_content = """<div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(!request?.preferred_location_id && !request?.location_id) && (
            <div className="p-4 bg-red-50 text-red-900 rounded-md border border-red-200 mb-4">
              <AlertTriangle className="h-5 w-5 mb-2" />
              <h3 className="font-semibold">Location Review Required</h3>
              <p className="text-sm">This request cannot be assigned because its location is not configured. Select a location to continue.</p>
            </div>
          )}
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Top Recommendations
          </div>"""

content = content.replace(old_content, new_content)

# Disable buttons if no location
old_button = """disabled={rec.score === 0 || rec.confidence === 'Low'}"""
new_button = """disabled={rec.score === 0 || rec.confidence === 'Low' || (!request?.preferred_location_id && !request?.location_id)}"""

content = content.replace(old_button, new_button)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AIAssignmentDrawer locations")
