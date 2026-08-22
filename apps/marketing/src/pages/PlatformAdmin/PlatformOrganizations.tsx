import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronRight, CreditCard, Loader2, MapPin, RefreshCw, Search, Tags, Ticket, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrganizationRow {
  id: string;
  name: string;
  slug?: string | null;
  organization_type?: string | null;
  status?: string | null;
  onboarding_status?: string | null;
  mrr_cents?: number | null;
  health_status?: string | null;
  health_score?: number | null;
  open_tickets?: number | null;
  user_count?: number | null;
  location_count?: number | null;
  brand_count?: number | null;
  created_at: string;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function PlatformOrganizations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({ page: 1, total_pages: 1, total_count: 0 });
  const statusFilter = searchParams.get('status');

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('platform_get_organizations', {
        p_search: search || null,
        p_status: statusFilter || null,
        p_page: page,
        p_page_size: 25,
      });
      if (rpcError) throw rpcError;
      if (!data || typeof data !== 'object') throw new Error('Organization directory returned an invalid response.');
      const result = data as any;
      setOrganizations((result.data || []) as OrganizationRow[]);
      setMetadata(result.metadata || { page, total_pages: 1, total_count: 0 });
    } catch (err: any) {
      const message = err?.message || 'Failed to load organizations.';
      setOrganizations([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchOrganizations(); }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchOrganizations]);

  const healthBadge = (status?: string | null, score?: number | null) => {
    const normalized = String(status || 'UNKNOWN').toUpperCase();
    const scoreLabel = typeof score === 'number' && score > 0 ? ` (${score})` : '';
    if (normalized === 'CRITICAL') return <Badge variant="destructive">Critical{scoreLabel}</Badge>;
    if (normalized === 'AT_RISK') return <Badge className="bg-orange-500 text-white">At Risk{scoreLabel}</Badge>;
    if (normalized === 'HEALTHY' || normalized === 'EXCELLENT') return <Badge className="bg-emerald-600 text-white">Healthy{scoreLabel}</Badge>;
    return <Badge variant="outline">Unknown{scoreLabel}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Organizations Directory</CardTitle>
            <CardDescription>
              {statusFilter ? `Filtered by: ${statusFilter.replace(/_/g, ' ')}` : 'Manage every tenant provisioned into the VowOS platform.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
              <Input
                placeholder="Search name or slug..."
                className="w-[280px] pl-9"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => void fetchOrganizations()} disabled={loading} aria-label="Refresh organizations">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/platform/organizations/new')} className="bg-stone-900 text-white">+ New Organization</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div><p className="font-medium text-red-900">Organization data unavailable</p><p className="text-sm text-red-700">{error}</p></div>
              <Button variant="outline" size="sm" onClick={() => void fetchOrganizations()}>Retry</Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Structure</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Support</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && organizations.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-stone-400" /></TableCell></TableRow>
              ) : !error && organizations.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-stone-500">No organizations found matching the current criteria.</TableCell></TableRow>
              ) : organizations.map((org) => (
                <TableRow key={org.id} className="cursor-pointer hover:bg-stone-50" onClick={() => navigate(`/platform/tenant/${org.id}`)}>
                  <TableCell>
                    <div className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 text-stone-400" /><div><div className="font-medium">{org.name}</div><div className="text-xs text-stone-500">{org.slug || org.id}</div></div></div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1"><Badge variant="outline">{org.status || 'UNKNOWN'}</Badge>{org.organization_type && <div className="text-xs text-stone-400">{org.organization_type}</div>}</div>
                  </TableCell>
                  <TableCell><div className="flex items-center text-stone-700"><CreditCard className="mr-1 h-3 w-3" />{money.format(Number(org.mrr_cents || 0) / 100)}</div></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3" />{org.brand_count || 0}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{org.location_count || 0}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{org.user_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>{healthBadge(org.health_status, org.health_score)}</TableCell>
                  <TableCell>
                    {(org.open_tickets || 0) > 0 ? <Badge variant="destructive" className="gap-1"><Ticket className="h-3 w-3" />{org.open_tickets} Open</Badge> : <span className="text-sm text-stone-400">Clear</span>}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`/platform/tenant/${org.id}`); }}>View 360 <ChevronRight className="ml-1 h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {metadata.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-stone-500">Page {metadata.page} of {metadata.total_pages} · {metadata.total_count} organizations</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(metadata.total_pages, value + 1))} disabled={page >= metadata.total_pages || loading}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
