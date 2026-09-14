import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the old buggy regex output if any... wait, it didn't match so it didn't change anything.
old_useMemo = r"(return scopedRequests[\s\S]*?;\s*\},\s*\[requestView, requests, unarchivedRequests, storeFilter, statusFilter\]\);)"

def repl_usememo(m):
    block = m.group(1)
    # Replace the final semicolon and bracket with the sort block
    block = re.sub(r";\s*\},", r"""
      .sort((a: any, b: any) => {
        if (requestSortBy === 'date_asc' || requestSortBy === 'date_desc') {
            const dateA = a.preferred_date_1 ? new Date(a.preferred_date_1).getTime() : 0;
            const dateB = b.preferred_date_1 ? new Date(b.preferred_date_1).getTime() : 0;
            if (!dateA && dateB) return 1;
            if (dateA && !dateB) return -1;
            if (!dateA && !dateB) return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();
            return requestSortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
        } else if (requestSortBy === 'location') {
            const locA = resolveLocationSlug(a.preferred_location_id || a.location_id || a.location);
            const locB = resolveLocationSlug(b.preferred_location_id || b.location_id || b.location);
            if (locA < locB) return -1;
            if (locA > locB) return 1;
            const dateA = a.preferred_date_1 ? new Date(a.preferred_date_1).getTime() : 0;
            const dateB = b.preferred_date_1 ? new Date(b.preferred_date_1).getTime() : 0;
            return dateA - dateB;
        } else {
            return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();
        }
      });
  },""", block)
    return block

content = re.sub(old_useMemo, repl_usememo, content)
content = content.replace("requestView, requests, unarchivedRequests, storeFilter, statusFilter]);", "requestView, requests, unarchivedRequests, storeFilter, statusFilter, requestSortBy]);")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated UnifiedSchedulingWorkspace.tsx useMemo sort logic")
