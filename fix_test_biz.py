import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace biz query
old_biz_query = "const { data: biz } = await supabaseAdmin.from('businesses').select('id').limit(1).single();"
new_biz_query = """let { data: biz } = await supabaseAdmin.from('businesses').select('id').limit(1).single();
    if (!biz) {
      const { data: newBiz } = await supabaseAdmin.from('businesses').insert({ name: 'Test Biz' }).select('id').single();
      biz = newBiz;
    }"""

content = content.replace(old_biz_query, new_biz_query)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
