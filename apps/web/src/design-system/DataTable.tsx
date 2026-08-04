import { type ReactNode } from 'react';
import { Spinner } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyState,
  onSort,
  sortKey,
  sortDirection,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto bg-white/5 backdrop-blur-md rounded-xl border border-white/10 ${className}`}>
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="bg-black/20 text-xs uppercase text-gray-400 border-b border-white/10">
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                scope="col" 
                className={`px-6 py-4 font-medium ${col.sortable ? 'cursor-pointer hover:text-white select-none' : ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-rose-500">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <Spinner className="mx-auto" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                {emptyState || <div className="text-center text-gray-400">No data available</div>}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr 
                key={keyExtractor(item)} 
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${rowIndex === data.length - 1 ? 'border-b-0' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    {col.render ? col.render(item) : String((item as any)[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
