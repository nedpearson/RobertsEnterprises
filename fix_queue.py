import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the grid cols to make cards wider
content = content.replace(
    'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"',
    'className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4"'
)

# 2. Add requested date and time to the card
# First, extract variables
old_vars = r"(const statusLabel = [^\;]+\;(\s+)return \()"
new_vars = r"""const requestedDateStr = req.preferred_date_1 || parsedNotes['Preferred Date'] || parsedNotes['Date'];
                      const requestedDate = requestedDateStr ? new Date(requestedDateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible Date';
                      const requestedTime = req.preferred_window_1 || parsedNotes['Preferred Time'] || parsedNotes['Time'] || 'Any Time';

                      \1"""
content = re.sub(old_vars, new_vars, content, flags=re.DOTALL)

# 3. Add the UI block inside CardContent
old_card_content = r'(<CardContent className="p-4 pt-3 text-xs text-stone-600 space-y-2 flex-1">\s+)<div className="grid grid-cols-2 gap-2 text-\[11px\]">'
new_card_content = r"""\1<div className="bg-rose-50/50 p-2.5 rounded-lg mb-2 border border-rose-100 flex items-start gap-2.5">
                            <CalendarDays className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wider mb-0.5">Requested Appointment</span>
                              <span className="text-stone-700 text-xs font-semibold">
                                {requestedDate} &bull; {requestedTime}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-[11px]">"""
content = re.sub(old_card_content, new_card_content, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated UnifiedSchedulingWorkspace.tsx")
