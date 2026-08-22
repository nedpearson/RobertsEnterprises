import { ReactNode } from 'react';

export interface SettingsFieldProps {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}

export function SettingsField({ label, description, error, children, id, className }: SettingsFieldProps) {
  return (
    <div className={`space-y-1 ${className || ''}`.trim()}>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wider text-stone-500">
        {label}
      </label>
      {children}
      {description && <p className="text-[11px] text-stone-400">{description}</p>}
      {error && <p className="text-xs text-brand-primary">{error}</p>}
    </div>
  );
}
