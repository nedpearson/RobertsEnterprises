import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the following block inside `{activeMode === 'requests' && (`:
old_map = """                <div ref={queueRef} className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-xs border border-dashed border-stone-200 rounded-xl">
                      No pending booking requests
                    </div>
                  ) : (
                    requests.map((req: any) => (
                      <DraggableAppointmentCard
                        key={req.id}
                        request={req}
                        onSelect={(r) => updateSelectedRequestUrl({ type: 'request', id: r.id, raw: r })}
                        onAssign={(r) => setAssigningRequest(r)}
                      />
                    ))
                  )}
                </div>"""

new_map = """                <div ref={queueRef} className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {displayRequests.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-xs border border-dashed border-stone-200 rounded-xl">
                      No pending booking requests
                    </div>
                  ) : (
                    (() => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const nextWeek = new Date(today);
                      nextWeek.setDate(nextWeek.getDate() + 7);

                      const groups = {
                        'Overdue': [],
                        'Today': [],
                        'Tomorrow': [],
                        'This Week': [],
                        'Later': [],
                        'Flexible': []
                      };

                      displayRequests.forEach((req: any) => {
                        if (!req.preferred_date_1 || req.preferred_date_1.toLowerCase().includes('flexible') || req.preferred_date_1 === 'TBD') {
                          groups['Flexible'].push(req);
                          return;
                        }
                        const rDate = new Date(req.preferred_date_1);
                        rDate.setHours(0,0,0,0);
                        if (rDate < today) groups['Overdue'].push(req);
                        else if (rDate.getTime() === today.getTime()) groups['Today'].push(req);
                        else if (rDate.getTime() === tomorrow.getTime()) groups['Tomorrow'].push(req);
                        else if (rDate < nextWeek) groups['This Week'].push(req);
                        else groups['Later'].push(req);
                      });

                      return Object.entries(groups).filter(([_, items]) => items.length > 0).map(([groupName, items]) => (
                        <div key={groupName} className="mb-4">
                          <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            {groupName} <span className="text-stone-300 font-medium">({items.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {items.map((req: any) => (
                              <DraggableAppointmentCard
                                key={req.id}
                                request={req}
                                onSelect={(r) => updateSelectedRequestUrl({ type: 'request', id: r.id, raw: r })}
                                onAssign={(r) => setAssigningRequest(r)}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>"""

content = content.replace(old_map, new_map)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected grouped requests into the left pane.")
