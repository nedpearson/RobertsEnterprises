import React from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { RefreshCw } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const { updateAvailable, updateApp } = usePwaInstall();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 bg-stone-900 text-white rounded-xl shadow-lg p-4 z-50 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="bg-status-info/20 p-2 rounded-lg shrink-0">
          <RefreshCw className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">A New Version of Roberts Mobile Is Ready</p>
          <p className="text-xs text-stone-400 mt-1">Update now to receive the latest improvements. Ensure your work is saved.</p>
          <div className="flex items-center gap-3 mt-3">
            <button 
              onClick={updateApp}
              className="text-xs font-semibold bg-white text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-200 transition-colors"
            >
              Update Now
            </button>
            {/* The prompt will stay visible, the user can just ignore it for "Later", or we could add local state to dismiss it temporarily */}
          </div>
        </div>
      </div>
    </div>
  );
};
