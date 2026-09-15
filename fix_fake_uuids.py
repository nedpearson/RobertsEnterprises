import re

def fix_file(file_path, old_str, new_str):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace(old_str, new_str)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

# Request360Panel.tsx authorId for notes and tasks
fix_file("apps/marketing/src/pages/scheduling/Request360Panel.tsx", 
         "authorId: '00000000-0000-0000-0000-000000000000'",
         "authorId: user?.id || '00000000-0000-0000-0000-000000000000'")

# unified workspace drag and drop
fix_file("apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx",
         "employeeId: info.event.getResources?.[0]?.id || '00000000-0000-0000-0000-000000000000',",
         "employeeId: info.event.getResources?.[0]?.id || '',")

fix_file("apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx",
         "roomId: req.preferred_room_id || '00000000-0000-0000-0000-000000000000',",
         "roomId: req.preferred_room_id || null,")

fix_file("apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx",
         "const employeeId = info.event.getResources?.[0]?.id || info.event.extendedProps?.raw?.employee_id || '00000000-0000-0000-0000-000000000000';",
         "const employeeId = info.event.getResources?.[0]?.id || info.event.extendedProps?.raw?.employee_id || '';")

# NewAppointmentModal.tsx
fix_file("apps/marketing/src/pages/scheduling/NewAppointmentModal.tsx",
         "roomId: '00000000-0000-0000-0000-000000000000', // Default room for MVP",
         "roomId: null,")

# schedulingService.ts
fix_file("apps/marketing/src/lib/services/schedulingService.ts",
         "author_id: authorId || '00000000-0000-0000-0000-000000000000',",
         "author_id: authorId,")

print("Fixed fake UUIDs")
