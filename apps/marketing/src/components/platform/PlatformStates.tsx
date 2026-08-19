import { FlaskConical, AlertTriangle, Inbox } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { isPlatformDemoPlane, setPlatformDemoPlane } from '@/lib/platform/platformDataSource';
import { usePlatformDemoPlane } from '@/lib/platform/usePlatformData';

/**
 * Rendered on every Platform surface while the demo plane is on. A Platform
 * Owner must never be able to mistake synthetic fleet data for production.
 */
export function PlatformDemoBanner() {
  const on = usePlatformDemoPlane();
  if (!on) return null;
  return (
    <div
      role="status"
      data-testid="platform-demo-banner"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"
    >
      <span className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4" />
        PLATFORM DEMO PLANE — synthetic organizations. Not real customers, revenue, or health.
      </span>
      <button
        type="button"
        onClick={() => setPlatformDemoPlane(false)}
        className="rounded bg-amber-900 px-2 py-0.5 text-[11px] font-bold text-amber-50 hover:bg-amber-800"
      >
        Switch to live data
      </button>
    </div>
  );
}

/** Toggle for the Platform header. */
export function PlatformDemoToggle() {
  const on = usePlatformDemoPlane();
  return (
    <button
      type="button"
      data-testid="platform-demo-toggle"
      onClick={() => setPlatformDemoPlane(!isPlatformDemoPlane())}
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
        on
          ? 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
          : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
      }`}
    >
      {on ? 'Demo plane: ON' : 'Demo plane: OFF'}
    </button>
  );
}

/**
 * One component for the three non-data states, so a failed load can never again
 * render as an empty table that reads like good news.
 */
export function PlatformTableState({
  colSpan, error, empty, emptyHint, action,
}: {
  colSpan: number;
  error?: string | null;
  empty: string;
  emptyHint?: string;
  action?: React.ReactNode;
}) {
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-10 text-center">
          <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
          <p className="text-sm font-medium text-stone-800">Could not load this view</p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-stone-500">{error}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setPlatformDemoPlane(true)}
              className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              Turn on demo plane
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <Inbox className="mx-auto mb-2 h-7 w-7 text-stone-300" />
        <p className="text-sm font-medium text-stone-700">{empty}</p>
        {emptyHint && <p className="mt-1 text-xs text-stone-500">{emptyHint}</p>}
        {action && <div className="mt-3">{action}</div>}
      </TableCell>
    </TableRow>
  );
}
