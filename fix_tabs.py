import re

file_path = "apps/marketing/src/pages/workspaces/AppointmentsWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace TABS definition
old_tabs = r"const TABS = \[\s*\{ id: 'calendar'.*?\n.*?\] as const;"
new_tabs = """const TABS = [
  { id: 'schedule', label: '📅 Schedule', module: 'scheduling.core' },
  { id: 'requests', label: '📥 Requests', module: 'scheduling.online' },
  { id: 'waitlist', label: '⏳ Waitlist', module: 'scheduling.core' },
  { id: 'team-capacity', label: '👥 Team & Capacity', module: 'scheduling.resources' },
  { id: 'rules', label: '⚙️ Rules', module: 'scheduling.core' }
] as const;"""

content = re.sub(old_tabs, new_tabs, content, flags=re.DOTALL)

# Find renderBody and replace it
old_renderBody = r"const renderBody = \(id: TabId\) => \{.*?default:\s*return <UnifiedSchedulingWorkspace hideInnerTopBar=\{true\} />;\s*\}\s*\};"
new_renderBody = """const renderBody = (id: TabId) => {
    switch (id) {
      case 'schedule':
        return <UnifiedSchedulingWorkspace defaultMode="calendar" hideInnerTopBar={true} />;
      case 'requests':
        return <UnifiedSchedulingWorkspace defaultMode="requests" hideInnerTopBar={true} />;
      case 'waitlist':
        return <UnifiedSchedulingWorkspace defaultMode="waitlist" hideInnerTopBar={true} />;
      case 'team-capacity':
        return <UnifiedSchedulingWorkspace defaultMode="workforce" hideInnerTopBar={true} />;
      case 'rules':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto">
              {[
                { subId: 'check-in', label: 'Check-In' },
                { subId: 'no-shows', label: 'No-Shows' },
                { subId: 'follow-up', label: 'Follow-Up' },
                { subId: 'appointment-types', label: 'Appointment Types' },
                { subId: 'availability', label: 'Availability Rules' },
                { subId: 'online-booking', label: 'Online Booking' }
              ].map((sub) => (
                <button
                  key={sub.subId}
                  onClick={() => setActiveOpsTab(sub.subId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeOpsTab === sub.subId
                      ? 'bg-white text-stone-900 shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            {renderOperationsSubTab()}
          </div>
        );
      default:
        return <UnifiedSchedulingWorkspace hideInnerTopBar={true} />;
    }
  };"""

content = re.sub(old_renderBody, new_renderBody, content, flags=re.DOTALL)

# also replace `useWorkspaceTab('appointments', 'calendar')` to `useWorkspaceTab('appointments', 'schedule')`
content = content.replace("useWorkspaceTab('appointments', 'calendar')", "useWorkspaceTab('appointments', 'schedule')")

# also replace `t.id === 'booking-requests'` with `t.id === 'requests'`
content = content.replace("t.id === 'booking-requests'", "t.id === 'requests'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated AppointmentsWorkspace.tsx")
