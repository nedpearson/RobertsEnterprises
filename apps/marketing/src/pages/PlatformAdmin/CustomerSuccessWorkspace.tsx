import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeartHandshake, AlertCircle, CheckCircle2, TrendingUp, Clock, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getOrganizations, isPlatformDemoPlane, subscribePlatformPlane } from '@/lib/platform/platformDataSource';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';

/** Common view model so the demo plane and the live query render identically. */
interface OrgRow {
  id: string; name: string; slug: string;
  onboardingStatus: string; onboardingPct: number | null;
  operationalStatus: string; openTickets: number; createdAt: string;
}

export default function CustomerSuccessWorkspace() {
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      if (isPlatformDemoPlane()) {
        const { data } = getOrganizations();
        if (cancelled) return;
        setOrganizations(data.map((o) => ({
          id: o.id, name: o.name, slug: o.slug,
          onboardingStatus: o.onboardingStatus, onboardingPct: o.onboardingPct,
          operationalStatus: o.operationalStatus, openTickets: o.openTickets, createdAt: o.createdAt,
        })));
        setLoading(false);
        return;
      }

      try {
        // A hung Supabase call has no default timeout, which is how this view
        // could sit on "Loading success metrics..." forever with no way out.
        const query = supabase
          .from('businesses')
          .select('*, support_tickets(id, status)')
          .order('created_at', { ascending: false })
          .limit(50);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timed out after 15s waiting for organization data.')), 15000));

        const { data, error: qError } = await Promise.race([query, timeout]) as Awaited<typeof query>;
        if (cancelled) return;
        if (qError) throw qError;

        setOrganizations((data || []).map((o: any) => {
          const tickets = Array.isArray(o.support_tickets) ? o.support_tickets : [];
          return {
            id: o.id, name: o.name, slug: o.slug,
            onboardingStatus: o.onboarding_status ?? 'UNKNOWN',
            // No invented percentage. Unknown stays unknown.
            onboardingPct: o.onboarding_status === 'COMPLETE' ? 100 : null,
            operationalStatus: o.status ?? 'UNKNOWN',
            openTickets: tickets.filter((t: any) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length,
            createdAt: o.created_at,
          };
        }));
      } catch (err: any) {
        if (cancelled) return;
        // Surface it. A swallowed error rendered as an empty table reads as
        // "you have no customers", which is the opposite of the truth.
        setError(err?.message ?? 'Failed to load organization data.');
        setOrganizations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const unsub = subscribePlatformPlane(() => { load(); });
    return () => { cancelled = true; unsub(); };
  }, []);

  const getOrgHealth = (org: OrgRow) => {
    if (org.operationalStatus === 'SUSPENDED') return { status: 'AT_RISK', label: 'Suspended', color: 'bg-red-100 text-red-800' };
    if (org.operationalStatus === 'READ_ONLY') return { status: 'AT_RISK', label: 'Read only', color: 'bg-orange-100 text-orange-800' };
    if (org.onboardingStatus === 'UNKNOWN') return { status: 'UNKNOWN', label: 'Unknown', color: 'bg-stone-100 text-stone-700' };
    if (org.onboardingStatus !== 'COMPLETE') return { status: 'ONBOARDING', label: 'Onboarding', color: 'bg-blue-100 text-blue-800' };
    return { status: 'HEALTHY', label: 'Adopting', color: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="space-y-6">
      <PlatformDemoBanner />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Customer Success Workspace</h1>
        <p className="text-stone-500">Monitor onboarding, feature adoption, and account health across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Organizations</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => new Date(o.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}</div>
            <p className="text-xs text-muted-foreground">in last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Onboarding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.onboardingStatus === 'IN_PROGRESS' || o.onboardingStatus === 'NOT_STARTED').length}</div>
            <p className="text-xs text-muted-foreground">Setup incomplete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live & Adopting</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.onboardingStatus === 'COMPLETE' && o.operationalStatus === 'ACTIVE').length}</div>
            <p className="text-xs text-muted-foreground">Healthy usage trends</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.operationalStatus === 'SUSPENDED' || o.operationalStatus === 'READ_ONLY').length}</div>
            <p className="text-xs text-muted-foreground">Critical support issues</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization 360 Health</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Health Stage</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Open Tickets</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading success metrics...</TableCell>
                </TableRow>
              ) : organizations.length === 0 ? (
                <PlatformTableState
                  colSpan={5}
                  error={error}
                  empty="No organizations yet."
                  emptyHint="Create the first one from the Organizations directory, or turn on the demo plane to exercise this view."
                />
              ) : organizations.map((org) => {
                const health = getOrgHealth(org);
                const onboardingProgress = org.onboardingPct;
                const openTickets = org.openTickets;

                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      {org.name}
                      <div className="text-xs text-stone-500">{org.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={health.color} variant="secondary">
                        {health.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {onboardingProgress === null ? (
                        <span className="text-xs text-stone-400">Not reported</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-stone-200 rounded-full h-2.5 max-w-[100px]">
                            <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${onboardingProgress}%` }}></div>
                          </div>
                          <span className="text-[11px] text-stone-500">{onboardingProgress}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {openTickets > 0 ? (
                        <span className="text-red-600 font-medium">{openTickets}</span>
                      ) : (
                        <span className="text-stone-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/platform/tenant/${org.id}`}>View 360</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

