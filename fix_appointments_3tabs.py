import re

file_path = "apps/marketing/src/pages/workspaces/AppointmentsWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_tabs = """const TABS = [
  { id: 'schedule', label: '📅 Schedule', module: 'scheduling.core' },
  { id: 'requests', label: '📥 Requests', module: 'scheduling.online' },
  { id: 'waitlist', label: '⏳ Waitlist', module: 'scheduling.core' },
  { id: 'team-capacity', label: '👥 Team & Capacity', module: 'scheduling.resources' },
  { id: 'rules', label: '⚙️ Rules', module: 'scheduling.core' }
] as const;"""

new_tabs = """const TABS = [
  { id: 'schedule', label: '📅 Schedule', module: 'scheduling.core' },
  { id: 'team', label: '👥 Team', module: 'scheduling.resources' },
  { id: 'settings', label: '⚙️ Settings', module: 'scheduling.core' }
] as const;"""

content = content.replace(old_tabs, new_tabs)

old_render = """  const renderBody = (id: TabId) => {
    switch (id) {
      case 'schedule':
        return <UnifiedSchedulingWorkspace defaultMode="calendar" hideInnerTopBar={true} />;
      case 'requests':
        return <UnifiedSchedulingWorkspace defaultMode="requests" hideInnerTopBar={true} />;
      case 'waitlist':
        return <UnifiedSchedulingWorkspace defaultMode="waitlist" hideInnerTopBar={true} />;
      case 'team-capacity':
        return <UnifiedSchedulingWorkspace defaultMode="workforce" hideInnerTopBar={true} />;
      case 'rules':"""

new_render = """  const renderBody = (id: TabId) => {
    switch (id) {
      case 'schedule':
        return <UnifiedSchedulingWorkspace defaultMode="requests" hideInnerTopBar={true} />;
      case 'team':
        return <UnifiedSchedulingWorkspace defaultMode="workforce" hideInnerTopBar={true} />;
      case 'settings':"""

content = content.replace(old_render, new_render)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated AppointmentsWorkspace to 3 tabs.")
