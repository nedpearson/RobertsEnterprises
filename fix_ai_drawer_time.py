import re

file_path = "apps/marketing/src/pages/scheduling/AIAssignmentDrawer.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_time = """<div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> 
                        {new Date(rec.recommended_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(rec.recommended_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>"""

new_time = """<div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> 
                        {new Date(rec.proposed_start_at || rec.recommended_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(rec.proposed_end_at || rec.recommended_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      {request.preferred_date_1 && rec.proposed_start_at && new Date(rec.proposed_start_at).toISOString().split('T')[0] !== new Date(request.preferred_date_1).toISOString().split('T')[0] && (
                        <div className="text-xs text-amber-600 mt-1">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Proposed date differs from requested date. Customer approval required.
                        </div>
                      )}"""

content = content.replace(old_time, new_time)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AIAssignmentDrawer time warnings")
