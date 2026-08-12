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
import { Loader2, ArrowLeft, Save, Building2, UserCircle, Settings2, Package, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TenantControlCenter() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    
    async function loadTenant() {
      try {
        const [orgRes, subRes, memRes] = await Promise.all([
          supabase.from('businesses').select('*').eq('id', tenantId).single(),
          supabase.from('organization_subscriptions').select('*').eq('business_id', tenantId).maybeSingle(),
          supabase.from('business_memberships').select('*, staff_profiles(name, email)').eq('business_id', tenantId)
        ]);

        if (orgRes.error) throw orgRes.error;
        
        setTenant(orgRes.data);
        if (subRes.data) setSubscription(subRes.data);
        if (memRes.data) setMembers(memRes.data);

      } catch (err: any) {
        toast.error('Failed to load tenant details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadTenant();
  }, [tenantId]);

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
        const { error: subError } = await supabase
          .from('organization_subscriptions')
          .update({
            plan_id: subscription.plan_id,
            status: subscription.status
          })
          .eq('business_id', tenantId);
        
        if (subError) throw subError;
      }

      toast.success('Tenant settings saved successfully');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async (userId: string) => {
    toast.info('Initiating secure support session...');
    // Real implementation would securely acquire a short-lived token or utilize a special RLS bypass
    // For this prototype, we'll navigate with a query parameter that the auth context can pick up (if implemented).
    // DO NOT USE THIS IN PRODUCTION WITHOUT PROPER SECURE IMPERSONATION PROTOCOLS
    setTimeout(() => {
      window.location.href = `/?impersonate=${userId}&tenant=${tenantId}`;
    }, 1000);
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!tenant) {
    return <div className="p-8">Tenant not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/platform-admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{tenant.name}</h2>
        <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'destructive'}>{tenant.status}</Badge>
        <Badge variant="outline">{tenant.organization_type}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-stone-500" /> Core Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={tenant.name} onChange={e => setTenant({...tenant, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Tenant Slug</Label>
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
                  <Label>Onboarding Status</Label>
                  <Select value={tenant.onboarding_status} onValueChange={v => setTenant({...tenant, onboarding_status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETE">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-stone-50 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5 text-stone-500" /> Members & Access</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleImpersonate(m.user_id)}>
                          <ShieldAlert className="w-4 h-4 mr-2" /> Impersonate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-stone-500" /> Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="space-y-2">
                    <Label>Plan ID</Label>
                    <Select value={subscription.plan_id || 'essentials'} onValueChange={v => setSubscription({...subscription, plan_id: v})}>
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
                    <Select value={subscription.status || 'ACTIVE'} onValueChange={v => setSubscription({...subscription, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="TRIAL">Trial</SelectItem>
                        <SelectItem value="PAST_DUE">Past Due</SelectItem>
                        <SelectItem value="CANCELED">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="text-sm text-stone-500">No active subscription record found.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-stone-500" /> Entitlement Overrides</CardTitle>
              <CardDescription>Force modules on/off regardless of plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Analytics</Label>
                  <div className="text-xs text-stone-500">Early Access Beta</div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Multi-location</Label>
                  <div className="text-xs text-stone-500">Enterprise only</div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
