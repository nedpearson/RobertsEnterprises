import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HeadphonesIcon,
  AlertCircle,
  Clock,
  Filter,
  MessageSquare,
  CheckCircle2,
  X,
  RotateCw,
} from 'lucide-react';
import { getSupportTickets } from '@/lib/platform/platformDataSource';
import { SupportTicketDrawer } from './components/SupportTicketDrawer';
import { formatDistanceToNow, isToday } from 'date-fns';

export default function SupportQueue() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const filter: any = {};
      if (statusFilter !== 'ALL') filter.status = statusFilter;
      if (categoryFilter !== 'ALL') filter.category = categoryFilter;
      if (severityFilter !== 'ALL') filter.severity = severityFilter;

      const { data, error } = await getSupportTickets(filter);
      if (error) {
        console.error('Error fetching tickets', error);
        setTickets([]);
      } else {
        setTickets(data || []);
      }
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, severityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleReviewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const handleTicketUpdated = () => {
    fetchTickets();
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSeverityFilter('ALL');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || categoryFilter !== 'ALL' || severityFilter !== 'ALL';

  // Compute metrics dynamically
  const newTicketsCount = tickets.filter((t) => t.status === 'NEW').length;
  const criticalCount = tickets.filter((t) => t.severity === 'Critical').length;
  const waitingCount = tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'NEW').length;
  const resolvedTodayCount = tickets.filter((t) => {
    if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false;
    const dateToCheck = t.resolved_at || t.updated_at;
    if (!dateToCheck) return false;
    try {
      return isToday(new Date(dateToCheck));
    } catch {
      return false;
    }
  }).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Question':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'WAITING_ON_CUSTOMER':
        return 'bg-yellow-100 text-yellow-800';
      case 'WAITING_ON_PROVIDER':
        return 'bg-amber-100 text-amber-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-stone-100 text-stone-600';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Platform Support Queue</h1>
          <p className="text-stone-500">Triage, review conversation threads, and resolve tenant support requests.</p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-stone-500 hover:text-stone-900">
              <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Filter className="w-3.5 h-3.5" />
                {hasActiveFilters ? 'Filters (Active)' : 'Filter Queue'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 space-y-3">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Filter Tickets
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div>
                <span className="text-[11px] font-medium text-stone-600 block mb-1">Status</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="WAITING_ON_CUSTOMER">Waiting on Client</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-[11px] font-medium text-stone-600 block mb-1">Severity</span>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Question">Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-[11px] font-medium text-stone-600 block mb-1">Category</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="ACCOUNT">Account</SelectItem>
                    <SelectItem value="BOOKING">Booking</SelectItem>
                    <SelectItem value="CUSTOMERS">Customers</SelectItem>
                    <SelectItem value="ORDERS">Orders</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="SHOPIFY">Shopify</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={fetchTickets} className="gap-1.5 text-xs">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-stone-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-700">New Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{newTicketsCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-stone-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-700">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{criticalCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-stone-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-700">Waiting on Us</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{waitingCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-stone-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-700">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{resolvedTodayCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <CardHeader>
          <CardTitle className="text-base font-medium">Active Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
                    Loading queue...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                    No active support tickets found {hasActiveFilters ? 'matching filters' : ''}.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.subject}
                      <div className="text-xs text-stone-500 max-w-[250px] truncate">{ticket.description}</div>
                    </TableCell>
                    <TableCell className="text-xs">{ticket.organizations?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getSeverityColor(ticket.severity)}`}>
                        {ticket.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-stone-500">
                      {ticket.created_at
                        ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleReviewTicket(ticket)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Support Ticket Review Drawer */}
      <SupportTicketDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  );
}
