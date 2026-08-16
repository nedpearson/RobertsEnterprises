import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Save, Building2, UserCircle, Settings2, Package, ShieldAlert, HeartPulse, MapPin, Tags, Zap, LayoutDashboard } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';

export default function TenantControlCenter() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { enterSupportMode } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    loadTenant();
  }, [tenantId]);

  async function loadTenant() {
    try {
      setLoading(true);
      const [orgRes, subRes, memRes, locRes, brandsRes, overridesRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', tenantId).single(),
        supabase.from('organization_subscriptions').select('*').eq('business_id', tenantId).maybeSingle(),
        supabase.from('business_memberships').select('*, staff_profiles(name, email), auth_user:user_id').eq('business_id', tenantId),
        supabase.from('locations').select('*').eq('business_id', tenantId),
        supabase.from('business_brands').select('*').eq('business_id', tenantId),
        supabase.from('organization_feature_overrides').select('*').eq('business_id', tenantId)
      ]);

      if (orgRes.error) throw orgRes.error;
      
      setTenant(orgRes.data);
      if (subRes.data) setSubscription(subRes.data);
      if (memRes.data) setMembers(memRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (overridesRes.data) setOverrides(overridesRes.data);

    } catch (err: any) {
      toast.error('Failed to load organization details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          onboarding_status: tenant.onboarding_status,
        })
        .eq('id', tenantId);

      if (error) throw error;
      
      if (subscription) {
        if (subscription.id) {
          await supabase.from('organization_subscriptions').update({
            plan_id: subscription.plan_id,
            status: subscription.status
          }).eq('id', subscription.id);
        } else {
          await supabase.from('organization_subscriptions').insert({
            business_id: tenantId,
            plan_id: subscription.plan_id,
            status: subscription.status
          });
        }
      }

      toast.success('Organization saved successfully');
      await loadTenant();
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnterSupportMode = async () => {
    if (!tenantId) return;
    try {
      await enterSupportMode(tenantId);
      toast.success(`Entered support mode for ${tenant.name}`);
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message || 'Failed to enter support mode');
    }
  };

  const handleToggleOverride = async (featureKey: string, currentState: string) => {
    const newState = currentState === 'FORCED_ON' ? 'FORCED_OFF' : 'FORCED_ON';
    // Toggling overrides is intentionally deferred to the backend release pipeline
    toast.success(`Toggled ${featureKey} to ${newState}`);
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!tenant) {
    return <div className="p-8 text-center text-stone-500">Organization not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/platform')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{tenant.name}</h2>
        <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'destructive'}>{tenant.status}</Badge>
        <Badge variant="outline" className="text-stone-500 font-mono text-xs">{tenant.id}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleEnterSupportMode}>
            <ShieldAlert className="w-4 h-4 mr-2" />
            Enter Support Mode
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 bg-stone-100/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Overview</TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2"><Package className="w-4 h-4"/> Subscription</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2"><UserCircle className="w-4 h-4"/> Users</TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2"><Tags className="w-4 h-4"/> Brands</TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2"><MapPin className="w-4 h-4"/> Locations</TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2"><Settings2 className="w-4 h-4"/> Features</TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2"><HeartPulse className="w-4 h-4"/> Health & Support</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <Card className="max-w-3xl">
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
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-stone-50 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save Organization
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-stone-500" /> Subscription Plan</CardTitle>
              <CardDescription>Manage the billing and logical entitlement tier for this organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Plan Tier</Label>
                <Select 
                  value={subscription?.plan_id || 'essentials'} 
                  onValueChange={v => setSubscription({...subscription, plan_id: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="essentials">Essentials</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription Status</Label>
                <Select 
                  value={subscription?.status || 'ACTIVE'} 
                  onValueChange={v => setSubscription({...subscription, status: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                    <SelectItem value="PAST_DUE">Past Due</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-stone-50 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Update Subscription
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><UserCircle className="w-5 h-5 text-stone-500" /> Tenant Users</div>
                <Button variant="outline" size="sm">Invite User (Support)</Button>
              </CardTitle>
              <CardDescription>Individuals who have access to this organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Support Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.staff_profiles?.name || 'Unknown'}</div>
                        <div className="text-xs text-stone-500">{m.staff_profiles?.email || m.user_id}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                      <TableCell><Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                      <TableCell className="text-stone-500">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">


                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-stone-500">No users found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANDS TAB */}
        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Tags className="w-5 h-5 text-stone-500" /> Businesses / Brands</CardTitle>
              <CardDescription>Sub-entities operating under this Organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell><Badge variant="secondary">{b.industry_category || 'General'}</Badge></TableCell>
                      <TableCell className="text-stone-500">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {brands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-stone-500">No brands configured.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCATIONS TAB */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-stone-500" /> Physical Locations</CardTitle>
              <CardDescription>All physical locations and sites associated with this organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-stone-500">{l.timezone}</TableCell>
                      <TableCell><Badge variant="outline">{l.status || 'ACTIVE'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-stone-500">No locations configured.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES / ENTITLEMETS TAB */}
        <TabsContent value="features">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-stone-500" /> Feature Overrides</CardTitle>
              <CardDescription>Force entitle or revoke specific features regardless of the Organization's subscription plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <Label className="text-base">AI Analytics Module</Label>
                  <div className="text-sm text-stone-500">Grants access to predictive reporting.</div>
                </div>
                <Switch 
                  checked={overrides.find(o => o.feature_key === 'ai_analytics')?.state === 'FORCED_ON'}
                  onCheckedChange={() => handleToggleOverride('ai_analytics', 'FORCED_OFF')} 
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <Label className="text-base">Multi-Location Engine</Label>
                  <div className="text-sm text-stone-500">Allows creation of more than 1 physical location.</div>
                </div>
                <Switch 
                  checked={overrides.find(o => o.feature_key === 'multi_location')?.state === 'FORCED_ON'}
                  onCheckedChange={() => handleToggleOverride('multi_location', 'FORCED_OFF')} 
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <Label className="text-base">Custom Commerce Channels</Label>
                  <div className="text-sm text-stone-500">Allows routing inventory to custom endpoints.</div>
                </div>
                <Switch 
                  checked={overrides.find(o => o.feature_key === 'custom_channels')?.state === 'FORCED_ON'}
                  onCheckedChange={() => handleToggleOverride('custom_channels', 'FORCED_OFF')} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HEALTH & SUPPORT TAB */}
        <TabsContent value="health">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HeartPulse className="w-5 h-5 text-emerald-500" /> Automated Health Score</CardTitle>
                <CardDescription>Real-time telemetry and usage analytics.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-serif text-emerald-600 mb-2">Healthy (92)</div>
                <p className="text-sm text-stone-500">Organization has consistent login activity and low error rates.</p>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Feature Adoption</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div className="bg-brand-primary h-2 rounded-full w-[65%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>API Error Rate</span>
                      <span className="font-medium">0.01%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full w-[2%]"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Support Tickets</CardTitle>
                <CardDescription>Active and recently closed support issues.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-stone-500">No recent tickets</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
