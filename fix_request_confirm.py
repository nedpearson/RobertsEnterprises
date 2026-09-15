import re

file_path = "apps/marketing/src/pages/scheduling/Request360Panel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useAuth to imports if it's not there
if "import { useAuth }" not in content:
    content = content.replace("import { \n  useAIRecommendations", "import { useAuth } from '@/contexts/AuthContext';\nimport { \n  useAIRecommendations")

# Replace fake UUID with real one
old_exec = """    const executeConfirm = async (sendEmail: boolean, sendSms: boolean) => {
      if (preflightMissing.length > 0 || !reqId) return;
      
      const realLocationId = locObj?.id || request?.location_id || request?.preferred_location_id;
      
      try {
        await confirmBookingMutation.mutateAsync({
          requestId: reqId as string,
          businessId: businessId as string,
          locationId: (realLocationId as string) || '',
          stylistId: (request?.assigned_employee_id as string) || null,
          startAt: (request?.requested_start_at || request?.preferred_date_1 || '') as string,
          durationMinutes: Number(request?.duration_minutes) || 90,
          sendEmail,
          sendSms,
          userId: '00000000-0000-0000-0000-000000000000'
        });"""

new_exec = """    const { user } = useAuth();
    
    const executeConfirm = async (sendEmail: boolean, sendSms: boolean) => {
      if (preflightMissing.length > 0 || !reqId) return;
      
      const realLocationId = locObj?.id || request?.location_id || request?.preferred_location_id;
      
      try {
        await confirmBookingMutation.mutateAsync({
          requestId: reqId as string,
          businessId: businessId as string,
          locationId: (realLocationId as string) || '',
          stylistId: (request?.assigned_employee_id as string) || null,
          startAt: (request?.requested_start_at || request?.preferred_date_1 || '') as string,
          durationMinutes: Number(request?.duration_minutes) || 90,
          sendEmail,
          sendSms,
          userId: user?.id || '00000000-0000-0000-0000-000000000000'
        });"""

content = content.replace(old_exec, new_exec)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated executeConfirm user UUID")
