import re

with open('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Onboarding trigger
content = content.replace(
    "<TabsTrigger value=\"health\"",
    "<TabsTrigger value=\"onboarding\" className=\"flex items-center gap-2\"><Building2 className=\"w-4 h-4\"/> Onboarding</TabsTrigger>\n          <TabsTrigger value=\"health\""
)

# Add Onboarding content
onboarding_content = """
        <TabsContent value="onboarding" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Onboarding 360</CardTitle>
                  <CardDescription>Track implementation progress, blockers, and service levels.</CardDescription>
                </div>
                <Button variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  <HeartPulse className="w-4 h-4 mr-2" />
                  RUN GO-LIVE CHECK
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="text-xs text-stone-500 font-medium mb-1">Service Level</div>
                  <div className="font-bold text-stone-900">VIP / White Glove</div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="text-xs text-stone-500 font-medium mb-1">Implementation Owner</div>
                  <div className="font-bold text-stone-900">Sarah Jenkins</div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="text-xs text-stone-500 font-medium mb-1">Target Go-Live</div>
                  <div className="font-bold text-stone-900">Oct 1, 2026</div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="text-xs text-stone-500 font-medium mb-1">Status</div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Action Needed</Badge>
                </div>
              </div>
              
              <h3 className="font-medium text-stone-900 mb-3">Implementation Tasks</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Blocker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Shopify Authorization</TableCell>
                    <TableCell><Badge variant="outline">Customer</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Stripe Connection</TableCell>
                    <TableCell><Badge variant="outline">Customer</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-stone-100">Pending</Badge></TableCell>
                    <TableCell className="text-red-500 text-xs">Awaiting Account Verification</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Inventory Data Migration</TableCell>
                    <TableCell><Badge variant="outline">VowOS</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
"""

content = content.replace(
    "</Tabs>",
    onboarding_content + "\n      </Tabs>"
)

with open('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
