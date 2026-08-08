import React from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { AlertTriangle } from 'lucide-react';

export const OfflineWarning: React.FC = () => {
  const { isOffline } = usePwaInstall();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-100 text-amber-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 relative border-b border-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>You're Offline. Roberts Mobile cannot securely load new business data until your connection returns.</span>
    </div>
  );
};
