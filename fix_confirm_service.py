import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_func = """
export const useConfirmBookingRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, businessId, locationId, stylistId, startAt, durationMinutes, sendEmail, sendSms, userId }: {
      requestId: string, businessId: string, locationId: string, stylistId: string | null, startAt: string, durationMinutes: number, sendEmail: boolean, sendSms: boolean, userId: string
    }) => {
      const { data, error } = await supabase.rpc('confirm_booking_request', {
        p_booking_request_id: requestId,
        p_business_id: businessId,
        p_location_id: locationId,
        p_stylist_id: stylistId,
        p_appointment_start: startAt,
        p_appointment_duration: durationMinutes,
        p_send_email: sendEmail,
        p_send_sms: sendSms,
        p_user_id: userId
      });
      if (error) throw error;
      return data; // returns the new appointmentId
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointment_requests'] });
      qc.invalidateQueries({ queryKey: ['request360', vars.requestId] });
    },
  });
};
"""

if "useConfirmBookingRequest" not in content:
    content += new_func
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added useConfirmBookingRequest to schedulingService.ts")
else:
    print("Already exists")
