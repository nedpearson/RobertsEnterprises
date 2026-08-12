import { Fragment, ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Inbox, Book } from 'lucide-react';
import { BeautifulEmptyState } from './ui';

// ─── CSV export helper ───

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Generic drill-down ledger table ───

export interface LedgerRow {
  id: string;
  /** One cell per column. */
  cells: ReactNode[];
  /** Expandable drill-down panel content (omit for flat rows). */
  detail?: ReactNode;
}

export interface LedgerColumn {
  label: string;
  align?: 'left' | 'right';
}

export default function LedgerTable({
  columns,
  rows,
  emptyMessage = 'No entries in this ledger yet.',
}: {
  columns: LedgerColumn[];
  rows: LedgerRow[];
  emptyMessage?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const drillable = rows.some((r) => r.detail);

  if (rows.length === 0) {
    return (
      <BeautifulEmptyState
        icon={<Book className="h-8 w-8" />}
        title="Ledger Empty"
        description={emptyMessage}
        colorHint="emerald"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {drillable && <th className="w-8 px-3 py-3" aria-label="Expand" />}
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <Fragment key={row.id}>
                <tr
                  className={`transition-colors ${row.detail ? 'cursor-pointer hover:bg-[#faf6ee]' : 'hover:bg-stone-50/60'} ${open ? 'bg-[#faf6ee]' : ''}`}
                  onClick={row.detail ? () => setOpenId(open ? null : row.id) : undefined}
                >
                  {drillable && (
                    <td className="px-3 py-3 text-stone-400">
                      {row.detail &&
                        (open ? <ChevronDown className="h-4 w-4 text-[#a98a4b]" /> : <ChevronRight className="h-4 w-4" />)}
                    </td>
                  )}
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`whitespace-nowrap px-4 py-3 text-stone-700 ${columns[i]?.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
                {open && row.detail && (
                  <tr className="bg-[#fbf8f1] border-l-4 border-[#a98a4b]">
                    <td colSpan={columns.length + 1} className="px-6 py-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#a98a4b]">
                            Level 1 Drill-Down Details · Entry #{row.id}
                          </span>
                          <span className="text-[11px] text-stone-400">Click sub-nodes inside to drill deeper</span>
                        </div>
                        {row.detail}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Gold "Export CSV" action used above every ledger. */
export function ExportButton({ filename, rows }: { filename: string; rows: (string | number)[][] }) {
  return (
    <button
      onClick={() => downloadCsv(filename, rows)}
      className="inline-flex items-center gap-2 rounded-lg bg-[#a98a4b] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#96793f] focus:outline-none focus:ring-2 focus:ring-[#d9c390]"
    >
      <Download className="h-4 w-4" /> Export CSV
    </button>
  );
}

/** Compact metric tile for the performance matrix strip. */
export function MatrixTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'text-stone-900',
    good: 'text-status-success',
    warn: 'text-status-warning',
    bad: 'text-brand-primary',
  };
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-1.5 font-serif text-2xl ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-stone-500">{sub}</p>}
    </div>
  );
}

/** Small label/value pair used inside drill-down panels. */
export function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <div className="mt-0.5 text-sm text-stone-700">{value}</div>
    </div>
  );
}

/** Recursive multi-level drill-down node component for infinite nested inspection. */
export function NestedDrillDownNode({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
  level = 2,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  level?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const levelBadges: Record<number, string> = {
    2: 'bg-stone-100 text-stone-700 border-stone-200',
    3: 'bg-status-warning/10 text-amber-800 border-status-warning/20',
    4: 'bg-status-success/10 text-emerald-800 border-emerald-200',
    5: 'bg-vowos-violet/10 text-purple-800 border-purple-200',
  };

  return (
    <div className="mt-3 rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition-all">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            {open ? <ChevronDown className="h-3.5 w-3.5 text-[#a98a4b]" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${levelBadges[level] || levelBadges[5]}`}>
                L{level} Drill-Down
              </span>
              <span className="text-xs font-semibold text-stone-800 truncate">{title}</span>
              {badge}
            </div>
            {subtitle && <p className="text-[11px] text-stone-400 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a98a4b] hover:underline shrink-0 ml-2">
          {open ? 'Close' : 'Drill Deeper →'}
        </span>
      </button>
      {open && (
        <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-600 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
