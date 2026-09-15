import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update useRequestNotes to fetch from both tables
old_useRequestNotes = """export const useRequestNotes = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ['request_notes', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_notes')
        .select('*, author:author_id(id, email)')
        .eq('request_id', requestId!)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!requestId,
  });
};"""

new_useRequestNotes = """export const useRequestNotes = (requestId: string | undefined, appointmentId: string | undefined) => {
  return useQuery({
    queryKey: ['request_notes', requestId, appointmentId],
    queryFn: async () => {
      const promises = [];
      if (requestId) {
        promises.push(
          supabase
            .from('booking_request_notes')
            .select('*, author:author_user_id(id, email)')
            .eq('booking_request_id', requestId)
        );
      }
      if (appointmentId) {
        promises.push(
          supabase
            .from('appointment_notes')
            .select('*, author:author_id(id, email)')
            .eq('appointment_id', appointmentId)
        );
      } else if (requestId) {
        // Fallback: also check if any appointment_notes point to this request_id (legacy)
        promises.push(
          supabase
            .from('appointment_notes')
            .select('*, author:author_id(id, email)')
            .eq('request_id', requestId)
        );
      }
      
      const results = await Promise.all(promises);
      for (const res of results) {
        if (res.error) throw res.error;
      }
      
      const combined = results.flatMap(res => res.data || []);
      // Sort combined descending
      return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!requestId || !!appointmentId,
  });
};"""

content = content.replace(old_useRequestNotes, new_useRequestNotes)

# Update useAddRequestNote to support both booking_request_notes and appointment_notes
old_useAddRequestNote = """export const useAddRequestNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, content, businessId, authorId, visibility = 'staff' }: { requestId: string, content: string, businessId: string, authorId: string, visibility?: string }) => {
      const { data, error } = await supabase
        .from('appointment_notes')
        .insert({ request_id: requestId, content, business_id: businessId, author_id: authorId, visibility })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['request_notes', vars.requestId] });
    },
  });
};"""

new_useAddRequestNote = """export const useAddRequestNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, appointmentId, content, businessId, authorId, visibility = 'staff' }: { requestId?: string, appointmentId?: string, content: string, businessId: string, authorId: string, visibility?: string }) => {
      if (appointmentId) {
        const { data, error } = await supabase
          .from('appointment_notes')
          .insert({ appointment_id: appointmentId, request_id: requestId, content, business_id: businessId, author_id: authorId, visibility })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else if (requestId) {
        const { data, error } = await supabase
          .from('booking_request_notes')
          .insert({ booking_request_id: requestId, content, organization_id: businessId, author_user_id: authorId, visibility })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      throw new Error("Missing both appointmentId and requestId");
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['request_notes'] });
    },
  });
};"""

content = content.replace(old_useAddRequestNote, new_useAddRequestNote)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated schedulingService.ts for notes")
