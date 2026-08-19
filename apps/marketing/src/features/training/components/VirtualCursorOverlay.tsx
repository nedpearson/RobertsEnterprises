import React, { useState, useEffect } from 'react';
import { MousePointer, Play, Pause, SkipForward, X, Volume2, VolumeX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { guidedTourEngine, CursorPosition } from '../services/guidedTourEngine';
import { narrationService } from '../services/narrationService';
import { TourSyncState, TrainingStep } from '../types/trainingTypes';

export function VirtualCursorOverlay() {
  const [tourState, setTourState] = useState<{
    syncState: TourSyncState;
    activeStep?: TrainingStep;
    cursor: CursorPosition;
    currentStepIndex: number;
    totalSteps: number;
    error?: string;
  }>({
    syncState: 'PAUSED',
    cursor: { x: -100, y: -100, visible: false, clicking: false },
    currentStepIndex: 0,
    totalSteps: 0,
  });

  const [caption, setCaption] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(narrationService.getIsMuted());

  useEffect(() => {
    const unsubEngine = guidedTourEngine.subscribe(setTourState);
    const unsubNarration = narrationService.subscribe(setCaption);
    return () => {
      unsubEngine();
      unsubNarration();
    };
  }, []);

  if (tourState.syncState === 'PAUSED' || !tourState.activeStep) {
    return null;
  }

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    narrationService.setMuted(nextMute);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      
      {/* Animated Virtual Cursor */}
      {tourState.cursor.visible && (
        <div
          className="absolute transition-transform duration-75 ease-out flex items-center justify-center pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${tourState.cursor.x}px`,
            top: `${tourState.cursor.y}px`,
          }}
        >
          {/* Pulse Ring on Click */}
          {tourState.cursor.clicking && (
            <span className="absolute h-12 w-12 rounded-full bg-brand-primary/40 animate-ping" />
          )}

          <div className="relative flex items-center gap-2">
            <MousePointer className="h-7 w-7 text-brand-primary drop-shadow-md fill-rose-500" />
            <span className="rounded-md bg-stone-900/90 text-white px-2 py-0.5 text-[10px] font-bold shadow-md whitespace-nowrap border border-stone-700">
              VowOS Academy Guide
            </span>
          </div>
        </div>
      )}

      {/* Target Element Highlight Box */}
      {tourState.cursor.targetRect && tourState.syncState !== 'PAUSED' && (
        <div
          className="absolute rounded-xl border-2 border-brand-primary shadow-[0_0_20px_rgba(244,63,94,0.4)] pointer-events-none transition-all duration-300"
          style={{
            left: `${tourState.cursor.targetRect.left - 4}px`,
            top: `${tourState.cursor.targetRect.top - 4}px`,
            width: `${tourState.cursor.targetRect.width + 8}px`,
            height: `${tourState.cursor.targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Bottom Floating Tour Control Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto max-w-xl w-full px-4">
        <div className="rounded-2xl bg-stone-900/95 text-white p-4 shadow-2xl border border-stone-800 backdrop-blur-md flex flex-col gap-3">
          
          {/* Header & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-primary animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider text-brand-primary">
                {tourState.activeStep.title}
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                ({tourState.currentStepIndex + 1}/{tourState.totalSteps})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                title={isMuted ? 'Unmute Narration' : 'Mute Narration'}
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-brand-primary" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              </button>
              
              <button
                onClick={() => guidedTourEngine.nextStep()}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                title="Next Step"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <button
                onClick={() => guidedTourEngine.stopTour()}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-brand-primary hover:bg-stone-700 transition-colors"
                title="Exit Guided Tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error Banner if Element Missing */}
          {tourState.error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-950/80 border border-rose-800/80 p-2.5 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 text-brand-primary flex-shrink-0" />
              <span className="flex-1">{tourState.error}</span>
            </div>
          )}

          {/* Synchronized Caption Bar */}
          <div className="bg-stone-950/80 rounded-xl p-3 border border-stone-800 text-xs text-stone-200 leading-relaxed font-medium">
            "{caption || tourState.activeStep.narration}"
          </div>

        </div>
      </div>

    </div>
  );
}

