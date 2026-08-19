import React from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { RotateCcw, X, Sparkles, ArrowRight, UserCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, activePersona, activeStore, exitDemoMode, resetDemoSession, enterDemoMode } = useDemo();

  if (!isDemoMode) return null;

  const handleExit = () => {
    exitDemoMode();
    window.location.assign('/demo');
  };

  return (
    <div className="bg-status-warning text-stone-950 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold shadow-inner border-b border-amber-600 transition-all">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex items-center gap-1.5 bg-amber-900 text-amber-100 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold">
          <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" /> LIVE DEMO
        </span>
        <span className="hidden md:inline">SYNTHETIC DATA — NO REAL TRANSACTIONS</span>
        <span className="hidden sm:inline truncate text-amber-900/70 font-normal">| {activeStore.name} · {activePersona.name} · {activePersona.role}</span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <a
          href="/pricing?source=demoapp"
          className="hidden sm:inline-flex items-center gap-1 rounded bg-white/70 px-2 py-0.5 text-[11px] font-bold text-stone-900 hover:bg-white"
        >
          View Plans
        </a>
        <a
          href="/signup?source=demoapp"
          className="inline-flex items-center gap-1 rounded bg-stone-950 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-stone-800"
        >
          Start Free Trial <ArrowRight className="h-3 w-3" />
        </a>
        <button
          onClick={resetDemoSession}
          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded transition-colors text-[11px]"
          title="Reset current demo session"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
        <button
          onClick={handleExit}
          className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 text-amber-100 px-2 py-0.5 rounded transition-colors text-[11px]"
        >
          <X className="h-3 w-3" /> Exit
        </button>
      </div>
    </div>
  );
};
