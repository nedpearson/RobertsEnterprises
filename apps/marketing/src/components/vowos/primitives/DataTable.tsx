import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';

export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Dense data table: sticky thead, 40px rows, hairline separators,
 * tabular-nums numerals, keyboard-navigable rows.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'No records',
  emptyDescription,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`rounded-[12px] border border-vowos-hairline overflow-hidden ${className ?? ''}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 border-b border-vowos-hairline px-4 flex items-center gap-4">
            {columns.map(c => (
              <Skeleton key={c.key} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-[12px] border border-vowos-rose/30 bg-white p-6 ${className ?? ''}`}>
        <EmptyState title="Failed to load" description={error} cta={onRetry ? { label: 'Retry', onClick: onRetry } : undefined} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`rounded-[12px] border border-vowos-hairline bg-white ${className ?? ''}`}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`rounded-[12px] border border-vowos-hairline overflow-hidden bg-white ${className ?? ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead className="sticky top-0 z-10 bg-white border-b border-vowos-hairline">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`h-10 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-[0.1em] whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                className={`border-b border-vowos-hairline last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-vowos-ivory focus-visible:outline-none focus-visible:bg-vowos-ivory' : ''
                } transition-colors`}
                style={{ height: '40px' }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
