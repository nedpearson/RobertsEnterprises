import re

file_path = "apps/marketing/worker/src/jobs/aiSchedulingAgent.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure we filter out non-stylists
if "const eligibleEmployees = employees?.filter(" not in content:
    old_context = """const context = {
      employees: employees ?? [],
      shifts: shifts ?? [],
      appointments: appointments ?? [],
      timeOff: timeOff ?? [],
    };"""

    new_context = """const eligibleEmployees = (employees ?? []).filter(e => 
      e.role?.toLowerCase() === 'stylist' || 
      e.role?.toLowerCase() === 'consultant' || 
      (e.capabilities && Array.isArray(e.capabilities) && e.capabilities.includes('stylist'))
    );

    const context = {
      employees: eligibleEmployees,
      shifts: shifts ?? [],
      appointments: appointments ?? [],
      timeOff: timeOff ?? [],
    };"""

    content = content.replace(old_context, new_context)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed eligible employees in aiSchedulingAgent.ts")
else:
    print("Already fixed")
