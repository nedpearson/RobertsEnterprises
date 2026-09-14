import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add requestSortBy state
if "const [requestSortBy, setRequestSortBy]" not in content:
    content = content.replace(
        "const [statusFilter, setStatusFilter] = useState<string>('all');",
        "const [statusFilter, setStatusFilter] = useState<string>('all');\n  const [requestSortBy, setRequestSortBy] = useState<'date_asc' | 'date_desc' | 'submitted_desc' | 'location'>('date_asc');"
    )

# 2. Add sorting to displayRequests
old_display_filter = r"(return scopedRequests\s*\.filter\([^)]+\)\s*\.filter\([^)]+\)\s*\.filter\([^)]+\)\s*\.filter\([^)]+\);)"
new_display_filter = r"""\1
      // Apply the user's sort selection
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
      })
"""
# Need a more robust regex to catch the chain of filters since I'm not sure how many there are. Let's just find the end of the useMemo.
old_useMemo = r"(return scopedRequests[\s\S]*?;\s*\}, \[requests, requestView, storeFilter, statusFilter\]\);)"
def repl_usememo(m):
    block = m.group(1)
    # inject .sort before the final semicolon
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
# Also need to add requestSortBy to the dependency array of the useMemo!
content = content.replace("requestView, storeFilter, statusFilter]);", "requestView, storeFilter, statusFilter, requestSortBy]);")


# 3. Add the UI dropdown for sorting
old_ui = r"(<Select value=\{storeFilter\} onValueChange=\{setStoreFilter\}>[\s\S]*?</Select>)"
new_ui = r"""\1
                  <Select value={requestSortBy} onValueChange={(val: any) => setRequestSortBy(val)}>
                    <SelectTrigger className="w-44 h-8 text-xs font-semibold bg-white border-rose-200">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_asc">Sort: Nearest Date</SelectItem>
                      <SelectItem value="date_desc">Sort: Furthest Date</SelectItem>
                      <SelectItem value="location">Group: By Location</SelectItem>
                      <SelectItem value="submitted_desc">Sort: Newest Submissions</SelectItem>
                    </SelectContent>
                  </Select>"""
content = re.sub(old_ui, new_ui, content)


# 4. Fix the location text rendering
old_loc_text = r"const location = locObj \? `\$\{locObj\.business\} - \$\{locObj\.short\}` : parsedNotes\['Store Location'\] \|\| req\.location_name \|\| 'Main Store';"
new_loc_text = r"const location = locObj ? `${locObj.business} - ${locObj.city}` : parsedNotes['Store Location'] || req.location_name || 'Main Store';"
content = re.sub(old_loc_text, new_loc_text, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated UnifiedSchedulingWorkspace.tsx logic")
