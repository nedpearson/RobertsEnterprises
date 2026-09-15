import re

file_path = "apps/marketing/worker/src/modules/scheduling/publicIntake.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

choose_store_old = """  // A one-location business is deterministic even when its location name does
  // not strictly match the catalog city name.
  if (uniqueRows.length === 1) return uniqueRows[0];

  return null;"""

choose_store_new = """  return null; // Require manual location review"""
content = content.replace(choose_store_old, choose_store_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated chooseStoreLocation")
