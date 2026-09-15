import re

file_path = "apps/marketing/worker/src/modules/scheduling/tests/confirmation.test.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_insert = """      if (!biz) {
        const { data: newBiz } = await supabaseAdmin.from('businesses').insert({ name: 'Test Biz' }).select('id').single();
        biz = newBiz;
      }"""

new_insert = """      if (!biz) {
        const { data: newBiz, error } = await supabaseAdmin.from('businesses').insert({ name: 'Test Biz' }).select('id').single();
        if (error) throw error;
        biz = newBiz;
      }"""

content = content.replace(old_insert, new_insert)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated test error catching")
