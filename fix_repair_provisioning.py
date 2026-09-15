import re

file_path = "apps/marketing/supabase/migrations/20261001000005_repair_user_provisioning.sql"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the locations insert
content = re.sub(r"INSERT INTO public\.locations[^\n]+\n\s+VALUES \([^,]+, v_business_id, 'Main Store', '123 Main St'\);", "", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated repair provisioning.")
