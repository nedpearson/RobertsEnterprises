import { useMemo } from 'react';
import { DollarSign, TrendingUp, ChevronRight, MapPin, Shirt, Crown, Users } from 'lucide-react';
import { Badge } from '@vowos/design-system';
import { ViewKey } from '@/lib/navigation/navigationRegistry';
import { useVowosData } from '@/contexts/VowosDataContext';
import { locationById, formatCents } from '@/data/vowosData';

interface MobileOwnerOverviewProps {
  onNavigate: (view: ViewKey) => void;
}

/**
 * Owner's phone dashboard. Every figure is computed from the tenant's own
 * records; sections with no data show an empty state. The previous version
 * fell back to literals ('$12,450', 24 appointments, '68.2%' margin, a
 * Monique Lhuillier / Galia Lahav designer list and two invented VIP brides)
 * whenever a tenant had no data -- which is exactly when a new owner looks.
 */
export default function MobileOwnerOverview({ onNavigate }: MobileOwnerOverviewProps) {
  const { activeLocation, appointments, brides, invoices, gowns } = useVowosData();

  const currentLocation = useMemo(() => (activeLocation && activeLocation !== 'all' ? locationById(activeLocation) : null), [activeLocation]);

  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const stats = useMemo(() => {
    const paidToday = invoices.filter((i) => i.paidCents > 0 && (i.dueDate || '').slice(0, 10) === today).reduce((s, i) => s + i.paidCents, 0);
    const paidMonth = invoices.filter((i) => i.paidCents > 0 && (i.dueDate || '').startsWith(monthKey)).reduce((s, i) => s + i.paidCents, 0);
    const open = invoices.filter((i) => i.amountCents - i.paidCents > 0);
    const outstanding = open.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
    const apptsToday = appointments.filter((a) => (a.date || '').slice(0, 10) === today && a.status !== 'Cancelled').length;
    const upcoming = appointments.filter((a) => (a.date || '').slice(0, 10) >= today && a.status !== 'Cancelled' && a.status !== 'Completed').length;
    const activeBrides = brides.filter((b) => b.status === 'Active').length;
    const paidInvoices = invoices.filter((i) => i.paidCents > 0);
    const avgTicket = paidInvoices.length ? Math.round(paidInvoices.reduce((s, i) => s + i.paidCents, 0) / paidInvoices.length) : 0;
    return { paidToday, paidMonth, openCount: open.length, outstanding, apptsToday, upcoming, activeBrides, avgTicket };
  }, [invoices, appointments, brides, today, monthKey]);

  // Designers ranked by revenue this month, via invoices that name an inventory gown.
  const topDesigners = useMemo(() => {
    const totals = new Map<string, { revenue: number; units: number }>();
    for (const inv of invoices) {
      if (inv.paidCents <= 0 || !(inv.dueDate || '').startsWith(monthKey)) continue;
      const desc = (inv.description || '').toLowerCase();
      const gown = gowns.find((g) => desc && ((g.name && desc.includes(g.name.toLowerCase())) || (g.sku && desc.includes(g.sku.toLowerCase()))));
      if (!gown?.designer) continue;
      const cur = totals.get(gown.designer) ?? { revenue: 0, units: 0 };
      cur.revenue += inv.paidCents; cur.units += 1;
      totals.set(gown.designer, cur);
    }
    return Array.from(totals.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  }, [invoices, gowns, monthKey]);

  // Brides with something happening: an appointment today, or an open balance.
  const vipActivity = useMemo(() => {
    const items: { id: string; name: string; detail: string; kind: 'fitting' | 'paid' }[] = [];
    for (const a of appointments) {
      if ((a.date || '').slice(0, 10) !== today || a.status === 'Cancelled') continue;
      items.push({ id: `a-${a.id}`, name: a.customer, detail: `${a.type || 'Appointment'} at ${a.time || '—'}`, kind: 'fitting' });
      if (items.length >= 3) break;
    }
    if (items.length < 3) {
      const open = invoices.filter((i) => i.amountCents - i.paidCents > 0).sort((a, b) => (b.amountCents - b.paidCents) - (a.amountCents - a.paidCents));
      for (const i of open) {
        items.push({ id: `i-${i.id}`, name: i.customer, detail: `${formatCents(i.amountCents - i.paidCents)} balance open`, kind: 'paid' });
        if (items.length >= 3) break;
      }
    }
    return items;
  }, [appointments, invoices, today]);

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] animate-in fade-in duration-300 pb-20">

      <div className="px-4 pt-4 space-y-3">
        <div data-tour-id="mobile-kpi-revenue" className="bg-stone-900 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">Collected Today ({currentLocation?.short || 'All Stores'})</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-black tracking-tight">{formatCents(stats.paidToday)}</h2>
            <Badge className="bg-white/10 text-stone-200 border-none mb-1">{formatCents(stats.paidMonth)} this month</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Outstanding</span>
            <div>
              <p className="text-xl font-bold text-stone-900">{formatCents(stats.outstanding)}</p>
              <p className="text-[10px] text-stone-400 font-semibold mt-0.5">{stats.openCount} open invoice{stats.openCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Appointments</span>
            <div>
              <p className="text-xl font-bold text-stone-900">{stats.apptsToday}</p>
              <p className="text-[10px] text-stone-400 font-semibold mt-0.5">today · {stats.upcoming} upcoming</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Active Brides</span>
            <div>
              <p className="text-xl font-bold text-stone-900">{stats.activeBrides.toLocaleString()}</p>
              <p className="text-[10px] text-stone-400 font-semibold mt-0.5">{brides.length.toLocaleString()} in CRM</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Avg Ticket</span>
            <div>
              <p className="text-xl font-bold text-stone-900">{stats.avgTicket ? formatCents(stats.avgTicket) : '—'}</p>
              <p className="text-[10px] text-stone-400 font-semibold mt-0.5">per paid invoice</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-stone-400" /> Boutique</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold text-stone-900">{currentLocation ? `${currentLocation.business} — ${currentLocation.city}` : 'All locations'}</p>
              <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px]">{currentLocation ? 'Active Store' : 'Organization view'}</Badge>
            </div>
            {currentLocation?.address && <p className="text-xs text-stone-500">{currentLocation.address}</p>}
            <button
              onClick={() => onNavigate('settings')}
              className="mt-3 w-full bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold py-2 rounded-lg transition-colors border border-stone-200"
            >
              Manage Store Settings
            </button>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><Shirt className="h-4 w-4 text-stone-400" /> Top Designers (MTD)</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            {topDesigners.length === 0 ? (
              <p className="p-4 text-xs text-stone-400">No gown sales linked to inventory this month yet.</p>
            ) : topDesigners.map((d) => (
              <div key={d.name} className="p-3 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-900 text-sm">{d.name}</p>
                  <p className="text-[10px] text-stone-500">{d.units} unit{d.units === 1 ? '' : 's'} sold</p>
                </div>
                <p className="font-bold text-stone-900 text-sm">{formatCents(d.revenue)}</p>
              </div>
            ))}
            <div className="p-3 flex justify-between items-center bg-stone-50">
              <button
                onClick={() => onNavigate('designers')}
                className="text-xs font-bold text-stone-600 flex items-center gap-1"
              >
                View designers <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        <section data-tour-id="mobile-quick-actions">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-500" /> Today's Activity</h3>
          </div>
          <div className="space-y-2">
            {vipActivity.length === 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center gap-3 text-xs text-stone-400">
                <Users className="h-4 w-4" /> No appointments today and no open balances.
              </div>
            )}
            {vipActivity.map((vip) => (
              <div
                key={vip.id}
                onClick={() => onNavigate(vip.kind === 'fitting' ? 'appointments' : 'invoices')}
                className="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex justify-between items-center cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${vip.kind === 'fitting' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {vip.kind === 'fitting' ? <Crown className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{vip.name}</p>
                    <p className="text-[10px] text-stone-500">{vip.detail}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
