import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard, Activity, Search, LayoutDashboard, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalBusinesses: 0,
    activeUsers: 0,
    trialAccounts: 0,
    mrr: 0,
  });

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_super_admin');
      if (rpcError || !isAdmin) {
        toast.error('Unauthorized access');
        navigate('/login');
        return;
      }

      // Fetch orgs (in real app, use a dedicated RPC or direct select if policies allow)
      // Since Super Admin might not be a member of `business_memberships`, they rely on the `is_super_admin()` RLS bypass if configured, or a specific RPC.
      // For this implementation, we assume RLS allows Super Admin to select from `businesses`.
      // Note: we haven't added an RLS policy to `businesses` specifically for `is_super_admin()` yet. 
      // We should add it or use an RPC. Let's use a standard select assuming we'll add the policy.
      const { data: orgs, error: orgsError } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      
      setOrganizations(orgs || []);
      
      setMetrics({
        totalBusinesses: orgs?.length || 0,
        activeUsers: 142, // Mocked for UI purposes until user metrics are aggregated
        trialAccounts: orgs?.filter(o => o.subscription_status === 'TRIAL').length || 0,
        mrr: 0,
      });

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Control Plane...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-stone-900 text-stone-100 flex flex-col">
        <div className="p-4 border-b border-stone-800">
          <div className="font-bold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            VowOS Platform
          </div>
          <div className="text-xs text-stone-400 mt-1">Super Admin Console</div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            <Button variant="ghost" className="w-full justify-start text-stone-300 hover:text-white hover:bg-stone-800">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start text-white bg-stone-800">
              <Building2 className="mr-2 h-4 w-4" /> Organizations
            </Button>
            <Button variant="ghost" className="w-full justify-start text-stone-300 hover:text-white hover:bg-stone-800">
              <Users className="mr-2 h-4 w-4" /> Users
            </Button>
            <Button variant="ghost" className="w-full justify-start text-stone-300 hover:text-white hover:bg-stone-800">
              <Activity className="mr-2 h-4 w-4" /> System Health
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">Organizations</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="p-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-stone-500 font-medium">Total Businesses</div>
                  <Building2 className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold mt-2">{metrics.totalBusinesses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-stone-500 font-medium">Active Users</div>
                  <Users className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold mt-2">{metrics.activeUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-stone-500 font-medium">Trial Accounts</div>
                  <AlertTriangle className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold mt-2">{metrics.trialAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-stone-500 font-medium">Platform MRR</div>
                  <CreditCard className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold mt-2">${metrics.mrr.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tenant Directory</CardTitle>
                <CardDescription>Manage all businesses and individual workspaces.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                  <Input placeholder="Search organizations..." className="pl-9 w-[300px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.organization_type}</TableCell>
                      <TableCell className="text-stone-500">{org.slug || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={org.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.subscription_status}</TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {organizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                        No organizations found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
