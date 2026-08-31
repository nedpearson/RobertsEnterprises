import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  ArrowUpRight, 
  Award, 
  Percent, 
  ShieldCheck, 
  Building2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { ViewKey } from '@/lib/navigation/navigationRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import { LOCATIONS, locationById, formatCents } from '@/data/vowosData';

interface OwnerExecutiveOverviewProps {
  onNavigate?: (view: ViewKey) => void;
}

export default function OwnerExecutiveOverview({ onNavigate: onNavigateProp }: OwnerExecutiveOverviewProps) {
  // ReportsWorkspace mounts this without a handler; every CTA used to throw
  // "onNavigate is not a function". Fall back to the canonical router.
  const { navigateToView } = useApplicationRoute();
  void onNavigateProp; // retained for API compatibility; all CTAs route through navigateToView
  const { profile } = useAuth();
  const { brides, invoices, transfers } = useVowosData();

  // Every figure below is derived from the tenant's own records. The previous
  // version rendered literal strings ("+18.4% vs last year", "68.2%", a static
  // two-store table and a made-up leaderboard) as if they were live.
  const metrics = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthKey = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const dateOf = (i: { dueDate: string }) => (i.dueDate || '').slice(0, 10);

    const paidThisYear = invoices.filter((i) => dateOf(i).startsWith(String(year))).reduce((s, i) => s + i.paidCents, 0);
    const paidLastYear = invoices.filter((i) => dateOf(i).startsWith(String(year - 1))).reduce((s, i) => s + i.paidCents, 0);
    const yoy = paidLastYear > 0 ? ((paidThisYear - paidLastYear) / paidLastYear) * 100 : null;

    const open = invoices.filter((i) => i.amountCents - i.paidCents > 0);
    const outstandingCents = open.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
    const overdue = open.filter((i) => dateOf(i) && dateOf(i) < today);
    const overdueCents = overdue.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);

    const paidInvoices = invoices.filter((i) => i.paidCents > 0);
    const avgTicketCents = paidInvoices.length ? Math.round(paidInvoices.reduce((s, i) => s + i.paidCents, 0) / paidInvoices.length) : 0;

    const activeBrides = brides.filter((b) => b.status === 'Active').length;

    const byLocation = LOCATIONS.map((loc) => {
      const locInvoices = invoices.filter((i) => i.location === loc.id);
      const monthPaid = locInvoices.filter((i) => dateOf(i).startsWith(monthKey)).reduce((s, i) => s + i.paidCents, 0);
      const locOpen = locInvoices.reduce((s, i) => s + Math.max(0, i.amountCents - i.paidCents), 0);
      const locPaid = locInvoices.filter((i) => i.paidCents > 0);
      const aov = locPaid.length ? Math.round(locPaid.reduce((s, i) => s + i.paidCents, 0) / locPaid.length) : 0;
      const locBrides = brides.filter((b) => b.location === loc.id).length;
      return { loc, monthPaid, locOpen, aov, locBrides };
    }).filter((r) => r.monthPaid > 0 || r.locOpen > 0 || r.locBrides > 0);

    const brideByName = new Map(brides.map((b) => [b.name, b]));
    const stylistTotals = new Map<string, { revenue: number; count: number; location: string }>();
    for (const inv of invoices) {
      if (inv.paidCents <= 0) continue;
      const b = brideByName.get(inv.customer);
      const stylist = b?.stylist?.trim();
      if (!stylist) continue;
      const cur = stylistTotals.get(stylist) ?? { revenue: 0, count: 0, location: locationById(inv.location)?.short ?? '' };
      cur.revenue += inv.paidCents;
      cur.count += 1;
      stylistTotals.set(stylist, cur);
    }
    const leaderboard = Array.from(stylistTotals.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    const pendingTransfers = transfers.filter((t) => t.status !== 'Received').length;

    return { paidThisYear, yoy, open, outstandingCents, overdue, overdueCents, avgTicketCents, activeBrides, byLocation, leaderboard, pendingTransfers, monthLabel: now.toLocaleDateString('en-US', { month: 'long' }) };
  }, [invoices, brides, transfers]);

  const totalCollected = metrics.paidThisYear / 100;
  const outstandingBalance = metrics.outstandingCents / 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-850 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-brand-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-brand-primary/20 text-rose-300 border-brand-primary/30 uppercase tracking-widest text-[10px] font-bold">
                Executive Owner Portal
              </Badge>
              <span className="text-stone-400 text-xs font-medium">· Multi-Location View</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Executive Overview — {profile?.name || 'Owner'}
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-xl">
              High-level operational metrics, store comparative performance, gross margin ratios, and executive alerts across The Boutique.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => navigateToView('reports', { tab: 'sales' })}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs shadow-md"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Full Sales Drilldown
            </Button>
            <Button
              onClick={() => navigateToView('appointments', { tab: 'calendar', mode: 'calendar' })}
              variant="outline"
              className="border-stone-700 text-stone-200 hover:bg-white/10 text-xs font-semibold"
            >
              Master Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Core Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Revenue YTD</span>
              <div className="p-2 rounded-xl bg-status-success/10 text-status-success">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            {metrics.yoy === null ? (
              <p className="text-xs text-stone-400 font-medium mt-1">No prior-year sales to compare</p>
            ) : (
              <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${metrics.yoy >= 0 ? 'text-status-success' : 'text-rose-600'}`}>
                <ArrowUpRight className={`h-3.5 w-3.5 ${metrics.yoy < 0 ? 'rotate-90' : ''}`} /> {metrics.yoy >= 0 ? '+' : ''}{metrics.yoy.toFixed(1)}% vs last year
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Outstanding Receivables</span>
              <div className="p-2 rounded-xl bg-status-warning/10 text-status-warning">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-stone-500 font-medium mt-1">Across {metrics.open.length} open invoice{metrics.open.length === 1 ? '' : 's'}</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Average Ticket</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">{metrics.avgTicketCents ? formatCents(metrics.avgTicketCents) : '—'}</p>
            <p className="text-xs text-stone-500 font-medium mt-1">Per paid invoice, all time</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Active Brides</span>
              <div className="p-2 rounded-xl bg-vowos-violet/10 text-vowos-violet">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">{metrics.activeBrides.toLocaleString()}</p>
            <p className="text-xs text-stone-500 font-medium mt-1">Currently shopping · {brides.length.toLocaleString()} in CRM</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Location Store Performance Comparison */}
      <Card className="border-stone-200 shadow-xs">
        <CardHeader className="p-5 border-b border-stone-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-stone-500" />
              Location Performance Comparison
            </CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">Real-time revenue, target attainment, and conversion metrics by store</p>
          </div>
          <Button onClick={() => navigateToView('reports', { tab: 'sales' })} variant="ghost" size="sm" className="text-xs font-semibold text-brand-primary">
            View All Reports <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Location</th>
                <th className="p-4">{metrics.monthLabel} Revenue</th>
                <th className="p-4">Open Balance</th>
                <th className="p-4">Brides</th>
                <th className="p-4">Avg Order Value</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {metrics.byLocation.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-stone-400">No sales recorded yet for any location.</td></tr>
              )}
              {metrics.byLocation.map(({ loc, monthPaid, locOpen, aov, locBrides }) => (
                <tr key={loc.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4 font-bold text-stone-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-primary" />
                    {loc.business} · {loc.city}
                  </td>
                  <td className="p-4 font-semibold text-stone-900">{formatCents(monthPaid)}</td>
                  <td className="p-4 font-semibold text-stone-800">{formatCents(locOpen)}</td>
                  <td className="p-4 font-semibold text-stone-800">{locBrides.toLocaleString()}</td>
                  <td className="p-4 font-semibold text-stone-800">{aov ? formatCents(aov) : '—'}</td>
                  <td className="p-4">
                    {monthPaid > 0
                      ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Selling</Badge>
                      : <Badge className="bg-stone-100 text-stone-700 border-stone-200">No sales this month</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Stylists & Executive Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stylists Leaderboard */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="p-5 border-b border-stone-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-status-warning" />
              Top Revenue Consultants (This Month)
            </CardTitle>
            <Button onClick={() => navigateToView('team', { tab: 'employees' })} variant="ghost" size="sm" className="text-xs font-semibold text-stone-600">
              Manage Staff
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {metrics.leaderboard.length === 0 && (
              <p className="p-3 text-stone-400">No paid sales attributed to a stylist yet. Assign a stylist on each bride to build this leaderboard.</p>
            )}
            {metrics.leaderboard.map((stylist, idx) => (
              <div key={stylist.name} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{stylist.name}</p>
                    <p className="text-[10px] text-stone-500">{stylist.location || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">{formatCents(stylist.revenue)}</p>
                  <p className="text-[10px] text-stone-500 font-semibold">{stylist.count} paid invoice{stylist.count === 1 ? '' : 's'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Executive Action Alerts */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="p-5 border-b border-stone-100">
            <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-brand-primary" />
              Executive Alerts & Action items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {metrics.pendingTransfers === 0 && metrics.overdue.length === 0 && (
              <p className="p-3 text-stone-400">Nothing needs your attention right now.</p>
            )}

            {metrics.pendingTransfers > 0 && (
              <div className="p-3 rounded-xl bg-status-warning/10 border border-status-warning/20 text-amber-900 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-amber-950 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {metrics.pendingTransfers} Store Transfer{metrics.pendingTransfers === 1 ? '' : 's'} Pending</p>
                  <p className="text-stone-600 mt-0.5">Gowns in transit or awaiting receipt between locations.</p>
                </div>
                <Button onClick={() => navigateToView('inventory', { tab: 'transfers' })} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 shadow-sm font-bold">
                  Review Transfers
                </Button>
              </div>
            )}

            {metrics.overdue.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-rose-950 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {metrics.overdue.length} Invoice{metrics.overdue.length === 1 ? '' : 's'} Overdue</p>
                  <p className="text-stone-600 mt-0.5">{formatCents(metrics.overdueCents)} outstanding past due date.</p>
                </div>
                <Button onClick={() => navigateToView('sales', { tab: 'invoices' })} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 shadow-sm font-bold">
                  Follow Up Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


