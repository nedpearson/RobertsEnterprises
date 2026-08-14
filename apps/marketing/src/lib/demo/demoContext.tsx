import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEMO_PERSONAS, DEMO_STORES, DemoPersona, DemoStore } from './demoData';
import { resetDemoActions } from './demoActions';
import { demoDb } from './demoDatabase';
import { DEMO_SCENARIOS, ScenarioDefinition } from './scenariosLibrary';
import { tourEngine, TourState, CursorPosition, TrainingMode } from './tourEngine';
import { getActiveDataPlane, setActiveDataPlane } from '@/lib/supabase';

interface DemoContextType {
  isDemoMode: boolean;
  isMobileDemo: boolean;
  demoSessionId: string | null;
  activePersona: DemoPersona;
  activeStore: DemoStore;
  stores: DemoStore[];
  personas: DemoPersona[];
  scenarios: ScenarioDefinition[];
  activeScenario: ScenarioDefinition | null;
  tourState: TourState;
  cursor: CursorPosition;
  currentStepIndex: number;
  totalSteps: number;
  trainingMode: TrainingMode;
  isMuted: boolean;
  playbackRate: number;
  enterDemoMode: (personaId?: string, storeId?: string) => void;
  exitDemoMode: () => void;
  switchPersona: (personaId: string) => void;
  switchStore: (storeId: string) => void;
  startScenario: (scenarioId: string, mode?: TrainingMode, onNavigateNeeded?: (route: string) => void) => void;
  startMobileDemo: (scenarioId: string, mode?: TrainingMode, onNavigateNeeded?: (route: string) => void) => void;
  pauseTour: () => void;
  resumeTour: (onNavigateNeeded?: (route: string) => void) => void;
  stopTour: () => void;
  stopScenario: () => void;
  nextStep: (onNavigateNeeded?: (route: string) => void) => void;
  prevStep: (onNavigateNeeded?: (route: string) => void) => void;
  toggleMute: () => void;
  setSpeed: (rate: number) => void;
  resetDemoSession: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialDemoMode = getActiveDataPlane() === 'demo';
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const [isMobileDemo, setIsMobileDemo] = useState(false);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(
    initialDemoMode ? `demo-sess-${Date.now()}` : null,
  );
  const [activePersona, setActivePersona] = useState<DemoPersona>(DEMO_PERSONAS[0]);
  const [activeStore, setActiveStore] = useState<DemoStore>(DEMO_STORES[0]);
  const [tourState, setTourState] = useState<TourState>('idle');
  const [cursor, setCursor] = useState<CursorPosition>({ x: -100, y: -100, visible: false, clicking: false });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('watch');
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).VOWOS_SAFE_MODE = isDemoMode;
    }
  }, [isDemoMode]);

  useEffect(() => {
    const unsubscribe = tourEngine.subscribe({
      onStateChange: setTourState,
      onStepChange: (idx) => setCurrentStepIndex(idx),
      onCursorMove: setCursor,
      onProgress: (curr, total) => {
        setCurrentStepIndex(curr - 1);
        setTotalSteps(total);
      },
    });
    return () => unsubscribe();
  }, []);

  const enterDemoMode = (personaId?: string, storeId?: string) => {
    setIsDemoMode(true);
    setActiveDataPlane('demo');
    setDemoSessionId(`demo-sess-${Date.now()}`);
    if (personaId) {
      const p = DEMO_PERSONAS.find((x) => x.id === personaId);
      if (p) setActivePersona(p);
    }
    if (storeId) {
      const s = DEMO_STORES.find((x) => x.id === storeId);
      if (s) setActiveStore(s);
    }
  };

  const exitDemoMode = () => {
    tourEngine.stopTour();
    setIsDemoMode(false);
    setIsMobileDemo(false);
    setActiveDataPlane('production');
    setDemoSessionId(null);
  };

  const switchPersona = (personaId: string) => {
    const p = DEMO_PERSONAS.find((x) => x.id === personaId);
    if (p) setActivePersona(p);
  };

  const switchStore = (storeId: string) => {
    const s = DEMO_STORES.find((x) => x.id === storeId);
    if (s) setActiveStore(s);
  };

  const startScenario = (scenarioId: string, mode: TrainingMode = 'watch', onNavigateNeeded?: (route: string) => void) => {
    const sc = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!sc) return;
    if (!isDemoMode) enterDemoMode();
    setTrainingMode(mode);
    tourEngine.startTour(sc, mode, onNavigateNeeded);
  };

  const startMobileDemo = (scenarioId: string, mode: TrainingMode = 'watch', onNavigateNeeded?: (route: string) => void) => {
    setIsMobileDemo(true);
    startScenario(scenarioId, mode, onNavigateNeeded);
  };

  const pauseTour = () => tourEngine.pauseTour();
  const resumeTour = (onNavigateNeeded?: (route: string) => void) => tourEngine.resumeTour(onNavigateNeeded);
  const stopTour = () => tourEngine.stopTour();
  const stopScenario = stopTour;
  const nextStep = (onNavigateNeeded?: (route: string) => void) => tourEngine.nextStep(onNavigateNeeded);
  const prevStep = (onNavigateNeeded?: (route: string) => void) => tourEngine.prevStep(onNavigateNeeded);

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    tourEngine.setMuted(nextMute);
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    tourEngine.setPlaybackRate(rate);
  };

  const resetDemoSession = async () => {
    tourEngine.stopTour();
    demoDb.reset();
    setDemoSessionId(`demo-sess-${Date.now()}`);
    await resetDemoActions('demo-business-id-001').catch(console.error);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        isMobileDemo,
        demoSessionId,
        activePersona,
        activeStore,
        stores: DEMO_STORES,
        personas: DEMO_PERSONAS,
        scenarios: DEMO_SCENARIOS,
        activeScenario: tourEngine.getScenario(),
        tourState,
        cursor,
        currentStepIndex,
        totalSteps,
        trainingMode,
        isMuted,
        playbackRate,
        enterDemoMode,
        exitDemoMode,
        switchPersona,
        switchStore,
        startScenario,
        startMobileDemo,
        pauseTour,
        resumeTour,
        stopTour,
        stopScenario,
        nextStep,
        prevStep,
        toggleMute,
        setSpeed,
        resetDemoSession,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within a DemoProvider');
  return ctx;
};
