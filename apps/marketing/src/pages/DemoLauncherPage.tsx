import React, { useState, useEffect } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
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

  const handleLaunch = () => {
    startScenario(selectedScenarioId, mode, (r) => navigate('/' + r));
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--vowos-deep-ink, #101117)' }}>
      <div 
        className="w-full max-w-3xl rounded-3xl p-8"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-2" style={{ color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>VowOS Interactive Demo</h1>
          <p style={{ color: 'rgba(248, 245, 241, 0.65)' }}>Experience the operating system for modern bridal boutiques in an interactive, guided environment.</p>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'rgba(217, 156, 59, 0.1)', borderColor: 'rgba(217, 156, 59, 0.2)', color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>
            <div className="flex items-center gap-2 font-bold text-base mb-2" style={{ color: 'var(--vowos-champagne-gold, #D99C3B)' }}>
              <Sparkles className="h-5 w-5" /> Interactive Voice-Guided System
            </div>
            <p className="text-sm" style={{ color: 'rgba(248, 245, 241, 0.65)' }}>
              Experience VowOS in an isolated synthetic environment with AI voice narration, animated cursor guidance, and real screen navigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>Select Demo Store Location</label>
              <select
                value={activeStore.id}
                onChange={(e) => switchStore(e.target.value)}
                className="w-full rounded-xl p-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#101117',
                  color: '#F8F5F1',
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderWidth: '1px'
                }}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>Select Persona Role</label>
              <select
                value={activePersona.id}
                onChange={(e) => switchPersona(e.target.value)}
                className="w-full rounded-xl p-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#101117',
                  color: '#F8F5F1',
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderWidth: '1px'
                }}
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
            <label className="block font-medium mb-3" style={{ color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>Select Training Experience Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'watch', icon: Eye, title: 'Watch Demo', desc: 'Automated presentation with narration & animated cursor.' },
                { id: 'guide', icon: Compass, title: 'Guide Me', desc: 'Guided tour highlighting controls for you to click.' },
                { id: 'practice', icon: Target, title: 'Practice Alone', desc: 'Hands-on tasks with business outcome validation.' }
              ].map((m) => {
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as TrainingMode)}
                    className="p-4 rounded-xl text-left transition-all relative overflow-hidden"
                    style={{
                      backgroundColor: isSelected ? 'rgba(143, 90, 215, 0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: isSelected ? '#8F5AD7' : 'rgba(255,255,255,0.1)',
                      borderWidth: '1px',
                      color: '#F8F5F1'
                    }}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1 relative z-10">
                      <m.icon className="h-5 w-5" style={{ color: isSelected ? '#F8F5F1' : 'rgba(248,245,241,0.65)' }} /> 
                      {m.title}
                    </div>
                    <p className="text-xs relative z-10" style={{ color: isSelected ? 'rgba(248,245,241,0.8)' : '#746A65' }}>{m.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--vowos-warm-ivory, #F8F5F1)' }}>Select Scenario ({scenarios.length} Available)</label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {scenarios.map((sc) => {
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className="p-4 rounded-xl cursor-pointer transition-all border"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                      borderColor: isSelected ? '#8F5AD7' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm" style={{ color: '#F8F5F1' }}>{sc.name}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(248,245,241,0.65)' }}>{sc.difficulty}</span>
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: '#746A65' }}>{sc.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button 
              onClick={() => window.location.href = '/'} 
              className="px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#F8F5F1'
              }}
            >
              Return to Website
            </button>
            <button 
              onClick={handleLaunch} 
              className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-md"
              style={{
                backgroundColor: '#F06D61',
                color: '#FFFFFF',
                border: 'none'
              }}
            >
              <Play className="h-5 w-5 fill-current" /> Start Interactive Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
