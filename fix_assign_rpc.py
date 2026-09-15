import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_func = """export const useAssignAppointmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      employeeId: string;
      roomId: string;
      startAt: string;
      endAt: string;
    }) => {
      const { data, error } = await supabase.rpc('assign_appointment_request', {
        p_request_id: params.requestId,
        p_employee_id: params.employeeId,
        p_room_id: params.roomId,
        p_start_at: params.startAt,
        p_end_at: params.endAt
      });"""

new_func = """export const useAssignAppointmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      employeeId: string;
      roomId?: string | null;
      startAt: string;
      endAt: string;
    }) => {
      if (!params.employeeId || params.employeeId.trim() === '') {
        throw new Error("Assignment cannot be saved because no valid stylist record was selected.");
      }
      if (!params.requestId || params.requestId.trim() === '') {
        throw new Error("Assignment cannot be saved because no valid request record was found.");
      }
      
      const { data, error } = await supabase.rpc('assign_appointment_request', {
        p_request_id: params.requestId,
        p_employee_id: params.employeeId,
        p_room_id: params.roomId && params.roomId.trim() !== '' ? params.roomId : null,
        p_start_at: params.startAt,
        p_end_at: params.endAt
      });"""

content = content.replace(old_func, new_func)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated useAssignAppointmentRequest validation")
