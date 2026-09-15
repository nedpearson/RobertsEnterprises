import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_func = """export const useAddAppointmentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, content, businessId }: { appointmentId: string, content: string, businessId: string }) => {
      const { data, error } = await supabase.from('internal_notes').insert({
        entity_id: appointmentId,
        entity_type: 'appointment',
        business_id: businessId,
        content
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};"""

new_func = """export const useAddAppointmentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, content, businessId, authorId }: { appointmentId: string, content: string, businessId: string, authorId?: string }) => {
      const { data, error } = await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        business_id: businessId,
        author_id: authorId || '00000000-0000-0000-0000-000000000000',
        content,
        visibility: 'staff'
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['request_notes'] });
    }
  });
};"""

content = content.replace(old_func, new_func)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated useAddAppointmentNote")
