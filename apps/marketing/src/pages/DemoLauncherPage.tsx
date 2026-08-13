import React, { useState, useEffect } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { Sparkles, Play, Eye, Compass, Target, ChevronRight } from 'lucide-react';
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

  const handleLaunch = () => {
    startScenario(selectedScenarioId, mode, (r) => navigate('/' + r));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Cinematic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 sm:p-10 border border-slate-800/60 relative z-10">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-secondary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" /> Interactive Experience
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-white mb-3">VowOS Demo Environment</h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Step into a fully functional, synthetic workspace. Experience real operations, voice-guided tours, and interactive workflows.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-slate-300 mb-2">Simulated Location</label>
                <div className="relative">
                  <select
                    value={activeStore.id}
                    onChange={(e) => switchStore(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/80 text-white p-3.5 pr-10 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 outline-none transition-all"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight className="h-5 w-5 rotate-90" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-2">Active Persona</label>
                <div className="relative">
                  <select
                    value={activePersona.id}
                    onChange={(e) => switchPersona(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/80 text-white p-3.5 pr-10 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 outline-none transition-all"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight className="h-5 w-5 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-3">Training Mode</label>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'watch', icon: Eye, title: 'Watch Demo', desc: 'Narrated, automated visual tour.' },
                  { id: 'guide', icon: Compass, title: 'Guide Me', desc: 'Interactive step-by-step guidance.' },
                  { id: 'practice', icon: Target, title: 'Practice Alone', desc: 'Hands-on validation without hints.' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as TrainingMode)}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                      mode === m.id 
                        ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(213,81,98,0.15)] ring-1 ring-brand-primary' 
                        : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
                    }`}
                  >
                    <div className={`mt-0.5 rounded-lg p-2 ${mode === m.id ? 'bg-brand-primary text-white' : 'bg-slate-700 text-slate-300'}`}>
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={`font-bold mb-0.5 ${mode === m.id ? 'text-white' : 'text-slate-200'}`}>{m.title}</div>
                      <div className="text-sm text-slate-400">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scenarios */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <label className="block font-medium text-slate-300 mb-3">Select Scenario</label>
            <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    selectedScenarioId === sc.id
                      ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary relative overflow-hidden'
                      : 'border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600 bg-slate-800/30'
                  }`}
                >
                  {selectedScenarioId === sc.id && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-bold mb-1 ${selectedScenarioId === sc.id ? 'text-white' : 'text-slate-200'}`}>
                        {sc.name}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{sc.description}</p>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-700/50 border border-slate-600 text-slate-300 font-semibold">
                      {sc.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-8 border-t border-slate-800/60">
          <button 
            onClick={() => window.location.href = '/'} 
            className="text-slate-400 hover:text-white transition-colors font-medium text-sm"
          >
            ← Return to Website
          </button>
          
          <button 
            onClick={handleLaunch} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <Play className="h-5 w-5 fill-white" /> Launch Experience
          </button>
        </div>
      </div>
    </div>
  );
}
