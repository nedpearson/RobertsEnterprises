import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def inject_validation(mutation_name, param_checks, code):
    # Find the mutation block
    pattern = r'(export const ' + mutation_name + r' = \(\) => {[\s\S]*?mutationFn: async \([^)]*\) => {)'
    
    def repl(m):
        return m.group(1) + "\n" + param_checks
        
    return re.sub(pattern, repl, code)

# useAssignStaff
content = inject_validation('useAssignStaff', """        if (!employeeId || employeeId.trim() === '') throw new Error("Assignment cannot be saved because no valid stylist record was selected.");
        if (!appointmentId || appointmentId.trim() === '') throw new Error("Assignment cannot be saved because the appointment ID is missing.");
""", content)

# useRescheduleAppointment
content = inject_validation('useRescheduleAppointment', """        if (!params.newEmployeeId || params.newEmployeeId.trim() === '') throw new Error("Reschedule cannot be saved because no valid stylist record was selected.");
        if (!params.appointmentId || params.appointmentId.trim() === '') throw new Error("Reschedule cannot be saved because the appointment ID is missing.");
""", content)

# useConfirmAppointmentHold
content = inject_validation('useConfirmAppointmentHold', """        if (!params.employeeId || params.employeeId.trim() === '') throw new Error("Cannot confirm hold because no valid stylist record was selected.");
        if (!params.requestId || params.requestId.trim() === '') throw new Error("Cannot confirm hold because the request ID is missing.");
""", content)

# useCreateWalkIn
content = inject_validation('useCreateWalkIn', """        if (!params.employeeId || params.employeeId.trim() === '') throw new Error("Walk-in cannot be saved because no valid stylist record was selected.");
        if (!params.locationId || params.locationId.trim() === '') throw new Error("Walk-in cannot be saved because the location ID is missing.");
        if (!params.customerId || params.customerId.trim() === '') throw new Error("Walk-in cannot be saved because the customer ID is missing.");
""", content)

# useHandleCallout
content = inject_validation('useHandleCallout', """        if (!employeeId || employeeId.trim() === '') throw new Error("Cannot process callout because no valid employee was selected.");
""", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected UUID validations into schedulingService.ts")
