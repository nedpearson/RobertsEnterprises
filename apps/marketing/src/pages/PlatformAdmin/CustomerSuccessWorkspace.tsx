import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeartHandshake, AlertCircle, CheckCircle2, TrendingUp, Clock, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function CustomerSuccessWorkspace() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuccessData();
  }, []);

  const fetchSuccessData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*, support_tickets(id, status)')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Failed to fetch success data', err);
    } finally {
      setLoading(false);
    }
  };

  const getOrgHealth = (org: any) => {
    if (org.status === 'SUSPENDED') return { status: 'AT_RISK', label: 'Suspended', color: 'bg-red-100 text-red-800' };
    if (org.onboarding_status !== 'COMPLETE') return { status: 'ONBOARDING', label: 'Onboarding', color: 'bg-blue-100 text-blue-800' };
    return { status: 'HEALTHY', label: 'Adopting', color: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="space-y-6">
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
            <div className="text-2xl font-bold">{organizations.filter(o => new Date(o.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}</div>
            <p className="text-xs text-muted-foreground">in last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Onboarding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.onboarding_status !== 'COMPLETE').length}</div>
            <p className="text-xs text-muted-foreground">Setup incomplete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live & Adopting</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.onboarding_status === 'COMPLETE' && o.status === 'ACTIVE').length}</div>
            <p className="text-xs text-muted-foreground">Healthy usage trends</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter(o => o.status === 'SUSPENDED').length}</div>
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
              ) : organizations.map((org) => {
                const health = getOrgHealth(org);
                const onboardingProgress = org.onboarding_status === 'COMPLETE' ? 100 : 50; 
                
                // Ensure support_tickets is an array, then filter
                const tickets = Array.isArray(org.support_tickets) ? org.support_tickets : [];
                const openTickets = tickets.filter((t: any) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
                
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
                      <div className="w-full bg-stone-200 rounded-full h-2.5 max-w-[100px]">
                        <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${onboardingProgress}%` }}></div>
                      </div>
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

