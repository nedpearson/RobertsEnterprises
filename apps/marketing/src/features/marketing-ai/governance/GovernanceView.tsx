import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Power, Sliders, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

export default function GovernanceView() {
  const [mode, setMode] = useState<number>(2); // Default Mode 2: Prepare for Approval
  const [globalKill, setGlobalKill] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(true);

  const handleModeChange = (newMode: number) => {
    setMode(newMode);
    toast({ title: 'Governance Mode Updated', description: `Switched to Mode ${newMode}` });
  };

  const handleToggleKillSwitch = () => {
    const next = !globalKill;
    setGlobalKill(next);
    toast({
      title: next ? '🚨 EMERGENCY KILL SWITCH ACTIVATED' : 'AUTONOMOUS MARKETING RESTORED',
      description: next ? 'All AI execution and ad spending locked.' : 'Normal operation restored.',
      variant: next ? 'destructive' : 'default'
    });
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-vowos-violet" />
            AI Governance &amp; Emergency Kill Switches
          </h2>
          <p className="text-xs text-stone-500">Configure execution autonomy levels, spending limits &amp; emergency stops.</p>
        </div>
      </div>

      {/* Global Emergency Kill Switch Card */}
      <div className={`rounded-2xl border-2 p-6 transition-all ${globalKill ? 'bg-red-50 border-red-500 text-red-950' : 'bg-white border-stone-200 shadow-xs'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className={`h-8 w-8 ${globalKill ? 'text-red-600 animate-pulse' : 'text-stone-400'}`} />
            <div>
              <h3 className="font-bold text-base">{globalKill ? 'EMERGENCY KILL SWITCH ACTIVE' : 'Global Autonomous Kill Switch'}</h3>
              <p className="text-xs opacity-80 mt-0.5">
                {globalKill ? 'All AI recommendations, execution & paid ad changes are frozen.' : 'System is operating normally within configured mode limits.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleKillSwitch}
            className={`rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-md transition-all ${
              globalKill ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {globalKill ? 'Deactivate Kill Switch' : 'HALT ALL AI SPENDING'}
          </button>
        </div>
      </div>

      {/* Governance Modes Selection */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          <Sliders className="h-4 w-4 text-vowos-violet" /> Execution Autonomy Mode
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { level: 0, label: 'Mode 0 — Disabled', desc: 'No AI recommendations or background tasks allowed.' },
            { level: 1, label: 'Mode 1 — Advisory', desc: 'AI provides analysis and reports only. No draft creation.' },
            { level: 2, label: 'Mode 2 — Prepare for Approval', desc: 'AI creates campaigns and scenarios, but human MUST approve before publishing.' },
            { level: 3, label: 'Mode 3 — Restricted Autonomy', desc: 'AI can execute pre-approved rules under $500 cap automatically.' }
          ].map((m) => (
            <div
              key={m.level}
              onClick={() => handleModeChange(m.level)}
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                mode === m.level
                  ? 'border-purple-600 bg-vowos-violet/10/50 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-900">{m.label}</span>
                {mode === m.level && <CheckCircle2 className="h-4 w-4 text-vowos-violet" />}
              </div>
              <p className="text-xs text-stone-600 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Isolated AI Demo Mode Toggle */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-900 text-sm">Isolated Demo Mode</h3>
          <p className="text-xs text-stone-500 mt-0.5">Allows testing full AI scenarios safely without spending real money or contacting real leads.</p>
        </div>
        <button
          onClick={() => {
            setDemoMode(!demoMode);
            toast({ title: 'Demo Mode Updated', description: demoMode ? 'Demo Mode OFF' : 'Demo Mode ON' });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            demoMode ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-stone-100 text-stone-700'
          }`}
        >
          {demoMode ? 'DEMO MODE ACTIVE' : 'DEMO MODE INACTIVE'}
        </button>
      </div>
    </div>
  );
}
