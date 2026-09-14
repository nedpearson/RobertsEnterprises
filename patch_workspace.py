import re
import sys

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update activeMode definition
content = content.replace(
    "const activeMode: SchedulingMode = ['calendar', 'requests', 'workforce', 'ai', 'capacity'].includes(rawMode || '')",
    "const activeMode: SchedulingMode = ['calendar', 'requests', 'waitlist', 'workforce', 'ai', 'capacity'].includes(rawMode || '')"
)
content = content.replace(
    "export type SchedulingMode = 'calendar' | 'requests' | 'workforce' | 'ai' | 'capacity';",
    "export type SchedulingMode = 'calendar' | 'requests' | 'waitlist' | 'workforce' | 'ai' | 'capacity';"
)

# 2. Update queueRef activeMode
content = content.replace(
    "if (queueRef.current && activeMode === 'calendar') {",
    "if (queueRef.current && activeMode === 'requests') {"
)

# 3. Swap the left panel for 'calendar' to be 'requests'
# Let's find the exact block: `{activeMode === 'calendar' && (` and change it to `{activeMode === 'requests' && (`
# But there's another `{activeMode === 'requests' && (` block below that we need to disable or rename.
content = content.replace(
    "{activeMode === 'calendar' && (\n              <div className=\"p-4 flex flex-col h-full overflow-y-auto\">\n                <h3 className=\"font-semibold text-sm text-stone-900 mb-3 flex items-center justify-between\">\n                  <span>Unassigned Requests</span>",
    "{activeMode === 'requests' && (\n              <div className=\"p-4 flex flex-col h-full overflow-y-auto\">\n                <h3 className=\"font-semibold text-sm text-stone-900 mb-3 flex items-center justify-between\">\n                  <span>Unassigned Requests</span>"
)

# Disable the old requests left panel by changing it to 'OLD_REQUESTS_PANEL_HIDDEN'
content = content.replace(
    "{activeMode === 'requests' && (\n              <div className=\"p-4 flex flex-col h-full overflow-y-auto\">\n                <div className=\"grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 mb-4\"",
    "{activeMode === 'OLD_REQUESTS_PANEL_HIDDEN' && (\n              <div className=\"p-4 flex flex-col h-full overflow-y-auto\">\n                <div className=\"grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 mb-4\""
)

# 4. Modify Center Panel to show calendar on BOTH 'calendar' and 'requests' modes
content = content.replace(
    "{activeMode === 'calendar' && (\n              <Card className=\"h-full flex flex-col shadow-xs border-stone-200 overflow-hidden\">",
    "{(activeMode === 'calendar' || activeMode === 'requests') && (\n              <Card className=\"h-full flex flex-col shadow-xs border-stone-200 overflow-hidden\">"
)

# Disable the old requests center panel
content = content.replace(
    "{activeMode === 'requests' && (\n              <div className=\"space-y-4\">\n                <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/60 pb-3\">",
    "{activeMode === 'OLD_REQUESTS_PANEL_HIDDEN' && (\n              <div className=\"space-y-4\">\n                <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/60 pb-3\">"
)

# 5. Add Assignment Review Modal Logic
# Inside `handleEventReceive`:
# "Dragging must not silently change the customer's requested time. If the selected time differs, show a confirmation dialog explaining the difference and requiring approval before saving or sending a reschedule message."
# Wait, handleEventReceive currently just saves it directly:
# `assignRequest({ requestId, employeeId: '...
# I'll replace `handleEventReceive`

old_handleEventReceive = """const handleEventReceive = async (info: any) => {
    const requestId = info.event.id;
    const dropTime = info.event.start;
    const dropEndTime = new Date(dropTime.getTime() + 90 * 60 * 1000); // 1.5 hrs default

    const req = requests.find((r: any) => r.id === requestId);
    if (!req) {
      info.revert();
      return;
    }

    // Identify consultant ID from resource if using resource timeline
    // For now, if no resource, prompt or assign to a default
    const employeeId = info.event.getResources ? info.event.getResources()[0]?.id : staff[0]?.id;

    if (!employeeId) {
      toast.error('No consultant selected');
      info.revert();
      return;
    }

    try {
      await assignRequest({
        requestId,
        employeeId,
        locationId: req.location_id || activeLocation?.id,
        businessId: businessId!,
        startAt: dropTime.toISOString(),
        endAt: dropEndTime.toISOString()
      }, {
        onSuccess: () => {
          info.event.remove(); // Remove from calendar so useAppointments takes over
          toast.success('Consultant assigned successfully');
          queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onError: () => {
          info.revert();
        }
      });
    } catch (e) {
      info.revert();
    }
  };"""

new_handleEventReceive = """const handleEventReceive = async (info: any) => {
    const requestId = info.event.id;
    const dropTime = info.event.start;
    const dropEndTime = new Date(dropTime.getTime() + 90 * 60 * 1000); // 1.5 hrs default

    const req = requests.find((r: any) => r.id === requestId);
    if (!req) {
      info.revert();
      return;
    }

    const employeeId = info.event.getResources ? info.event.getResources()[0]?.id : (staff.length > 0 ? staff[0].id : null);
    
    // Instead of silently saving, we intercept this and open the Assignment Review modal.
    // Revert the calendar visually immediately, the modal handles the final assignment.
    info.revert();
    
    if (!employeeId) {
      toast.error('No consultant available to assign.');
      return;
    }

    const assignmentData = {
      ...req,
      proposedEmployeeId: employeeId,
      proposedStartAt: dropTime.toISOString(),
      proposedEndAt: dropEndTime.toISOString(),
    };
    
    setAssigningRequest(assignmentData);
  };"""

content = content.replace(old_handleEventReceive, new_handleEventReceive)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched UnifiedSchedulingWorkspace.tsx")
