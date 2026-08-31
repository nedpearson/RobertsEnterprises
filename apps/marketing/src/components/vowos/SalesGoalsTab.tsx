import { useEffect, useMemo, useState } from 'react';
import { Target, Loader2, Pencil, Check, X, TrendingUp, Trophy } from 'lucide-react';
import { LOCATIONS, LocationId, formatCents, monthKey, monthLabel } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessId } from '@/lib/growth/useGrowth';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { inputCls } from './ui';

interface GoalRow {
  location: string;
  month: string;
  goalCents: number;
}

/** Build a list of the last month, this month, and next month for the picker. */
function monthOptions(): string[] {
  const now = new Date();
  return [-1, 0, 1].map((offset) => monthKey(new Date(now.getFullYear(), now.getMonth() + offset, 15)));
}

export default function SalesGoalsTab() {
  const { allInvoices } = useVowosData();
  const { profile } = useAuth();
  const canEdit = profile?.role === 'Owner' || profile?.role === 'Manager';

  const [month, setMonth] = useState(monthKey());
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LocationId | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // No invented numbers. A store with no saved goal shows "not set"; a store
  // with no collected revenue shows $0. The previous defaults ($45,000 goals,
  // $38,450 "collected") rendered as real figures on every tenant.
  const businessId = useBusinessId();

  const loadGoals = async () => {
    setLoading(true);
    try {
      let q = supabase.from('sales_goals').select('*').eq('month', month);
      if (businessId) q = q.eq('business_id', businessId);
      const { data } = await q;
      setGoals((data ?? []).map((r: any) => ({
        location: r.location,
        month: r.month,
        goalCents: typeof r.goal_cents === 'number' && !isNaN(r.goal_cents) && r.goal_cents < 1000000000 ? r.goal_cents : 0,
      })));
    } catch {
      setGoals(LOCATIONS.map((loc) => ({
        location: loc.id,
        month,
        goalCents: 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGoals();
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Collected revenue per store for the selected month. */
  const collectedByStore = useMemo(() => {
    const map: Record<string, number> = {};
    for (const loc of LOCATIONS) {
      const real = allInvoices
        .filter((i) => i.location === loc.id && i.dueDate.startsWith(month))
        .reduce((s, i) => s + i.paidCents, 0);
      map[loc.id] = real;
    }
    return map;
  }, [allInvoices, month]);

  const goalFor = (id: string) => {
    const found = goals.find((g) => g.location === id)?.goalCents;
    if (typeof found === 'number' && !isNaN(found) && found > 0 && found < 1000000000) {
      return found;
    }
    return 0;
  };

  const totalGoal = LOCATIONS.reduce((s, l) => s + goalFor(l.id), 0);
  const totalCollected = LOCATIONS.reduce((s, l) => s + (collectedByStore[l.id] ?? 0), 0);

  // Month pacing: how far through the month are we (only meaningful for the current month)
  const now = new Date();
  const isCurrentMonth = month === monthKey();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pace = isCurrentMonth ? now.getDate() / daysInMonth : 1;

  const topStore = LOCATIONS.reduce(
    (best, l) => {
      const pct = goalFor(l.id) > 0 ? (collectedByStore[l.id] ?? 0) / goalFor(l.id) : 0;
      return pct > best.pct ? { id: l.id, pct } : best;
    },
    { id: '' as string, pct: -1 },
  );

  const startEdit = (id: LocationId) => {
    setEditing(id);
    setEditValue((goalFor(id) / 100).toString());
  };

  const saveGoal = async () => {
    if (!editing) return;
    const cents = Math.max(0, Math.round(parseFloat(editValue || '0') * 100));
    setSaving(true);
    const { error } = await supabase
      .from('sales_goals')
      .upsert({ business_id: businessId, location: editing, month, goal_cents: cents, updated_at: new Date().toISOString() }, { onConflict: 'location,month' });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save goal', description: error.message, variant: 'destructive' });
      return;
    }
    setGoals((prev) => {
      const exists = prev.some((g) => g.location === editing);
      return exists
        ? prev.map((g) => (g.location === editing ? { ...g, goalCents: cents } : g))
        : [...prev, { location: editing, month, goalCents: cents }];
    });
    toast({ title: 'Goal updated', description: `${monthLabel(month)} target set to ${formatCents(cents)}.` });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      {/* Month picker + company rollup */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {monthOptions().map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                month === m ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
              }`}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
        {!canEdit && (
          <p className="text-[11px] text-stone-400">Goals can be adjusted by Owners and Managers.</p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
              <Target className="h-4 w-4 text-brand-primary" /> Company goal · {monthLabel(month)}
            </p>
            <p className="mt-2 font-serif text-3xl text-stone-900">
              {formatCents(totalCollected)} <span className="text-lg text-stone-400">of {formatCents(totalGoal)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-stone-900">
              {totalGoal > 0 ? Math.round((totalCollected / totalGoal) * 100) : 0}%
            </p>
            <p className="text-[11px] text-stone-400">
              {isCurrentMonth ? `${Math.round(pace * 100)}% of the month elapsed` : 'month complete'}
            </p>
          </div>
        </div>
        <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
            style={{ width: `${totalGoal > 0 ? Math.min(100, Math.round((totalCollected / totalGoal) * 100)) : 0}%` }}
          />
          {isCurrentMonth && (
            <div className="absolute inset-y-0 w-0.5 bg-stone-500/70" style={{ left: `${Math.round(pace * 100)}%` }} title="Month pace" />
          )}
        </div>
        {isCurrentMonth && totalGoal > 0 && (
          <p className="mt-2 text-[11px] text-stone-400">
            {totalCollected / totalGoal >= pace
              ? 'Ahead of pace — keep it up.'
              : `Behind pace — ${formatCents(Math.max(0, Math.round(totalGoal * pace) - totalCollected))} to catch up to today's target.`}
          </p>
        )}
      </div>

      {/* Per-store goal cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LOCATIONS.map((loc) => {
          const goal = goalFor(loc.id);
          const collected = collectedByStore[loc.id] ?? 0;
          const pct = goal > 0 ? collected / goal : 0;
          const onPace = pct >= pace;
          return (
            <div key={loc.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest ${loc.accent === 'rose' ? 'text-brand-primary' : 'text-violet-500'}`}>
                    {loc.business}
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-stone-900">{loc.city}</h3>
                </div>
                {topStore.id === loc.id && topStore.pct > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-warning/10 px-2 py-0.5 text-[10px] font-semibold text-status-warning ring-1 ring-inset ring-amber-200">
                    <Trophy className="h-3 w-3" /> Leading
                  </span>
                )}
              </div>

              <p className="mt-3 font-serif text-2xl text-stone-900">{formatCents(collected)}</p>

              {loading ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading goal…
                </div>
              ) : editing === loc.id ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className={`${inputCls} py-1.5 pl-6 text-xs`}
                      autoFocus
                    />
                  </div>
                  <button onClick={saveGoal} disabled={saving} className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-60" title="Save goal">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50" title="Cancel">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                  goal {goal > 0 ? formatCents(goal) : 'not set'}
                  {canEdit && (
                    <button
                      onClick={() => startEdit(loc.id)}
                      className="rounded p-0.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                      title="Edit goal"
                      aria-label={`Edit goal for ${loc.short}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </p>
              )}

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${pct >= 1 ? 'bg-status-success' : onPace ? (loc.accent === 'rose' ? 'bg-brand-primary' : 'bg-violet-400') : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, Math.round(pct * 100))}%` }}
                />
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px]">
                <TrendingUp className={`h-3 w-3 ${pct >= 1 ? 'text-status-success' : onPace ? 'text-stone-500' : 'text-status-warning'}`} />
                <span className={pct >= 1 ? 'font-semibold text-emerald-700' : onPace ? 'text-stone-500' : 'font-medium text-status-warning'}>
                  {goal > 0
                    ? pct >= 1
                      ? 'Goal reached!'
                      : `${Math.round(pct * 100)}% of goal${isCurrentMonth ? (onPace ? ' · on pace' : ' · behind pace') : ''}`
                    : 'Set a goal to track this store'}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-stone-400">
        Collected revenue counts payments recorded on invoices due in {monthLabel(month)}, across all four
        boutiques. Goals are shared with every Owner and Manager.
      </p>
    </div>
  );
}
