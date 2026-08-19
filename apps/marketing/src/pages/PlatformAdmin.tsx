import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard, Activity, Search, LayoutDashboard, Shield, AlertTriangle, CloudRain, Briefcase, Zap, ShieldAlert, BookOpen, GitCommitHorizontal, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { PlatformDemoToggle } from '@/components/platform/PlatformStates';
import TenantControlCenter from './PlatformAdmin/TenantControlCenter';
import TenantWizard from './PlatformAdmin/TenantWizard';
import UserDirectory from './PlatformAdmin/UserDirectory';
import SystemHealthView from './PlatformAdmin/SystemHealthView';
import FailedJobsView from './PlatformAdmin/FailedJobsView';
import IncidentsView from './PlatformAdmin/IncidentsView';
import IntegrationsHealthView from './PlatformAdmin/IntegrationsHealthView';
import PlatformAuditView from './PlatformAdmin/PlatformAuditView';
import ReleaseDashboardView from './PlatformAdmin/ReleaseDashboardView';
import PlatformSalesView from './PlatformAdmin/PlatformSalesView';
import DemoAnalyticsView from './platform/DemoAnalyticsView';
import CustomerSuccessWorkspace from './PlatformAdmin/CustomerSuccessWorkspace';
import SupportQueue from './PlatformAdmin/SupportQueue';
import { HeartHandshake, HeadphonesIcon } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { calculatePlatformMRR, SubRecord } from '@/lib/finance/reconciliationEngine';
import { monthlyPriceCentsForPlan } from '@/config/commercialCatalog';

