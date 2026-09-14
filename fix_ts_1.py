import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the assignRequest payload
old_payload = """                requestId: details.requestId,
                employeeId: details.employeeId,
                locationId: assigningRequest.location_id || activeLocation?.id,
                businessId: businessId!,
                startAt: details.startAt,
                endAt: details.endAt"""

new_payload = """                requestId: details.requestId,
                employeeId: details.employeeId,
                roomId: '',
                startAt: details.startAt,
                endAt: details.endAt"""

content = content.replace(old_payload, new_payload)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed UnifiedSchedulingWorkspace TS errors")
