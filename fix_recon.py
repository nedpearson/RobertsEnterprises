import re

file_path = "apps/marketing/supabase/migrations/20260907000005_data_reconciliation.sql"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "INSERT INTO public.locations (id, business_id, name, address)",
    "-- INSERT INTO public.locations (id, business_id, name, address)"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated reconciliation.")
