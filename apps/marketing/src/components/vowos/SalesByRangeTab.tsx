import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Download, Target, TrendingUp } from 'lucide-react';
import { LOCATIONS, formatCents, formatDate, monthKey } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { supabase } from '@/lib/supabase';
import { inputCls, StatusBadge } from './ui';

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Quick-pick presets for the date range. */
function presets(): { label: string; from: string; to: string }[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(thirtyAgo.getDate() - 29);
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const startQuarter = new Date(now.getFullYear(), qStartMonth, 1);
  const startYear = new Date(now.getFullYear(), 0, 1);
  return [
    { label: 'This month', from: isoDate(startOfMonth), to: isoDate(endOfMonth) },
    { label: 'Last month', from: isoDate(startLastMonth), to: isoDate(endLastMonth) },
    { label: 'Last 30 days', from: isoDate(thirtyAgo), to: isoDate(now) },
    { label: 'This quarter', from: isoDate(startQuarter), to: isoDate(now) },
    { label: 'Year to date', from: isoDate(startYear), to: isoDate(now) },
  ];
}

interface GoalRow {
  location: string;
  month: string;
  goalCents: number;
}

/** Sum monthly goals across the range, pro-rated by the days of each month inside it. */
function proRatedGoal(goals: GoalRow[], locationId: string, from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (end < start) return 0;
  let total = 0;
  for (const g of goals) {
    if (g.location !== locationId) continue;
    const [y, m] = g.month.split('-').map((n) => parseInt(n, 10));
    const monthStart = new Date(y, m - 1, 1, 12);
    const monthEnd = new Date(y, m, 0, 12);
    const daysInMonth = monthEnd.getDate();
    const overlapStart = start > monthStart ? start : monthStart;
    const overlapEnd = end < monthEnd ? end : monthEnd;
    if (overlapEnd < overlapStart) continue;
    const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
    total += Math.round(g.goalCents * (overlapDays / daysInMonth));
  }
  return total;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import ItemizedSalesDetailModal, { DetailedSaleItem } from '@/features/sales/components/ItemizedSalesDetailModal';
import { Shirt } from 'lucide-react';

export default function SalesByRangeTab() {
  const { allInvoices, brides } = useVowosData();
  const defaultRange = presets()[0];
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [itemizedSale, setItemizedSale] = useState<DetailedSaleItem | null>(null);

  // Load every goal for the months touched by the range
  useEffect(() => {
    if (!from || !to) return;
    const fromMonth = from.slice(0, 7);
    const toMonth = to.slice(0, 7);
    (async () => {
      const { data } = await supabase
        .from('sales_goals')
        .select('*')
        .gte('month', fromMonth)
        .lte('month', toMonth);
      setGoals((data ?? []).map((r: any) => ({ location: r.location, month: r.month, goalCents: r.goal_cents })));
    })();
  }, [from, to]);

  /** Invoices whose due date falls inside the range (payments are tracked against them). */
  const rangeInvoices = useMemo(
    () => allInvoices.filter((i) => i.dueDate >= from && i.dueDate <= to),
    [allInvoices, from, to],
  );

  const perStore = useMemo(
    () =>
      LOCATIONS.map((loc) => {
        const inv = rangeInvoices.filter((i) => i.location === loc.id);
        const collected = inv.reduce((s, i) => s + i.paidCents, 0);
        const billed = inv.reduce((s, i) => s + i.amountCents, 0);
        const goal = proRatedGoal(goals, loc.id, from, to);
        return { ...loc, invoices: inv.length, collected, billed, goal };
      }),
    [rangeInvoices, goals, from, to],
  );

  const totals = perStore.reduce(
    (acc, s) => ({
      collected: acc.collected + s.collected,
      billed: acc.billed + s.billed,
      goal: acc.goal + s.goal,
      invoices: acc.invoices + s.invoices,
    }),
    { collected: 0, billed: 0, goal: 0, invoices: 0 },
  );

  const invalidRange = !from || !to || to < from;

  const exportCsv = () => {
    downloadCsv(`sales-${from}-to-${to}.csv`, [
      ['Store', 'Invoices', 'Billed', 'Collected', 'Goal (pro-rated)', '% of Goal'],
      ...perStore.map((s) => [
        s.short,
        s.invoices,
        s.billed / 100,
        s.collected / 100,
        s.goal / 100,
        s.goal > 0 ? Math.round((s.collected / s.goal) * 100) : 0,
      ]),
      ['TOTAL', totals.invoices, totals.billed / 100, totals.collected / 100, totals.goal / 100, totals.goal > 0 ? Math.round((totals.collected / totals.goal) * 100) : 0],
      [],
      ['Invoice', 'Customer', 'Store', 'Due', 'Amount', 'Paid', 'Status'],
      ...rangeInvoices.map((i) => [
        i.id, i.customer, LOCATIONS.find((l) => l.id === i.location)?.short ?? i.location,
        i.dueDate, i.amountCents / 100, i.paidCents / 100, i.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Range picker */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="range-from" className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                From
              </label>
              <input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="range-to" className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                To
              </label>
              <input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
            >
              <Download className="h-4 w-4" /> Export range
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets().map((p) => {
              const active = p.from === from && p.to === to;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        {invalidRange && (
          <p className="mt-3 text-xs font-medium text-brand-primary">Pick a valid range — the end date must be on or after the start date.</p>
        )}
      </div>

      {!invalidRange && (
        <>
          {/* Company rollup vs goal */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                  <CalendarRange className="h-4 w-4 text-brand-primary" />
                  Sales · {formatDate(from)} – {formatDate(to)}
                </p>
                <p className="mt-2 font-serif text-3xl text-stone-900">
                  {formatCents(totals.collected)}{' '}
                  <span className="text-lg text-stone-400">
                    of {totals.goal > 0 ? formatCents(totals.goal) : 'no goal set'}
                  </span>
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {totals.invoices} invoice{totals.invoices === 1 ? '' : 's'} · {formatCents(totals.billed)} billed ·{' '}
                  {formatCents(totals.billed - totals.collected)} outstanding
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-2xl text-stone-900">
                  {totals.goal > 0 ? `${Math.round((totals.collected / totals.goal) * 100)}%` : '—'}
                </p>
                <p className="text-[11px] text-stone-400">of pro-rated goal</p>
              </div>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
                style={{ width: `${totals.goal > 0 ? Math.min(100, Math.round((totals.collected / totals.goal) * 100)) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-400">
              Goals come from Sales Goals ({monthKey()} etc.) and are pro-rated by the days of each month inside the range.
            </p>
          </div>

          {/* Per-store performance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {perStore.map((s) => {
              const pct = s.goal > 0 ? s.collected / s.goal : 0;
              return (
                <div key={s.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                  <p className={`text-[10px] font-semibold uppercase tracking-widest ${s.accent === 'rose' ? 'text-brand-primary' : 'text-violet-500'}`}>
                    {s.business}
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-stone-900">{s.city}</h3>
                  <p className="mt-3 font-serif text-2xl text-stone-900">{formatCents(s.collected)}</p>
                  <p className="flex items-center gap-1 text-xs text-stone-500">
                    <Target className="h-3 w-3 text-stone-400" />
                    goal {s.goal > 0 ? formatCents(s.goal) : 'not set'}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${pct >= 1 ? 'bg-status-success' : s.accent === 'rose' ? 'bg-brand-primary' : 'bg-violet-400'}`}
                      style={{ width: `${Math.min(100, Math.round(pct * 100))}%` }}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px]">
                    <TrendingUp className={`h-3 w-3 ${pct >= 1 ? 'text-status-success' : 'text-stone-400'}`} />
                    <span className={pct >= 1 ? 'font-semibold text-emerald-700' : 'text-stone-500'}>
                      {s.goal > 0
                        ? pct >= 1
                          ? 'Goal reached!'
                          : `${Math.round(pct * 100)}% of goal`
                        : `${s.invoices} invoice${s.invoices === 1 ? '' : 's'} in range`}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Invoice detail */}
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-stone-50/70">
                  <tr>
                    {['Invoice', 'Customer', 'Store', 'Due', 'Amount', 'Paid', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rangeInvoices.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => {
                        const bride = (brides || []).find((b: any) => b.name.toLowerCase() === i.customer.toLowerCase());
                        setItemizedSale({
                          id: `item-${i.id}`,
                          invoiceId: i.id,
                          customerName: i.customer,
                          weddingDate: bride?.weddingDate || '2026-11-14',
                          designer: i.description.includes('Monique') ? 'Monique Lhuillier' : i.description.includes('Ines') ? 'Ines Di Santo' : 'I Do Atelier',
                          gownName: i.description || 'Custom Bridal Gown',
                          styleNumber: `STYLE-${i.id}`,
                          sku: `SKU-881029384912`,
                          gownType: 'Couture Bridal Gown',
                          size: 'Bridal Size 10 (Bust 34", Waist 26", Hips 38")',
                          color: 'Ivory / French Silk Satin & Chantilly Lace',
                          fabric: 'Silk Satin & Hand-Beaded Lace',
                          condition: 'New Custom Atelier Order',
                          wholesaleCostCents: Math.round(i.amountCents * 0.4),
                          retailPriceCents: i.amountCents,
                          paidCents: i.paidCents,
                          locationId: i.location || 'ido-br',
                          stylist: bride?.stylist || 'Ramsey Roberts',
                          saleDate: i.dueDate || '2026-07-20',
                        });
                      }}
                      className="transition-colors hover:bg-brand-soft/40 cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-stone-700 font-semibold flex items-center gap-1.5">
                        {i.id} <Shirt className="h-3.5 w-3.5 text-brand-primary" />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-900">{i.customer}</td>
                      <td className="px-5 py-3.5 text-stone-700">
                        {LOCATIONS.find((l) => l.id === i.location)?.short ?? i.location}
                      </td>
                      <td className="px-5 py-3.5 text-stone-700">{formatDate(i.dueDate)}</td>
                      <td className="px-5 py-3.5 text-stone-700">{formatCents(i.amountCents)}</td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-700">{formatCents(i.paidCents)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))}
                  {rangeInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-stone-500">
                        No sales activity in this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ItemizedSalesDetailModal item={itemizedSale} onClose={() => setItemizedSale(null)} />
    </div>
  );
}
