import { useMemo, useState } from 'react';
import { Search, ChevronRight, Users } from 'lucide-react';
import { BeautifulEmptyState } from '@/components/vowos/ui';

export interface RosterColumn<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface RosterTabProps<T> {
  title: string;
  description: string;
  data: T[];
  filter?: (item: T) => boolean;
  sort?: (a: T, b: T) => number;
  columns: RosterColumn<T>[];
  emptyLabel?: string;
  onRowClick?: (item: T) => void;
  primaryKey: (item: T) => string;
  searchPredicate?: (item: T, term: string) => boolean;
}

export default function RosterTab<T>({
  title,
  description,
  data,
  filter,
  sort,
  columns,
  emptyLabel = "No items found",
  onRowClick,
  primaryKey,
  searchPredicate,
}: RosterTabProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    let result = filter ? data.filter(filter) : data;
    if (searchTerm && searchPredicate) {
      const q = searchTerm.toLowerCase();
      result = result.filter(item => searchPredicate(item, q));
    }
    if (sort) {
      result.sort(sort);
    }
    return result;
  }, [data, filter, sort, searchTerm, searchPredicate]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-serif">{title}</h2>
          <p className="text-stone-500 text-sm">{description}</p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            {filteredItems.length} records
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-12">
            <BeautifulEmptyState
              icon={<Users className="h-8 w-8" />}
              title={emptyLabel}
              description="There are no records matching your criteria."
              colorHint="stone"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white text-stone-500 font-medium">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`px-5 py-3 ${col.className || ''}`}>{col.header}</th>
                  ))}
                  {onRowClick && <th className="px-5 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.map(item => (
                  <tr 
                    key={primaryKey(item)} 
                    className={`hover:bg-stone-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col, idx) => (
                      <td key={idx} className={`px-5 py-4 ${col.className || ''}`}>
                        {col.render(item)}
                      </td>
                    ))}
                    {onRowClick && (
                      <td className="px-5 py-4 text-right">
                        <button className="p-1.5 text-stone-400 hover:text-brand-primary hover:bg-brand-soft rounded-md transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
