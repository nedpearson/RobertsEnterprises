import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_func = """
export const useAddRequestTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, title, businessId }: { requestId: string, title: string, businessId: string }) => {
      const { data, error } = await supabase.from('tasks').insert({
        entity_id: requestId,
        entity_type: 'booking_request',
        business_id: businessId,
        title,
        status: 'pending'
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request_tasks', variables.requestId] });
    }
  });
};
"""

if "useAddRequestTask" not in content:
    content += new_func
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added useAddRequestTask")
