import { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg font-medium text-stone-900">{title}</h3>
        {description && <p className="text-xs text-stone-500">{description}</p>}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
