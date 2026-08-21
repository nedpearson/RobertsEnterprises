import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { setFeatureOverride, OverrideState, updateOrganizationSubscription, updateOrganizationCore, createOrganizationBrand, createOrganizationLocation } from '@/lib/platform/platformAdminService';
import { MASTER_FEATURE_CATALOG, FeatureKey, FeatureCatalogEntry } from '@/lib/features/featureCatalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InviteTenantUserModal } from './InviteTenantUserModal';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Save, Building2, UserCircle, Settings2, Package, ShieldAlert, HeartPulse, MapPin, Tags, Zap, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function TenantControlCenter() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { enterSupportMode } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [pristineTenant, setPristineTenant] = useState<any>(null);
  const [pristineSubscription, setPristineSubscription] = useState<any>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    loadTenant();
  }, [tenantId]);

  async function loadTenant() {
    try {
      setLoading(true);
      const [orgRes, subRes, memRes, locRes, brandsRes, overridesRes, prefRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', tenantId).maybeSingle(),
        supabase.from('organization_subscriptions').select('*').eq('business_id', tenantId).maybeSingle(),
        supabase.from('business_memberships').select('id,user_id,role,status,created_at').eq('business_id', tenantId),
        supabase.from('locations').select('*').eq('business_id', tenantId),
        supabase.from('business_brands').select('*').eq('business_id', tenantId),
        supabase.from('organization_feature_overrides').select('*').eq('business_id', tenantId),
        supabase.from('organization_module_preferences').select('*').eq('business_id', tenantId)
      ]);

      if (orgRes.error) throw orgRes.error;
      if (!orgRes.data) {
        setTenant(null);
        return;
      }
      
      setTenant(orgRes.data);
      setPristineTenant(JSON.parse(JSON.stringify(orgRes.data)));

      if (subRes.data) {
        setSubscription(subRes.data);
        setPristineSubscription(JSON.parse(JSON.stringify(subRes.data)));
      } else {
        setSubscription({ plan_id: 'essentials', status: 'ACTIVE', account_type: 'PAID', effective_price_cents: 0 });
        setPristineSubscription(null);
      }
      setLastFetch(new Date());
      if (memRes.data) {
        const userIds = [...new Set((memRes.data ?? []).map(m => m.user_id).filter(Boolean))];
        const { data: profiles } = userIds.length
          ? await supabase.from('staff_profiles').select('id,name,email').in('id', userIds)
          : { data: [] };
        
        const stitched = memRes.data.map(m => ({
          ...m,
          staff_profiles: profiles?.find(p => p.id === m.user_id)
        }));
        setMembers(stitched);
      }
      if (locRes.data) setLocations(locRes.data || []);
      setBrands(brandsRes.data || []);
      setOverrides(overridesRes.data || []);
      setPreferences(prefRes.data || []);
      
      setLastFetch(new Date());

    } catch (err: any) {
      toast.error('Failed to load organization details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  
  const handleAddBrand = async () => {
    const name = window.prompt("Enter Brand Name:");
    if (!name || !tenantId) return;
    try {
      await createOrganizationBrand({ businessId: tenantId, name });
      toast.success("Brand added");
      loadTenant();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddLocation = async () => {
    const name = window.prompt("Enter Location Name:");
    if (!name || !tenantId) return;
    const address = window.prompt("Enter Location Address (Optional):");
    
    let brandId: string | undefined = undefined;
    if (brands.length > 0) {
      const brandOptions = brands.map((b, i) => `${i + 1}: ${b.name}`).join('\n');
      const selection = window.prompt(`Select a Brand for this Location (Optional, leave blank for Org-level):\n\n${brandOptions}`);
      if (selection) {
        const idx = parseInt(selection) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < brands.length) {
          brandId = brands[idx].id;
        }
      }
    }

    try {
      await createOrganizationLocation({ businessId: tenantId, name, address: address || undefined, brandId });
      toast.success("Location added");
      loadTenant();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveCore = async () => {
    const reason = window.prompt("Reason for core organization update? (required for audit)");
    if (!reason || !reason.trim()) {
      toast.error('Update cancelled: a reason is required.');
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationCore({
        businessId: tenantId!,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        onboardingStatus: tenant.onboarding_status,
        reason: reason.trim(),
        expectedVersion: pristineTenant?.version || 1
      });
      toast.success('Organization saved successfully');
      await loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubscription = async () => {
    const reason = window.prompt("Reason for subscription update? (required for audit)");
    if (!reason || !reason.trim()) {
      toast.error('Update cancelled: a reason is required.');
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationSubscription({
        businessId: tenantId!,
        planId: subscription.plan_id,
        status: subscription.status,
        accountType: subscription.account_type || 'PAID',
        effectivePriceCents: subscription.effective_price_cents || 0,
        reason: reason.trim(),
        expectedVersion: pristineSubscription?.version || null
      });
      toast.success('Subscription saved successfully');
      await loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save subscription');
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

  const [overrideBusy, setOverrideBusy] = useState<string | null>(null);

  /**
   * Persist a feature override. The old handler computed a state and showed a
   * success toast without writing anything — the switch snapped back on reload
   * and the tenant never saw the change. (It also received a hardcoded
   * 'FORCED_OFF' as currentState from every switch, so it could only ever
   * "toggle" one direction.) Now: mandatory reason -> upsert/delete -> audit
   * entry -> refetch -> toast, in that order. The tenant runtime picks the row
   * up through AuthContext -> EntitlementService on its next load.
   */
  const applyOverride = async (featureKey: string, nextState: OverrideState) => {
    if (!tenantId || overrideBusy) return;
    const verb = nextState === 'NO_OVERRIDE' ? 'clearing the override on' : `setting ${nextState} on`;
    const reason = window.prompt(`Reason for ${verb} ${featureKey}? (required, audited)`);
    if (reason === null) return; // cancelled
    if (!reason.trim()) {
      toast.error('A reason is required. Nothing was changed.');
      return;
    }
    setOverrideBusy(featureKey);
    try {
      await setFeatureOverride({ businessId: tenantId, featureKey, state: nextState, reason });
      const { data } = await supabase
        .from('organization_feature_overrides').select('*').eq('business_id', tenantId);
      setOverrides(data || []);
      toast.success(
        nextState === 'NO_OVERRIDE'
          ? `${featureKey}: override cleared — plan entitlement applies again`
          : `${featureKey}: ${nextState} persisted and audited`,
      );
    } catch (err: any) {
      toast.error(err?.message || `Failed to update ${featureKey}`);
    } finally {
      setOverrideBusy(null);
    }
  };

  const handleToggleOverride = (featureKey: string) => {
    const current = overrides.find((o) => o.feature_key === featureKey)?.state;
    // No row -> force on. FORCED_ON -> force off. FORCED_OFF -> force on.
    applyOverride(featureKey, current === 'FORCED_ON' ? 'FORCED_OFF' : 'FORCED_ON');
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-stone-500">This organization no longer exists or was removed.</div>
        <Button variant="outline" onClick={() => navigate('/platform')}>Back to Directory</Button>
      </div>
    );
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
          {lastFetch && <span className="text-xs text-stone-400 mr-4">Updated {lastFetch.toLocaleTimeString()}</span>}
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
        </TabsList>

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
                  value={subscription?.plan_id || ''} 
                  onValueChange={v => setSubscription({...subscription, plan_id: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
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
                <Label>Account Type</Label>
                <Select 
                  value={subscription?.account_type || 'PAID'} 
                  onValueChange={v => setSubscription({...subscription, account_type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="DEMO">Demo</SelectItem>
                    <SelectItem value="COMPLIMENTARY">Complimentary</SelectItem>
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
                    <SelectItem value="TRIALING">Trialing</SelectItem>
                    <SelectItem value="PAST_DUE">Past Due</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Effective Price (Cents / Month)</Label>
                <Input type="number" value={subscription?.effective_price_cents || 0} onChange={e => setSubscription({...subscription, effective_price_cents: parseInt(e.target.value, 10) || 0})} />
                <p className="text-xs text-stone-500">Override normal pricing. 0 for free.</p>
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-stone-50 border-t">
              <Button onClick={handleSaveSubscription} disabled={saving}>
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
                <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}>Invite User (Support)</Button>
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
                        <div className="text-sm text-stone-500">{m.users?.email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">Active</Badge>
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-stone-500"><KeySquare className="w-4 h-4 mr-2" /> Reset Auth</Button>
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Tags className="w-5 h-5 text-stone-500" /> Businesses / Brands</CardTitle>
                <CardDescription>Sub-entities operating under this Organization.</CardDescription>
              </div>
              <Button onClick={handleAddBrand} size="sm" className="w-full sm:w-auto">Add Brand</Button>
            </CardHeader>
            <CardContent>
              {brands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-stone-50/50 rounded-lg border border-dashed border-stone-200">
                  <Tags className="h-10 w-10 text-stone-300 mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-1">No Brands Configured</h3>
                  <p className="text-sm text-stone-500 mb-6 max-w-sm">
                    This organization doesn't have any brands or sub-entities yet. Add a brand to start grouping locations and orders.
                  </p>
                  <Button onClick={handleAddBrand}>
                    Add First Brand
                  </Button>
                </div>
              ) : (
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
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCATIONS TAB */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-stone-500" /> Physical Locations</CardTitle>
                <CardDescription>All physical locations and sites associated with this organization.</CardDescription>
              </div>
              <Button onClick={handleAddLocation} size="sm" className="w-full sm:w-auto">Add Location</Button>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-stone-50/50 rounded-lg border border-dashed border-stone-200">
                  <MapPin className="h-10 w-10 text-stone-300 mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-1">No Locations Configured</h3>
                  <p className="text-sm text-stone-500 mb-6 max-w-sm">
                    This organization doesn't have any physical locations yet. Add a location to enable scheduling and inventory.
                  </p>
                  <Button onClick={handleAddLocation}>
                    Add First Location
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map(l => {
                      const b = brands.find(brand => brand.id === l.brand_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name}</TableCell>
                          <TableCell>
                            {b ? <Badge variant="secondary">{b.name}</Badge> : <span className="text-stone-400">—</span>}
                          </TableCell>
                          <TableCell className="text-stone-500">{l.address || '—'}</TableCell>
                          <TableCell className="text-stone-500">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES / ENTITLEMETS TAB */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-stone-500" /> Feature Catalog</CardTitle>
              <CardDescription>
                Canonical list of all VowOS capabilities. Use overrides sparingly. 
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(
                Object.values(MASTER_FEATURE_CATALOG).reduce((acc, feature) => {
                  if (!acc[feature.module]) acc[feature.module] = [];
                  acc[feature.module].push(feature);
                  return acc;
                }, {} as Record<string, FeatureCatalogEntry[]>)
              ).map(([moduleName, features]) => (
                <Collapsible key={moduleName} defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-stone-100 rounded-t-md hover:bg-stone-200 transition-colors">
                    <h3 className="text-lg font-semibold capitalize">{moduleName}</h3>
                    <ChevronDown className="w-5 h-5 text-stone-500" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table className="border-x border-b rounded-b-md">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Feature</TableHead>
                          <TableHead>Plan Limit</TableHead>
                          <TableHead>Platform Override</TableHead>
                          <TableHead>Customer Pref</TableHead>
                          <TableHead>Effective State</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {features.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((feature) => {
                          const planRank = { starter: 0, essentials: 1, growth: 2, pro: 3, enterprise: 4 };
                          const rawPlan = (subscription?.plan_id || 'essentials').toLowerCase();
                          // Extract base plan by taking the first word before any dash or underscore
                          const currentPlan = rawPlan.split(/[-_]/)[0];
                          
                          const isIncludedInPlan = planRank[(currentPlan as keyof typeof planRank)] >= planRank[(feature.minimum_plan as keyof typeof planRank)];
                          const overrideRow = overrides.find(o => o.feature_key === feature.feature_key);
                          const prefRow = preferences.find(p => p.module_id === feature.feature_key);
                          
                          const overrideState = overrideRow?.state || 'NO_OVERRIDE';
                          const customerState = prefRow ? (prefRow.is_enabled ? 'ON' : 'OFF') : 'ON';
                          
                          let effective = 'LOCKED';
                          if (overrideState === 'FORCED_ON') effective = 'ON';
                          else if (overrideState === 'FORCED_OFF') effective = 'OFF';
                          else if (isIncludedInPlan) {
                            effective = customerState;
                          }

                          return (
                            <TableRow key={feature.feature_key}>
                              <TableCell>
                                <div className="font-medium">{feature.display_name}</div>
                                <div className="text-xs text-stone-500">{feature.description}</div>
                              </TableCell>
                              <TableCell>
                                {isIncludedInPlan ? (
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Included</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-stone-500">Locked ({feature.minimum_plan})</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={overrideState}
                                  onValueChange={(val) => applyOverride(feature.feature_key, val as OverrideState)}
                                  disabled={overrideBusy === feature.feature_key}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NO_OVERRIDE">No Override</SelectItem>
                                    <SelectItem value="FORCED_ON">Forced ON</SelectItem>
                                    <SelectItem value="FORCED_OFF">Forced OFF</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {feature.customer_configurable ? (
                                  <Badge variant="outline">{customerState}</Badge>
                                ) : (
                                  <span className="text-xs text-stone-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={effective === 'ON' ? 'default' : effective === 'OFF' ? 'secondary' : 'destructive'}>
                                  {effective}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {isInviteModalOpen && tenantId && (
        <InviteTenantUserModal 
          open={isInviteModalOpen} 
          onOpenChange={setIsInviteModalOpen} 
          tenantId={tenantId}
          onSuccess={() => loadTenant()}
        />
      )}
    </div>
  );
}
