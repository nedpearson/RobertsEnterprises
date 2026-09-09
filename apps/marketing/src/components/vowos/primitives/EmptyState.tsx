import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Illustrated empty state: icon headline, optional description, optional CTA.
 * All three layout states (loading, error, empty) live here — callers pick what to render.
 */
export function EmptyState({ icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className ?? ''}`}>
      {icon && (
        <div className="mb-4 text-vowos-hairline" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-xl font-semibold text-vowos-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {cta && (
        <Button
          variant="outline"
          className="mt-6 border-vowos-hairline text-vowos-ink hover:bg-vowos-ivory"
          onClick={cta.onClick}
        >
          {cta.label}
        </Button>
      )}
    </div>
  );
}
