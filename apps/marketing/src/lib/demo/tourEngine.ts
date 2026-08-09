/**
 * VowOS Declarative Guided Tour Engine
 * Manages deterministic state machine transitions, target element resolution, animated cursor movement,
 * ElevenLabs voice synchronization, and action validation.
 */

import { ScenarioDefinition, TourStepDefinition } from './scenariosLibrary';
import { elevenLabsService } from './elevenLabsService';

export type TourState =
  | 'idle'
  | 'preparing'
  | 'loadingRoute'
  | 'waitingForTarget'
  | 'scrolling'
  | 'movingCursor'
  | 'narrating'
  | 'performingAction'
  | 'waitingForState'
  | 'completedStep'
  | 'paused'
  | 'recovering'
  | 'failed'
  | 'completedTour';

export interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}

export type TrainingMode = 'watch' | 'guide' | 'practice';

export interface TourEngineListener {
  onStateChange: (state: TourState) => void;
  onStepChange: (index: number, step: TourStepDefinition) => void;
  onCursorMove: (cursor: CursorPosition) => void;
  onProgress: (current: number, total: number) => void;
  onNavigateNeeded?: (route: string) => void;
}

class TourEngine {
  private currentScenario: ScenarioDefinition | null = null;
  private currentStepIndex: number = 0;
  private currentState: TourState = 'idle';
  private mode: TrainingMode = 'watch';
  private listeners: Set<TourEngineListener> = new Set();
  private cursor: CursorPosition = { x: -100, y: -100, visible: false, clicking: false };
  private playbackRate: number = 1.0;
  private isMuted: boolean = false;
  private isPaused: boolean = false;

  public subscribe(listener: TourEngineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: TourState) {
    this.currentState = state;
    this.listeners.forEach((l) => l.onStateChange(state));
  }

  private setCursor(cursor: Partial<CursorPosition>) {
    this.cursor = { ...this.cursor, ...cursor };
    this.listeners.forEach((l) => l.onCursorMove(this.cursor));
  }

  public getScenario() {
    return this.currentScenario;
  }

  public getStepIndex() {
    return this.currentStepIndex;
  }

  public getState() {
    return this.currentState;
  }

  public getMode() {
    return this.mode;
  }

  public startTour(scenario: ScenarioDefinition, mode: TrainingMode = 'watch', onNavigateNeeded?: (route: string) => void) {
    this.stopTour();
    this.currentScenario = scenario;
    this.currentStepIndex = 0;
    this.mode = mode;
    this.isPaused = false;
    this.setState('preparing');

    if (onNavigateNeeded) {
      onNavigateNeeded(scenario.startRoute);
    }

    setTimeout(() => {
      this.executeCurrentStep(onNavigateNeeded);
    }, 500);
  }

  public async executeCurrentStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario || this.isPaused) return;

    const step = this.currentScenario.steps[this.currentStepIndex];
    if (!step) {
      this.finishTour();
      return;
    }

    this.listeners.forEach((l) => l.onStepChange(this.currentStepIndex, step));
    this.listeners.forEach((l) => l.onProgress(this.currentStepIndex + 1, this.currentScenario!.steps.length));

    // 1. Check Route Navigation
    if (step.route && onNavigateNeeded) {
      this.setState('loadingRoute');
      onNavigateNeeded(step.route);
      await new Promise((r) => setTimeout(r, 400));
    }

    // 2. Resolve Target Element if present
    let targetEl: HTMLElement | null = null;
    if (step.targetId) {
      this.setState('waitingForTarget');
      let attempts = 0;
      while (attempts < 15) {
        targetEl = document.querySelector(`[data-tour-id="${step.targetId}"]`);
        if (targetEl) break;
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }
    }

    if (targetEl) {
      // 3. Scroll into view
      this.setState('scrolling');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((r) => setTimeout(r, 300));

      // 4. Animate Cursor to target center
      const rect = targetEl.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      this.setState('movingCursor');
      this.setCursor({ visible: true, x: targetX, y: targetY });
      await new Promise((r) => setTimeout(r, 600));

      if (this.mode === 'watch' && step.action === 'click') {
        // Trigger click ripple animation
        this.setCursor({ clicking: true });
        setTimeout(() => this.setCursor({ clicking: false }), 200);
        targetEl.click();
      }
    } else {
      this.setCursor({ visible: false });
    }

    // 5. Play ElevenLabs Narration
    this.setState('narrating');
    await elevenLabsService.speak({
      text: step.narrationText,
      playbackRate: this.playbackRate,
      volume: this.isMuted ? 0 : 1.0,
      onEnded: () => {
        if (this.mode === 'watch' && !this.isPaused) {
          this.nextStep(onNavigateNeeded);
        }
      },
    });
  }

  public nextStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario) return;
    if (this.currentStepIndex < this.currentScenario.steps.length - 1) {
      this.currentStepIndex++;
      this.executeCurrentStep(onNavigateNeeded);
    } else {
      this.finishTour();
    }
  }

  public prevStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario) return;
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.executeCurrentStep(onNavigateNeeded);
    }
  }

  public pauseTour() {
    this.isPaused = true;
    this.setState('paused');
    elevenLabsService.stop();
  }

  public resumeTour(onNavigateNeeded?: (route: string) => void) {
    this.isPaused = false;
    this.executeCurrentStep(onNavigateNeeded);
  }

  public stopTour() {
    this.currentScenario = null;
    this.currentStepIndex = 0;
    this.isPaused = false;
    this.setState('idle');
    this.setCursor({ visible: false, x: -100, y: -100 });
    elevenLabsService.stop();
  }

  private finishTour() {
    this.setState('completedTour');
    this.setCursor({ visible: false });
    setTimeout(() => {
      this.stopTour();
    }, 2000);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    elevenLabsService.setMuted(muted);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    elevenLabsService.setRate(rate);
  }
}

export const tourEngine = new TourEngine();
