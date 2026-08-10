import React, { useState } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Subtitles, FastForward } from 'lucide-react';

export const TourControlBar: React.FC<{ onNavigateNeeded?: (route: string) => void }> = ({ onNavigateNeeded }) => {
  const {
    activeScenario,
    tourState,
    currentStepIndex,
    totalSteps,
    isMuted,
    playbackRate,
    pauseTour,
    resumeTour,
    stopTour,
    nextStep,
    prevStep,
    toggleMute,
    setSpeed,
  } = useDemo();

  const [showCaptions, setShowCaptions] = useState(true);

  if (!activeScenario || tourState === 'idle') return null;

  const currentStep = activeScenario.steps[currentStepIndex];
  const isPaused = tourState === 'paused';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-xl px-4">
      <div className="rounded-2xl bg-stone-900/95 backdrop-blur-md text-white shadow-2xl border border-stone-700/60 p-4 space-y-3">
        {/* Step Captions Banner */}
        {showCaptions && currentStep && (
          <div className="rounded-xl bg-stone-800/80 p-3 text-xs text-stone-200 border border-stone-700">
            <p className="font-semibold text-brand-primary mb-0.5">{currentStep.caption}</p>
            <p className="leading-relaxed text-stone-300">{currentStep.narrationText}</p>
          </div>
        )}

        {/* Progress Bar & Header */}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-medium text-stone-200 truncate max-w-[280px]">{activeScenario.name}</span>
          <span>Step {currentStepIndex + 1} of {totalSteps || activeScenario.steps.length}</span>
        </div>
        <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-primary transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / (totalSteps || activeScenario.steps.length)) * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => (isPaused ? resumeTour(onNavigateNeeded) : pauseTour())}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={() => prevStep(onNavigateNeeded)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
              title="Previous Step"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => nextStep(onNavigateNeeded)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
              title="Next Step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`p-1.5 rounded-lg transition-colors ${showCaptions ? 'text-brand-primary bg-rose-950/60' : 'text-stone-400 hover:bg-stone-800'}`}
              title="Toggle Captions"
            >
              <Subtitles className="h-4 w-4" />
            </button>
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'text-brand-primary bg-rose-950/60' : 'text-stone-400 hover:bg-stone-800'}`}
              title="Toggle Mute"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setSpeed(playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 font-mono text-[11px]"
              title="Playback Speed"
            >
              <FastForward className="h-3 w-3" /> {playbackRate}x
            </button>
            <button
              onClick={stopTour}
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
              title="Exit Tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
