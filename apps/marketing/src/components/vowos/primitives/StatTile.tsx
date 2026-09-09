import React from 'react';
import { Sparkline } from './Sparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface StatTileProps {
  label: string;
  value?: React.ReactNode;
  sub?: string;
  sparklineData?: number[];
  onClick?: () => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  /** DESIGN_LOCK landmark id — asserted by the design guard in all three states. */
  tourId?: string;
}

/**
 * Single KPI tile: label, live value, optional 7-day sparkline, drill-down on click.
 * Implements all three states: loading (skeleton), error (inline retry), live.
 */
export function StatTile({
  label,
  value,
  sub,
  sparklineData,
  onClick,
  loading,
  error,
  onRetry,
  className,
  tourId,
}: StatTileProps) {
  if (loading) {
    return (
      <div data-tour-id={tourId} className={`bg-white rounded-[12px] p-4 shadow-[var(--vowos-shadow-card)] border border-vowos-hairline ${className ?? ''}`}>
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-2 w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-tour-id={tourId} className={`bg-white rounded-[12px] p-4 shadow-[var(--vowos-shadow-card)] border border-vowos-hairline flex flex-col items-start gap-2 ${className ?? ''}`}>
        <AlertCircle className="h-4 w-4 text-vowos-rose" aria-hidden="true" />
        <p className="text-xs text-vowos-rose">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-vowos-champagne flex items-center gap-1 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vowos-champagne rounded"
            aria-label="Retry loading data"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      data-tour-id={tourId}
      onClick={onClick}
      disabled={!onClick}
      className={[
        'bg-white rounded-[12px] p-4 shadow-[var(--vowos-shadow-card)] border border-vowos-hairline text-left w-full',
        'transition-shadow duration-150',
        onClick ? 'hover:shadow-[var(--vowos-shadow-elevated)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vowos-champagne' : 'cursor-default',
        className ?? '',
      ].join(' ')}
      aria-label={onClick ? `${label}: ${value}. Click to view details.` : undefined}
    >
      <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tabular-nums leading-none text-vowos-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value ?? '—'}
        </p>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} height={28} width={64} />
        )}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-2 leading-tight">{sub}</p>}
    </button>
  );
}
