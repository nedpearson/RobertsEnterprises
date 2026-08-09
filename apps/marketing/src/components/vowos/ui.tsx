import { ReactNode } from 'react';
import { X } from 'lucide-react';

const BADGE_COLORS: Record<string, string> = {
  // universal statuses
  'In Stock': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Low Stock': 'bg-amber-50 text-amber-700 ring-amber-200',
  'On Order': 'bg-sky-50 text-sky-700 ring-sky-200',
  Active: 'bg-sky-50 text-sky-700 ring-sky-200',
  Purchased: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Alterations: 'bg-violet-50 text-violet-700 ring-violet-200',
  'Picked Up': 'bg-stone-100 text-stone-600 ring-stone-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  Open: 'bg-sky-50 text-sky-700 ring-sky-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Completed: 'bg-stone-100 text-stone-600 ring-stone-200',
  Ordered: 'bg-sky-50 text-sky-700 ring-sky-200',
  'In Transit': 'bg-violet-50 text-violet-700 ring-violet-200',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Delayed: 'bg-rose-50 text-rose-700 ring-rose-200',
  New: 'bg-sky-50 text-sky-700 ring-sky-200',
  Contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Appointment Set': 'bg-violet-50 text-violet-700 ring-violet-200',
  Won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  'Did Not Buy': 'bg-orange-50 text-orange-700 ring-orange-200',
  Received: 'bg-emerald-50 text-emerald-700 ring-emerald-200',

};

export function StatusBadge({ status }: { status: string }) {
  const colors = BADGE_COLORS[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colors}`}>
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'rose',
  onClick,
  dataTourId,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent?: 'rose' | 'emerald' | 'violet' | 'amber';
  onClick?: () => void;
  dataTourId?: string;
}) {
  const accents = {
    rose: 'bg-rose-50 text-rose-500',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div
      data-tour-id={dataTourId}
      onClick={onClick}
      className={`rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-rose-300 hover:ring-2 hover:ring-rose-100/50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
            {onClick && <span className="text-[10px] text-rose-500 font-semibold">(Drill Down)</span>}
          </div>
          <p className="mt-2 font-serif text-3xl text-stone-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${accents[accent]}`}>{icon}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-stone-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  'w-full min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-colors';

export const btnPrimary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50';

export const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-200 disabled:opacity-50';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/80 px-6 py-12 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 mb-3">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-stone-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 w-full rounded-2xl bg-stone-200/60" />
      ))}
    </div>
  );
}

export function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-rose-700">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

