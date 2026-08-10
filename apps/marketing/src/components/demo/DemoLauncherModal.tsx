import React, { useState } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { Modal, btnPrimary, btnSecondary } from '../vowos/ui';
import { Sparkles, Play, Eye, Compass, Target, CheckCircle2 } from 'lucide-react';
import { TrainingMode } from '@/lib/demo/tourEngine';

export const DemoLauncherModal: React.FC<{ open: boolean; onClose: () => void; onNavigateNeeded?: (r: string) => void }> = ({
  open,
  onClose,
  onNavigateNeeded,
}) => {
  const { stores, personas, scenarios, activePersona, activeStore, switchPersona, switchStore, startScenario } = useDemo();
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id || '');
  const [mode, setMode] = useState<TrainingMode>('watch');

  const handleLaunch = () => {
    startScenario(selectedScenarioId, mode, onNavigateNeeded);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="VowOS Interactive Demo & Training Launcher">
      <div className="space-y-6">
        <div className="rounded-xl bg-status-warning/10 p-4 border border-status-warning/20 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm mb-1">
            <Sparkles className="h-4 w-4 text-status-warning" /> Interactive Voice-Guided Demo System
          </div>
          <p>
            Experience VowOS in an isolated synthetic environment with ElevenLabs voice narration, animated cursor guidance, and real screen navigation.
          </p>
        </div>

        {/* Store & Persona Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Select Demo Store Location</label>
            <select
              value={activeStore.id}
              onChange={(e) => switchStore(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-2.5 bg-white text-stone-800"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Select Persona Role</label>
            <select
              value={activePersona.id}
              onChange={(e) => switchPersona(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-2.5 bg-white text-stone-800"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role} · {p.title})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Training Mode Selection */}
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-2">Select Training Experience Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              onClick={() => setMode('watch')}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === 'watch' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-stone-900 mb-1">
                <Eye className="h-4 w-4 text-brand-primary" /> Watch Demo
              </div>
              <p className="text-[11px] text-stone-500">Automated presentation with narration & animated cursor.</p>
            </button>

            <button
              onClick={() => setMode('guide')}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === 'guide' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-stone-900 mb-1">
                <Compass className="h-4 w-4 text-brand-primary" /> Guide Me
              </div>
              <p className="text-[11px] text-stone-500">Guided tour highlighting controls for you to click.</p>
            </button>

            <button
              onClick={() => setMode('practice')}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === 'practice' ? 'border-brand-primary bg-brand-soft/70 text-brand-secondary shadow-sm' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-stone-900 mb-1">
                <Target className="h-4 w-4 text-brand-primary" /> Practice Alone
              </div>
              <p className="text-[11px] text-stone-500">Hands-on tasks with business outcome validation.</p>
            </button>
          </div>
        </div>

        {/* Scenario Selection */}
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">Select Scenario ({scenarios.length} Available)</label>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedScenarioId === sc.id
                    ? 'border-brand-primary bg-brand-soft/60 font-medium text-stone-900'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{sc.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">{sc.difficulty}</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">{sc.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
          <button onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button onClick={handleLaunch} className={btnPrimary}>
            <Play className="h-4 w-4 fill-white" /> Start Interactive Tour
          </button>
        </div>
      </div>
    </Modal>
  );
};
