import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace supabaseAdmin import
content = content.replace(
    "import { supabase as supabaseAdmin } from '../../../shared';",
    "import { privilegedDataPlaneDb as supabaseAdmin } from '../../../shared';"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated test to use service role key")
