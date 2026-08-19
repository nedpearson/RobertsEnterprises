import { useMemo, useState } from 'react';
import { Search, ChevronRight, Link2, Check, Users } from 'lucide-react';
import { Customer, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import Bride360View, { Bride360Tab } from '@/components/vowos/Bride360View';
import { StatusBadge, BeautifulEmptyState } from '@/components/vowos/ui';
import { portalUrl } from '@/lib/contractsAlterations';
import { toast } from '@vowos/design-system';

export interface RosterColumn {
  header: string;
  render: (c: Customer) => React.ReactNode;
  className?: string;
}

interface CustomerRosterTabProps {
  title: string;
  description: string;
  /** Narrow/annotate the bride list for this lens. */
  filter?: (c: Customer) => boolean;
  /** Sort within the lens. */
  sort?: (a: Customer, b: Customer) => number;
  /** Extra columns beyond name/wedding/status. */
  columns?: RosterColumn[];
  /** Which Bride360 sub-tab to open on drill-in. */
  openTab?: Bride360Tab;
  /** Show copy-portal-link affordance (Customer Portal lens). */
  showPortal?: boolean;
  emptyLabel?: string;
}

/**
 * A real, data-backed roster over the tenant's brides — one lens per Customers
 * sub-tab. Every row drills into the existing Bride360View at the relevant
 * section, so these tabs share the same source of truth as Customer 360 rather
 * than reinventing it. This replaces the "capabilities are loading..." stub.
 */
export default function CustomerRosterTab({
  title, description, filter, sort, columns = [], openTab, showPortal, emptyLabel,
}: CustomerRosterTabProps) {
  const { brides, loading } = useVowosData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [copiedId, setCopiedId] = useState('');

  const rows = useMemo(() => {
    let list = (brides || []).filter((c) => (filter ? filter(c) : true));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    if (sort) list = [...list].sort(sort);
    return list;
  }, [brides, filter, sort, query]);

  if (selected) {
    return <Bride360View bride={selected} initialTab={openTab || 'overview'} onBack={() => setSelected(null)} />;
  }

  const copyPortal = async (c: Customer) => {
    try {
      await navigator.clipboard.writeText(portalUrl(c));
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(''), 1500);
      toast({ title: `Portal link copied for ${c.name}` });
    } catch {
      toast({ title: 'Could not copy portal link', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-serif text-stone-900">{title}</h2>
        <p className="text-sm text-stone-500">{description}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brides..."
          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-stone-400"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">Loading…</div>
      ) : rows.length === 0 ? (
        <BeautifulEmptyState icon={<Users className="h-6 w-6" />} title={emptyLabel || 'Nothing here yet'} description="Brides matching this view will appear here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-5 py-3">Bride</th>
                <th className="px-5 py-3">Wedding</th>
                <th className="px-5 py-3">Status</th>
                {columns.map((col) => (
                  <th key={col.header} className={`px-5 py-3 ${col.className || ''}`}>{col.header}</th>
                ))}
                {showPortal && <th className="px-5 py-3">Portal</th>}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setSelected(c)}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-stone-900">{c.name}</div>
                    <div className="text-xs text-stone-400">{c.email}</div>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{c.weddingDate ? formatDate(c.weddingDate) : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  {columns.map((col) => (
                    <td key={col.header} className={`px-5 py-3 text-stone-600 ${col.className || ''}`}>{col.render(c)}</td>
                  ))}
                  {showPortal && (
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => copyPortal(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                      >
                        {copiedId === c.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
                        {copiedId === c.id ? 'Copied' : 'Copy link'}
                      </button>
                    </td>
                  )}
                  <td className="px-5 py-3 text-right text-stone-300"><ChevronRight className="ml-auto h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
