import re

file_path = "apps/marketing/src/pages/scheduling/UnifiedSchedulingWorkspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_map = """                    (() => {
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
                      });"""

new_map = """                    (() => {
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
                        'Flexible': [],
                        'Waitlist': []
                      };

                      displayRequests.forEach((req: any) => {
                        if (req.status && req.status.toLowerCase() === 'waitlist') {
                          groups['Waitlist'].push(req);
                          return;
                        }
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
                      });"""

content = content.replace(old_map, new_map)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected waitlist grouping logic.")
