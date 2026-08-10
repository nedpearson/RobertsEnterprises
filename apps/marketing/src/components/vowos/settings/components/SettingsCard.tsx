import { ReactNode } from 'react';
import { Switch } from '@vowos/design-system';

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  enabled?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
  children?: ReactNode;
}

export function SettingsCard({
  title,
  description,
  icon,
  enabled,
  onToggleEnabled,
  children,
}: SettingsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white">
              {icon}
            </div>
          )}
          <div>
            <h4 className="font-serif text-base font-medium text-stone-900">{title}</h4>
            {description && <p className="text-xs text-stone-500">{description}</p>}
          </div>
        </div>
        {onToggleEnabled !== undefined && enabled !== undefined && (
          <Switch
            checked={enabled}
            onCheckedChange={onToggleEnabled}
            className="data-[state=checked]:bg-status-success"
          />
        )}
      </div>

      {children && (
        <div className={`mt-5 space-y-4 ${enabled === false ? 'pointer-events-none opacity-50' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
