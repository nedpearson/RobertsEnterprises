import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the onAssign in AIAssignmentDrawer call
old_on_assign = """onAssign={(rec) => {
            const startAtStr = assigningRequest.preferred_date_1 || new Date().toISOString().split('T')[0];
            const startDate = new Date(startAtStr);
            const validStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;
            assignRequest({
              requestId: assigningRequest.id,
              employeeId: rec.employee_id,
              roomId: assigningRequest.preferred_room_id || '00000000-0000-0000-0000-000000000000',
              startAt: validStartDate.toISOString(),
              endAt: new Date(validStartDate.getTime() + 60 * 60 * 1000).toISOString()
            });
            setAssigningRequest(null);
          }}"""

new_on_assign = """onAssign={(rec) => {
            const startAtStr = assigningRequest.preferred_date_1 || new Date().toISOString().split('T')[0];
            const startDate = new Date(startAtStr);
            const validStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;
            
            try {
              assignRequest({
                requestId: assigningRequest.id,
                employeeId: rec.employee_id || rec.stylistId,
                roomId: assigningRequest.preferred_room_id || null,
                startAt: rec.recommendedTime || validStartDate.toISOString(),
                endAt: rec.recommendedTime ? new Date(new Date(rec.recommendedTime).getTime() + 90 * 60 * 1000).toISOString() : new Date(validStartDate.getTime() + 90 * 60 * 1000).toISOString()
              });
              setAssigningRequest(null);
            } catch (err: any) {
              // The mutation itself will catch validation errors, or we can catch here if sync
            }
          }}"""

content = content.replace(old_on_assign, new_on_assign)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed workspace assignment call")