export default function PlatformAdmin() {
  const { userContext, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProfileLoading = !!session && !userContext;

  useEffect(() => {
    if (!loading && !isProfileLoading) {
      if (!userContext || (userContext.platform_role !== 'PLATFORM_OWNER' && userContext.platform_role !== 'SUPER_ADMIN')) {
        toast.error('Unauthorized access');
        navigate('/login');
      }
    }
  }, [userContext, loading, isProfileLoading, navigate]);

  // Wait for auth and profile to finish loading before making any render decision
  if (loading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900" />
      </div>
    );
  }

  if (!userContext || (userContext.platform_role !== 'PLATFORM_OWNER' && userContext.platform_role !== 'SUPER_ADMIN')) return null;

  const navCategories = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Command Center', path: '/platform', icon: <LayoutDashboard className="w-4 h-4" /> },
      ]
    },
    {
      title: 'REVENUE',
      items: [
        { name: 'Corporate Sales', path: '/platform/sales', icon: <DollarSign className="w-4 h-4" /> },
        { name: 'Demo Funnel', path: '/platform/demo-analytics', icon: <Users className="w-4 h-4" /> },
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { name: 'User Directory', path: '/platform/users', icon: <Users className="w-4 h-4" /> },
        { name: 'Customer Success', path: '/platform/success', icon: <HeartHandshake className="w-4 h-4" /> },
        { name: 'Support Queue', path: '/platform/support', icon: <HeadphonesIcon className="w-4 h-4" /> },
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'System Health', path: '/platform/health', icon: <Activity className="w-4 h-4" /> },
        { name: 'Incidents', path: '/platform/incidents', icon: <AlertTriangle className="w-4 h-4" /> },
        { name: 'Failed Jobs', path: '/platform/jobs', icon: <Briefcase className="w-4 h-4" /> },
        { name: 'Integrations', path: '/platform/integrations', icon: <Zap className="w-4 h-4" /> },
      ]
    },
    {
      title: 'ENGINEERING / GOVERNANCE',
      items: [
        { name: 'Release Dashboard', path: '/platform/releases', icon: <GitCommitHorizontal className="w-4 h-4" /> },
        { name: 'Audit Log', path: '/platform/audit', icon: <BookOpen className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <div className="w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-xl font-serif text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-primary" /> VowOS Platform
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-2">Operations Center</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6 px-3">
            {navCategories.map(category => (
              <div key={category.title}>
                <h3 className="px-3 text-[10px] font-bold tracking-wider text-stone-500 uppercase mb-2">{category.title}</h3>
                <ul className="space-y-1">
                  {category.items.map(item => {
                    // Exact match for root, prefix match for others to keep state active
                    const isActive = item.path === '/platform' ? location.pathname === '/platform' : location.pathname.startsWith(item.path);
                    return (
                      <li key={item.path}>
                        <Link 
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-stone-800 text-white font-medium' : 'hover:bg-stone-800/50 hover:text-stone-100'}`}
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-stone-800">
          <Button variant="ghost" className="w-full justify-start text-stone-400 hover:text-white hover:bg-stone-800" onClick={() => navigate('/app')}>
            Exit Operations
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-800">
            {navCategories.flatMap(c => c.items).find(i => i.path === location.pathname)?.name || 'Platform Admin'}
          </h2>
          <PlatformDemoToggle />
        </header>
        <main className="p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<PlatformAdminHome />} />
            <Route path="/sales" element={<PlatformSalesView />} />
            <Route path="/demo-analytics" element={<DemoAnalyticsView />} />
            <Route path="/success" element={<CustomerSuccessWorkspace />} />
            <Route path="/support" element={<SupportQueue />} />
            <Route path="/health" element={<SystemHealthView />} />
            <Route path="/incidents" element={<IncidentsView />} />
            <Route path="/jobs" element={<FailedJobsView />} />
            <Route path="/integrations" element={<IntegrationsHealthView />} />
            <Route path="/tenant/:tenantId" element={<TenantControlCenter />} />
              <Route path="/organizations/new" element={<TenantWizard />} />
            <Route path="/users" element={<UserDirectory />} />
            <Route path="/releases" element={<ReleaseDashboardView />} />
            <Route path="/audit" element={<PlatformAuditView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PlatformAdminHome({ currentTab = 'dashboard' }: { currentTab?: string }) {
  const { userContext } = useAuth();
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
      if (userContext?.platform_role !== 'PLATFORM_OWNER' && userContext?.platform_role !== 'SUPER_ADMIN') {
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
      
      const { data: usersData } = await supabase
        .from('business_memberships')
        .select('id', { count: 'exact', head: true });

      const { data: subsData } = await supabase
        .from('organization_subscriptions')
        .select('plan_id, status');

      // Price comes from the canonical plan catalog — the same PLANS record the
      // product sells from. The old hardcoded map here priced plan ids that do
      // not exist in the catalog ('starter', 'elite') at prices that disagreed
      // with it (growth $199 vs the catalog's $249), so Command Center MRR was
      // arithmetic on invented numbers. Unknown plan ids now price at 0 and are
      // logged, not guessed.
      const unpriced = new Set<string>();
      const subs: SubRecord[] = (subsData || []).map(sub => {
        const planId = sub.plan_id || '';
        const cents = monthlyPriceCentsForPlan(planId);
        if (cents === null && planId) unpriced.add(planId);
        return {
          tenantId: 'unknown',
          planId,
          status: sub.status === 'ACTIVE' ? 'ACTIVE' :
                  sub.status === 'TRIAL' ? 'TRIAL' :
                  sub.status === 'CANCELED' ? 'CANCELED' :
                  sub.status === 'PAST_DUE' ? 'PAST_DUE' :
                  sub.status === 'COMPED' ? 'COMPED' :
                  sub.status === 'INTERNAL' ? 'INTERNAL' : 'ACTIVE',
          interval: 'MONTHLY' as const,
          monthlyPriceCents: cents ?? 0,
        };
      });
      if (unpriced.size) {
        console.warn('[platform] subscriptions reference plan ids missing from the catalog; priced at $0:', [...unpriced]);
      }

      const currentMrrCents = calculatePlatformMRR(subs);

      setOrganizations(orgs || []);
      
      setMetrics({
        totalBusinesses: orgs?.length || 0,
        activeUsers: usersData?.length || 0,
        trialAccounts: orgs?.filter(o => o.subscription_status === 'TRIAL').length || 0,
        mrr: currentMrrCents / 100, // keep the UI expecting dollars for now, though we computed cents
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
            <Button variant="ghost" className={`w-full justify-start ${currentTab === 'dashboard' ? 'text-white bg-stone-800' : 'text-stone-300 hover:text-white hover:bg-stone-800'}`} onClick={() => navigate('/platform')}>
              <Building2 className="mr-2 h-4 w-4" /> Organizations
            </Button>
            <Button variant="ghost" className={`w-full justify-start ${currentTab === 'users' ? 'text-white bg-stone-800' : 'text-stone-300 hover:text-white hover:bg-stone-800'}`} onClick={() => navigate('/platform/users')}>
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
          <h1 className="text-2xl font-bold text-stone-900">{currentTab === 'users' ? 'User Directory' : 'Organizations'}</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="p-8">
          {currentTab === 'dashboard' ? (
            <>
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
                    <Button onClick={() => navigate('/platform/organizations/new')} size="sm" className="mt-2 bg-stone-900 text-white">+ CREATE ORGANIZATION</Button>
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
                            <Button variant="outline" size="sm" onClick={() => navigate(`/platform/tenant/${org.id}`)}>Manage</Button>
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
            </>
          ) : (
            <UserDirectory />
          )}
        </main>
      </div>
    </div>
  );
}
