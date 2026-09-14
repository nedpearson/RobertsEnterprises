import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add the import
import_str = "import { AssignmentReviewSheet } from './components/AssignmentReviewSheet';"
if import_str not in content:
    content = content.replace(
        "import { DraggableAppointmentCard } from './components/DraggableAppointmentCard';",
        "import { DraggableAppointmentCard } from './components/DraggableAppointmentCard';\nimport { AssignmentReviewSheet } from './components/AssignmentReviewSheet';"
    )

# Add the render block
# We have a <BookAppointmentModal ... /> and <NewRequestModal ... /> at the bottom inside AppointmentsWorkspace.
# Wait, UnifiedSchedulingWorkspace is rendered inside AppointmentsWorkspace.
# We can render it near `<NewAppointmentModal>` or at the very end of UnifiedSchedulingWorkspace.
# Let's find the closing tag of UnifiedSchedulingWorkspace.

render_str = """
      {assigningRequest && (
        <AssignmentReviewSheet
          request={assigningRequest}
          staff={staff}
          context={{ stylists: staff, shifts: schedules, timeOff: timeOffRequests, appointments: appointments }}
          onClose={() => setAssigningRequest(null)}
          onConfirm={async (details) => {
            await new Promise((resolve, reject) => {
              assignRequest({
                requestId: details.requestId,
                employeeId: details.employeeId,
                locationId: assigningRequest.location_id || activeLocation?.id,
                businessId: businessId!,
                startAt: details.startAt,
                endAt: details.endAt
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
                  queryClient.invalidateQueries({ queryKey: ['appointments'] });
                  resolve(true);
                },
                onError: (err) => reject(err)
              });
            });
          }}
        />
      )}
"""
if "AssignmentReviewSheet" not in content[content.rfind("return"): ]:
    content = content.replace("    </div>\n  );\n}\n", render_str + "    </div>\n  );\n}\n")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected AssignmentReviewSheet into workspace.")
