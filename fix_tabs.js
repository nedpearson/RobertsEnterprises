const fs = require('fs');
const path = 'apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /} from 'lucide-react';/,
  ', FileText } from \'lucide-react\';'
);

content = content.replace(
  /<TabsTrigger value="features" className="flex items-center gap-2"><Settings2 className="w-4 h-4"\/> Features<\/TabsTrigger>/,
  '<TabsTrigger value="features" className="flex items-center gap-2"><Settings2 className="w-4 h-4"/> Features</TabsTrigger>\n          <TabsTrigger value="support" className="flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Support</TabsTrigger>\n          <TabsTrigger value="integrations" className="flex items-center gap-2"><Zap className="w-4 h-4"/> Integrations</TabsTrigger>\n          <TabsTrigger value="audit" className="flex items-center gap-2"><FileText className="w-4 h-4"/> Audit Logs</TabsTrigger>'
);

content = content.replace(
  /<TabsList className="mb-4 bg-stone-100\/50 p-1 rounded-lg">/,
  '<TabsList className="mb-4 bg-stone-100/50 p-1 rounded-lg flex flex-wrap gap-1 h-auto">'
);

const newTabs = `
        {/* SUPPORT TAB */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-stone-500" /> Support Tickets</CardTitle>
              <CardDescription>Tickets opened by this organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-stone-500 text-sm text-center py-8">Support ticketing UI under construction. Please use the global Support Queue for now.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-stone-500" /> Integrations & Sync Status</CardTitle>
              <CardDescription>Current connections and background jobs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-stone-500 text-sm text-center py-8">Integrations dashboard under construction.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-stone-500" /> Audit Log</CardTitle>
              <CardDescription>Complete history of changes and actions for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-stone-500 text-sm text-center py-8">Audit logs are coming in Phase 5.</div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>`;
      
content = content.replace(/<\/Tabs>/, newTabs);
fs.writeFileSync(path, content);
