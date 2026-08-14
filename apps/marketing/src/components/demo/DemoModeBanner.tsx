import React from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { RotateCcw, X, Sparkles } from 'lucide-react';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, activePersona, activeStore, exitDemoMode, resetDemoSession } = useDemo();

  if (!isDemoMode) return null;

  const handleExit = () => {
    exitDemoMode();
    window.location.assign('/demo');
  };

  return (
    <div className="bg-status-warning text-stone-950 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs font-semibold shadow-inner border-b border-amber-600 transition-all">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 bg-amber-900 text-amber-100 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold">
          <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" /> LIVE DEMO
        </span>
        <span className="hidden sm:inline">SYNTHETIC DATA — NO REAL TRANSACTIONS</span>
        <span className="text-amber-900/70 font-normal">| Store: {activeStore.name} ({activePersona.name} · {activePersona.role})</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={resetDemoSession}
          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded transition-colors text-[11px]"
          title="Reset current demo session"
        >
          <RotateCcw className="h-3 w-3" /> Reset Session
        </button>
        <button
          onClick={handleExit}
          className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 text-amber-100 px-2 py-0.5 rounded transition-colors text-[11px]"
        >
          <X className="h-3 w-3" /> Exit Demo
        </button>
      </div>
    </div>
  );
};
