import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Ticket, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { monthlyPriceCentsForPlan } from '@/config/commercialCatalog';

type HealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | 'UNKNOWN';

type PlatformOrganization = {
  id: string;
  name: string;
  organization_type: string | null;
  created_at: string;
  health_status: HealthStatus | string | null;
  health_score: number | null;
  plan_id: string | null;
  subscription_status: string | null;
  account_type: string | null;
  standard_price_cents: number | null;
  effective_price_cents: number | null;
  open_tickets: number | null;
};

type PaginationMetadata = {
  total_pages: number;
  total_count: number;
  page: number;
  page_size?: number;
};

const HEALTH_FILTERS = new Set<HealthStatus>(['HEALTHY', 'AT_RISK', 'CRITICAL', 'UNKNOWN']);

const formatCurrencyFromCents = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function PlatformOrganizations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [metadata, setMetadata] = useState<PaginationMetadata>({
    total_pages: 1,
    total_count: 0,
    page: 1,
  });

  const healthFilter = useMemo(() => {
    const raw = (searchParams.get('status') || '').trim().toUpperCase() as HealthStatus;
    return HEALTH_FILTERS.has(raw) ? raw : null;
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, healthFilter]);

  useEffect(() => {
    let cancelled = false;

    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('platform_get_organizations', {
          p_search: debouncedSearch || null,
          p_status: healthFilter,
          p_page: page,
          p_page_size: 25,
        });

        if (error) throw error;
        if (cancelled) return;

        setOrganizations((data?.data || []) as PlatformOrganization[]);
        setMetadata(
          (data?.metadata || {
            total_pages: 1,
            total_count: 0,
            page,
          }) as PaginationMetadata,
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown platform data error';
        setOrganizations([]);
        toast({
          title: 'Failed to load organizations',
          description: message,
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrganizations();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, healthFilter, page, toast]);

  const getHealthBadge = (status: string | null, score: number | null) => {
    const normalizedStatus = status || 'UNKNOWN';
    const normalizedScore = Number.isFinite(score) ? score : 0;

    if (normalizedStatus === 'CRITICAL') {
      return <Badge variant="destructive">Critical ({normalizedScore})</Badge>;
    }
    if (normalizedStatus === 'AT_RISK') {
      return <Badge className="bg-orange-500 hover:bg-orange-600">At Risk ({normalizedScore})</Badge>;
    }
    if (normalizedStatus === 'UNKNOWN') {
      return <Badge variant="outline">Unknown</Badge>;
    }
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Healthy ({normalizedScore})</Badge>;
  };

  const organizationMrrCents = (org: PlatformOrganization) => {
    const status = (org.subscription_status || '').toUpperCase();
    if (status !== 'ACTIVE' && status !== 'TRIALING') return 0;

    if (typeof org.effective_price_cents === 'number') {
      return Math.max(0, org.effective_price_cents);
    }

    if ((org.account_type || '').toUpperCase() === 'COMPED') return 0;
    return monthlyPriceCentsForPlan(org.plan_id || '') ?? 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Organizations Directory</CardTitle>
            <CardDescription>
              Manage all customer organizations across the VowOS platform.
              {healthFilter ? ` Filtered to ${healthFilter.replace('_', ' ').toLowerCase()}.` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
              <Input
                placeholder="Search organizations..."
                className="w-[300px] pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button onClick={() => navigate('/platform/organizations/new')} className="bg-stone-900 text-white">
              + New Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Support</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-stone-400" />
                  </TableCell>
                </TableRow>
              ) : organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-stone-500">
                    No organizations found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-stone-50"
                    onClick={() => navigate(`/platform/tenant/${org.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-stone-500">{org.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.organization_type || 'Business'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium capitalize">{org.plan_id || 'Unassigned'}</div>
                      <div className="text-xs text-stone-500">
                        {org.account_type || 'PAID'} · {org.subscription_status || 'Unknown status'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-stone-600">
                        <CreditCard className="mr-1 h-3 w-3" />
                        {formatCurrencyFromCents(organizationMrrCents(org))}
                      </div>
                    </TableCell>
                    <TableCell>{getHealthBadge(org.health_status, org.health_score)}</TableCell>
                    <TableCell>
                      {(org.open_tickets || 0) > 0 ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <Ticket className="h-3 w-3" /> {org.open_tickets} Open
                        </Badge>
                      ) : (
                        <span className="text-sm text-stone-400">Clear</span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-500">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {metadata.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-stone-500">
                Showing page {metadata.page || page} of {metadata.total_pages} ({metadata.total_count} total organizations)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(metadata.total_pages, current + 1))}
                  disabled={page === metadata.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
