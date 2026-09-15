import re

file_path = "apps/marketing/src/lib/services/schedulingService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_fn = """      mutationFn: async ({ requestId, businessId, locationId, stylistId, startAt, durationMinutes, sendEmail, sendSms, userId }: {
        requestId: string, businessId: string, locationId: string, stylistId: string | null, startAt: string, durationMinutes: number, sendEmail: boolean, sendSms: boolean, userId: string
      }) => {
        const { data, error } = await supabase.rpc('confirm_booking_request', {"""

new_fn = """      mutationFn: async ({ requestId, businessId, locationId, stylistId, startAt, durationMinutes, sendEmail, sendSms, userId }: {
        requestId: string, businessId: string, locationId: string, stylistId: string | null, startAt: string, durationMinutes: number, sendEmail: boolean, sendSms: boolean, userId: string
      }) => {
        if (!requestId || requestId.trim() === '') throw new Error("Confirmation failed because the request ID is missing.");
        if (!locationId || locationId.trim() === '') throw new Error("Confirmation failed because the location ID is missing. Select a store location.");
        if (!startAt || startAt.trim() === '') throw new Error("Confirmation failed because the start time is missing.");
        
        const { data, error } = await supabase.rpc('confirm_booking_request', {"""

content = content.replace(old_fn, new_fn)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated useConfirmBookingRequest validation")
