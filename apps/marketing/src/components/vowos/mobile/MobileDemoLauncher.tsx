import React, { useState } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { useNavigate } from 'react-router-dom';
import { X, Play, Smartphone, Star } from 'lucide-react';
import { MOBILE_DEMO_SCENARIOS } from '@/lib/demo/scenariosLibrary';
import { btnPrimary } from '@/components/vowos/ui';

export default function MobileDemoLauncher() {
  const { startScenario } = useDemo();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState(MOBILE_DEMO_SCENARIOS[0]?.id || '');

  if (!isOpen) return null;

  const handleStart = () => {
    startScenario(selectedScenarioId, 'watch', (r) => navigate('/' + r));
    navigate('/');
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Bottom Sheet */}
      <div className="relative w-full rounded-t-3xl bg-[#1c1a1f] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-6 shrink-0" />
        
        <div className="flex items-start justify-between mb-6 shrink-0">
          <div>
            <h2 className="font-serif text-2xl text-white mb-1 flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-brand-primary" />
              Mobile Tour
            </h2>
            <p className="text-stone-400 text-sm">Experience VowOS optimized for mobile.</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full bg-white/10 text-stone-300 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mb-6 custom-scrollbar pr-2">
          {MOBILE_DEMO_SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedScenarioId === sc.id
                  ? 'bg-brand-primary/20 border-brand-primary/50 text-white'
                  : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">{sc.name}</span>
                {selectedScenarioId === sc.id && <Star className="h-4 w-4 text-brand-primary fill-brand-primary" />}
              </div>
              <p className={`text-xs ${selectedScenarioId === sc.id ? 'text-stone-200' : 'text-stone-400'}`}>
                {sc.description}
              </p>
            </div>
          ))}
        </div>

        <div className="shrink-0 pt-2">
          <button onClick={handleStart} className={`w-full py-4 text-lg ${btnPrimary} shadow-lg shadow-brand-primary/20`}>
            <Play className="h-5 w-5 fill-white mr-2" /> Start Mobile Tour
          </button>
        </div>
      </div>
    </div>
  );
}
