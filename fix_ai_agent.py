import re

file_path = "apps/marketing/worker/src/jobs/aiSchedulingAgent.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the signature to accept availabilityPeriods
content = content.replace(
    'timeOff: any[];',
    'timeOff: any[];\n  availabilityPeriods: any[];'
)

# 2. Add availability check in scoreStylists
availability_check = """
      // Check published availability
      const hasAvailability = context.availabilityPeriods?.some((ap: any) => {
        if (ap.staff_user_id !== stylist.id || ap.availability_type !== 'available') return false;
        const apStart = ap.starts_at.split('T')[0];
        const apEnd = ap.ends_at.split('T')[0];
        return targetDateOnly >= apStart && targetDateOnly <= apEnd;
      });

      if (!hasAvailability && context.availabilityPeriods && context.availabilityPeriods.length > 0) {
        blockingConflicts.push('Stylist does not have published availability for this date.');
      } else if (hasAvailability) {
        score += 10;
        reasons.push('Has published availability for this date.');
      }

      // Check shift
"""

content = content.replace('      // Check shift', availability_check)

# 3. Update the query in processAiScheduling to fetch availabilityPeriods
query_update = """
    const { data: timeOff } = await db.from('employee_time_off').select('*').eq('business_id', businessId);
    
    // Fetch published availability periods
    const { data: availabilityPeriods } = await db.from('staff_availability_periods').select('*');
"""
content = content.replace("    const { data: timeOff } = await db.from('employee_time_off').select('*').eq('business_id', businessId);", query_update)

context_update = """
      appointments: appointments || [],
      availabilityPeriods: availabilityPeriods || [],
"""
content = content.replace("      appointments: appointments || [],", context_update)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated aiSchedulingAgent.ts")
