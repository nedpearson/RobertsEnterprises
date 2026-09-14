import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_button = r"""<DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        disabled=\{selectedRequestIds\.size === 0 \|\| isBulkUpdating\}
                      >
                        Bulk Actions <ChevronDown className="ml-1\.5 h-3\.5 w-3\.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      \{requestView === 'active' \? \("""

new_button = """<DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isBulkUpdating}
                        onClick={(e) => {
                          // Allow it to open
                        }}
                      >
                        Bulk Actions <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {selectedRequestIds.size === 0 ? (
                        <div className="px-2 py-3 text-xs text-stone-500 text-center italic">
                          Please select requests first
                        </div>
                      ) : requestView === 'active' ? ("""

content = re.sub(old_button, new_button, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed bulk actions button")
