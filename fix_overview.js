const fs = require('fs');

let content = fs.readFileSync('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', 'utf8');

const overviewContent = \
        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-stone-500" /> Core Organization Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input value={tenant.name} onChange={e => setTenant({...tenant, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Slug / Subdomain</Label>
                    <Input value={tenant.slug || ''} onChange={e => setTenant({...tenant, slug: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={tenant.status} onValueChange={v => setTenant({...tenant, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Onboarding Progress</Label>
                    <Select value={tenant.onboarding_status} onValueChange={v => setTenant({...tenant, onboarding_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="COMPLETE">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Created At</Label>
                    <Input value={new Date(tenant.created_at).toLocaleString()} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Manager</Label>
                    <Input value="Unassigned" disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end bg-stone-50 border-t">
                <Button onClick={handleSaveCore} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" /> Save Organization
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Brands</span>
                      <span className="font-medium">{brands.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Locations</span>
                      <span className="font-medium">{locations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Total Users</span>
                      <span className="font-medium">{members.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Active Users</span>
                      <span className="font-medium">{members.filter(m => m.status === 'ACTIVE').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Subscription Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Plan</span>
                      <span className="font-medium capitalize">{subscription?.plan_id || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Status</span>
                      <Badge variant="outline">{subscription?.status || 'Unknown'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Account Type</span>
                      <span className="font-medium">{subscription?.account_type || 'Paid'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Feature Overrides</span>
                      <span className="font-medium">{overrides.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
\;

content = content.replace(/\{\/\* OVERVIEW TAB \*\/\}[\s\S]*?\{\/\* SUBSCRIPTION TAB \*\/\}/, overviewContent.trim() + "\n\n        {/* SUBSCRIPTION TAB */}");

fs.writeFileSync('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', content);
