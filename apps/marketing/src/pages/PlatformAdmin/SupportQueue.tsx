import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, HeadphonesIcon, Loader2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { updateSupportTicketStatus } from '@/lib/platform/platformOperationsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SupportTicketRow {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string | null;
  category: string | null;
  severity: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  business_id: string | null;
  businesses?: { name?: string | null } | null;
}

export default function SupportQueue() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState<SupportTicketRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('support_tickets')
        .select('id,subject,description,status,priority,category,severity,created_at,updated_at,resolved_at,business_id,businesses:business_id(name)')
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setTickets((data || []) as unknown as SupportTicketRow[]);
    } catch (err: any) {
      const message = err?.message || 'Failed to load support tickets.';
      setTickets([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
      const matchesSearch = !needle || [ticket.subject, ticket.description, ticket.businesses?.name, ticket.category, ticket.severity]
        .some((value) => String(value || '').toLowerCase().includes(needle));
      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, statusFilter]);

  const resolvedToday = tickets.filter((ticket) => ticket.resolved_at && isToday(new Date(ticket.resolved_at))).length;

  const setTicketStatus = async (status: 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED') => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateSupportTicketStatus(selected.id, status);
      toast.success(`Ticket marked ${status.replace(/_/g, ' ').toLowerCase()}.`);
      await fetchTickets();
      setSelected((current) => current ? { ...current, status, resolved_at: ['RESOLVED', 'CLOSED'].includes(status) ? new Date().toISOString() : null } : null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update support ticket.');
    } finally {
      setSaving(false);
    }
  };

  const severityClass = (severity?: string | null) => {
    switch (String(severity || '').toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'QUESTION': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Platform Support Queue</h1>
          <p className="text-stone-500">Triage and resolve real tenant support requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" /><Input className="w-64 pl-9" placeholder="Search tickets..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="NEW">New</SelectItem><SelectItem value="OPEN">Open</SelectItem><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="WAITING_ON_CUSTOMER">Waiting on Customer</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent></Select>
          <Button variant="outline" size="icon" onClick={() => void fetchTickets()} disabled={loading} aria-label="Refresh support queue"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-red-800">Support data failed to load: {error}</p><Button variant="outline" size="sm" onClick={() => void fetchTickets()}>Retry</Button></CardContent></Card>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat title="New Tickets" value={tickets.filter((ticket) => ['NEW', 'OPEN'].includes(ticket.status)).length} icon={<MessageSquare className="h-4 w-4 text-purple-500" />} />
        <Stat title="Critical" value={tickets.filter((ticket) => String(ticket.severity || '').toUpperCase() === 'CRITICAL').length} icon={<AlertCircle className="h-4 w-4 text-red-500" />} />
        <Stat title="Waiting on Us" value={tickets.filter((ticket) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(ticket.status)).length} icon={<Clock className="h-4 w-4 text-blue-500" />} />
        <Stat title="Resolved Today" value={resolvedToday} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HeadphonesIcon className="h-5 w-5" /> Support Tickets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Organization</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Opened</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && tickets.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" /></TableCell></TableRow> : !error && filteredTickets.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-stone-500">No support tickets match the current filters.</TableCell></TableRow> : filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium"><div>{ticket.subject}</div><div className="max-w-[260px] truncate text-xs text-stone-500">{ticket.description || 'No description'}</div></TableCell>
                  <TableCell>{ticket.businesses?.name || ticket.business_id || 'Unmapped'}</TableCell>
                  <TableCell><Badge variant="outline">{ticket.category || 'ACCOUNT'}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={severityClass(ticket.severity)}>{ticket.severity || ticket.priority || 'Normal'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{ticket.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-sm text-stone-500">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setSelected(ticket)}>Review</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.subject || 'Support Ticket'}</DialogTitle><DialogDescription>{selected?.businesses?.name || selected?.business_id || 'Unmapped organization'} · {selected?.status.replace(/_/g, ' ')}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-5"><div className="rounded-lg border bg-stone-50 p-4 text-sm whitespace-pre-wrap">{selected.description || 'No description was supplied.'}</div><dl className="grid grid-cols-2 gap-4 text-sm"><Detail label="Category" value={selected.category || 'ACCOUNT'} /><Detail label="Severity" value={selected.severity || selected.priority || 'Normal'} /><Detail label="Opened" value={new Date(selected.created_at).toLocaleString()} /><Detail label="Updated" value={new Date(selected.updated_at).toLocaleString()} /></dl></div>}
          <DialogFooter className="flex-wrap sm:justify-between">
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void setTicketStatus('IN_PROGRESS')} disabled={saving}>Start Work</Button><Button variant="outline" onClick={() => void setTicketStatus('WAITING_ON_CUSTOMER')} disabled={saving}>Waiting on Customer</Button></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Close</Button><Button onClick={() => void setTicketStatus('RESOLVED')} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Resolve</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 text-stone-800">{value}</dd></div>;
}
