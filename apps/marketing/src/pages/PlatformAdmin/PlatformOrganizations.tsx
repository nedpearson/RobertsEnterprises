
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Building2, Ticket, Activity, CreditCard, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export function PlatformOrganizations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [metadata, setMetadata] = useState({ total_pages: 1, total_count: 0 });

  useEffect(() => {
    fetchOrganizations();
  }, [page, search]); // Debounce could be added for search in a real app

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('platform_get_organizations', {
        p_search: search || null,
        p_status: null,
        p_page: page,
        p_page_size: 25
      });

      if (error) throw error;
      if (data) {
        setOrganizations(data.data || []);
        setMetadata(data.metadata || { total_pages: 1, total_count: 0 });
      }
    } catch (err: any) {
      toast({ title: 'Failed to load organizations', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (status: string, score: number) => {
    if (status === 'CRITICAL') return <Badge variant="destructive">Critical ({score})</Badge>;
    if (status === 'AT_RISK') return <Badge className="bg-orange-500 hover:bg-orange-600">At Risk ({score})</Badge>;
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Healthy ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organizations Directory</CardTitle>
            <CardDescription>Manage all tenants across the VowOS platform.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
              <Input 
                placeholder="Search organizations..." 
                className="pl-9 w-[300px]" 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to page 1 on search
                }}
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
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-stone-400" />
                  </TableCell>
                </TableRow>
              ) : organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-stone-500">
                    No organizations found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => navigate(\/platform/tenant/\\)}>
                    <TableCell>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-stone-500">{org.id}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{org.organization_type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center text-stone-600">
                        <CreditCard className="w-3 h-3 mr-1" />
                        \
                      </div>
                    </TableCell>
                    <TableCell>{getHealthBadge(org.health_status, org.health_score)}</TableCell>
                    <TableCell>
                      {org.open_tickets > 0 ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <Ticket className="w-3 h-3" /> {org.open_tickets} Open
                        </Badge>
                      ) : (
                        <span className="text-stone-400 text-sm">Clear</span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {metadata.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 border-t pt-4">
              <div className="text-sm text-stone-500">
                Showing page {metadata.page} of {metadata.total_pages} ({metadata.total_count} total organizations)
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(metadata.total_pages, p + 1))} disabled={page === metadata.total_pages || loading}>
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
