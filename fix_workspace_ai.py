import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_assign = """<AIAssignmentDrawer
            isOpen={!!assigningRequest}
            onClose={() => setAssigningRequest(null)}
            request={assigningRequest}"""

new_assign = """<AIAssignmentDrawer
            isOpen={!!assigningRequest}
            onClose={() => setAssigningRequest(null)}
            request={assigningRequest}"""

# I need to find where assigningRequest is set, which is onAssign={setAssigningRequest}.
# In Request360Panel or AIRequestCard, they call setAssigningRequest.
# Let's just make it block inside AIAssignmentDrawer if no location is present.
