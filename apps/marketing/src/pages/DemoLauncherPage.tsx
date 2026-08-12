import React, { useState, useEffect } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { Sparkles, Play, Eye, Compass, Target } from 'lucide-react';
import { TrainingMode } from '@/lib/demo/tourEngine';
import { useNavigate } from 'react-router-dom';

export default function DemoLauncherPage() {
  const { stores, personas, scenarios, activePersona, activeStore, switchPersona, switchStore, startScenario } = useDemo();
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id || '');
  const [mode, setMode] = useState<TrainingMode>('watch');
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') === 'true') {
      const mobileScenario = scenarios.find(s => s.id === 'scenario-41-mobile-briefing');
      if (mobileScenario) {
        startScenario(mobileScenario.id, 'watch', (r) => navigate('/' + r));
      }
    }
  }, [scenarios, startScenario, navigate]);

  // If we already have a scenario running or we want to start immediately, we could,
  // but the user asked for "options on what demos they want to see"

  const handleLaunch = () => {
    startScenario(selectedScenarioId, mode, (r) => navigate('/' + r));
    // Since startScenario sets the tour up, we just need to navigate to the dashboard
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] p-8 border border-stone-200">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl tracking-tight text-stone-900 mb-2">VowOS Interactive Demo</h1>
          <p className="text-stone-500">Experience the operating system for modern bridal boutiques in an interactive, guided environment.</p>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl bg-status-warning/10 p-5 border border-status-warning/20 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-base mb-2">
              <Sparkles className="h-5 w-5 text-status-warning" /> Interactive Voice-Guided System
            </div>
            <p>
              Experience VowOS in an isolated synthetic environment with AI voice narration, animated cursor guidance, and real screen navigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium text-stone-700 mb-2">Select Demo Store Location</label>
              <select
                value={activeStore.id}
                onChange={(e) => switchStore(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-800 focus:ring-2 focus:ring-brand-primary/20"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-2">Select Persona Role</label>
              <select
                value={activePersona.id}
                onChange={(e) => switchPersona(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-800 focus:ring-2 focus:ring-brand-primary/20"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role} · {p.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-3">Select Training Experience Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setMode('watch')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === 'watch' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm ring-1 ring-brand-primary' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-stone-900 mb-1">
                  <Eye className="h-5 w-5 text-brand-primary" /> Watch Demo
                </div>
                <p className="text-xs text-stone-500">Automated presentation with narration & animated cursor.</p>
              </button>

              <button
                onClick={() => setMode('guide')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === 'guide' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm ring-1 ring-brand-primary' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-stone-900 mb-1">
                  <Compass className="h-5 w-5 text-brand-primary" /> Guide Me
                </div>
                <p className="text-xs text-stone-500">Guided tour highlighting controls for you to click.</p>
              </button>

              <button
                onClick={() => setMode('practice')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === 'practice' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm ring-1 ring-brand-primary' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-stone-900 mb-1">
                  <Target className="h-5 w-5 text-brand-primary" /> Practice Alone
                </div>
                <p className="text-xs text-stone-500">Hands-on tasks with business outcome validation.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-2">Select Scenario ({scenarios.length} Available)</label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedScenarioId === sc.id
                      ? 'border-brand-primary bg-brand-soft/60 font-medium text-stone-900 ring-1 ring-brand-primary'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{sc.name}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-semibold">{sc.difficulty}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-500">{sc.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
            <button onClick={() => window.location.href = '/'} className={btnSecondary + " px-6 py-3"}>
              Return to Website
            </button>
            <button onClick={handleLaunch} className={btnPrimary + " px-6 py-3"}>
              <Play className="h-5 w-5 fill-white" /> Start Interactive Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
